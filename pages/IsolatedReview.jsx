import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import '../styles/IsolatedReview.css';

function pick(...values) {
  return values.find((v) => v !== undefined && v !== null && String(v).trim() !== '');
}

function hasMeaningfulValue(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  return true;
}

function formatDate(raw) {
  if (!raw) return '-';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return String(raw);
  return date.toLocaleDateString();
}

function normalizeRelation(value) {
  return String(value || '').trim().toLowerCase();
}

function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.trim().toLowerCase() === 'true';
  return !!value;
}

function formatYesNo(value) {
  if (!hasMeaningfulValue(value)) return '-';
  return toBoolean(value) ? 'Yes' : 'No';
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function hasValues(record) {
  const target = asObject(record);
  return Object.values(target).some((value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim() !== '';
    return true;
  });
}

function hasSectionContent(sections) {
  const target = asObject(sections);
  if (Object.keys(target).length === 0) return false;
  return Object.values(target).some((value) => hasValues(value));
}

function registrationIdOf(record) {
  return (
    record?.registrationId ||
    record?.registrationid ||
    record?.registration_id ||
    record?.id ||
    null
  );
}

function sortRegistrationsByRecent(registrations) {
  return [...registrations].sort((a, b) => {
    const aTime = new Date(a?.submittedAt || a?.submitted_at || a?.createdAt || a?.created_at || 0).getTime() || 0;
    const bTime = new Date(b?.submittedAt || b?.submitted_at || b?.createdAt || b?.created_at || 0).getTime() || 0;
    return bTime - aTime;
  });
}

function formatFinancialSupporter(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '-';
  if (normalized === 'father') return 'Father';
  if (normalized === 'mother') return 'Mother';
  if (normalized === 'other') return 'Other';
  return value;
}

function ImageCard({ label, url, alt }) {
  return (
    <div className="submitted-image-card-isolated">
      <h4>{label}</h4>
      {url ? (
        <>
          <a href={url} target="_blank" rel="noreferrer">
            <img src={url} alt={alt || label} />
          </a>
          <a className="open-link-isolated" href={url} target="_blank" rel="noreferrer">
            Open Full Image
          </a>
        </>
      ) : (
        <p className="missing-isolated">Not submitted</p>
      )}
    </div>
  );
}

function IsolatedReview({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { studentId } = useParams();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(location.state?.studentRecord || null);
  const [parents, setParents] = useState([]);
  const [registrationId, setRegistrationId] = useState(registrationIdOf(location.state?.studentRecord));
  const [sections, setSections] = useState({});
  const [paymentReceiptUrl, setPaymentReceiptUrl] = useState('');
  const [error, setError] = useState('');
  const isPaymentView = location.state?.viewMode === 'payment';

  useEffect(() => {
    if (!user) {
      navigate('/admin-login');
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setError('');
      setPaymentReceiptUrl('');
      try {
        const [studentResponse, parentResponse] = await Promise.all([
          api.getStudentById(studentId),
          api.listParents(studentId)
        ]);

        const safeStudent = studentResponse || null;
        setStudent(safeStudent);
        setParents(Array.isArray(parentResponse) ? parentResponse : []);

        const preferredRegistrationId =
          registrationIdOf(location.state?.studentRecord) ||
          registrationIdOf(safeStudent);
        let resolvedRegistrationId = preferredRegistrationId || null;
        let resolvedSections = {};
        let foundSectionsWithContent = false;
        const seenRegistrationIds = new Set();

        const addCandidateRegistrationId = (candidateId, bucket) => {
          if (!candidateId) return;
          const key = String(candidateId);
          if (seenRegistrationIds.has(key)) return;
          seenRegistrationIds.add(key);
          bucket.push(candidateId);
        };

        const loadSectionsForRegistrationId = async (candidateId) => {
          if (!candidateId) return null;
          try {
            const payload = await api.getRegistrationSections(candidateId);
            return asObject(payload);
          } catch (sectionError) {
            if (sectionError?.status === 404) {
              return null;
            }
            throw sectionError;
          }
        };

        const candidateRegistrationIds = [];
        addCandidateRegistrationId(preferredRegistrationId, candidateRegistrationIds);

        let registrationList = [];
        try {
          registrationList = await api.listRegistrations(studentId);
        } catch (registrationError) {
          registrationList = [];
        }

        if (Array.isArray(registrationList) && registrationList.length > 0) {
          const sorted = sortRegistrationsByRecent(registrationList);
          sorted.forEach((item) => addCandidateRegistrationId(registrationIdOf(item), candidateRegistrationIds));
          if (!resolvedRegistrationId) {
            resolvedRegistrationId = registrationIdOf(
              sorted.find((item) => String(item?.status || '').toUpperCase() !== 'REJECTED') || sorted[0]
            );
          }
        }

        for (const candidateId of candidateRegistrationIds) {
          const payload = await loadSectionsForRegistrationId(candidateId);
          if (!payload) {
            continue;
          }

          const contentFound = hasSectionContent(payload);
          if (contentFound) {
            resolvedRegistrationId = candidateId;
            resolvedSections = payload;
            foundSectionsWithContent = true;
            break;
          }

          if (!foundSectionsWithContent && Object.keys(payload).length > 0) {
            resolvedRegistrationId = candidateId;
            resolvedSections = payload;
          }
        }
        setRegistrationId(resolvedRegistrationId || null);
        setSections(resolvedSections);

        if (isPaymentView) {
          let resolvedReceiptUrl = '';
          try {
            const paymentStudentId = pick(
              safeStudent.studentid,
              safeStudent.id,
              location.state?.studentRecord?.studentid,
              location.state?.studentRecord?.id,
              studentId
            );

            if (paymentStudentId) {
              const document = await api.getLatestStudentDocument(paymentStudentId, 'PAYMENT_RECEIPT');
              if (document) {
                resolvedReceiptUrl = pick(
                  document.fileUrl,
                  document.file_url
                ) || '';
              }
            }
          } catch (documentLoadError) {
          }

          setPaymentReceiptUrl(resolvedReceiptUrl || '');
        }
      } catch (loadError) {
        setError(loadError.message || 'Failed to load submitted details.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isPaymentView, location.state, navigate, studentId, user]);

  const parentByRelation = useMemo(() => {
    const father = parents.find((p) => normalizeRelation(p.relation) === 'father') || null;
    const mother = parents.find((p) => normalizeRelation(p.relation) === 'mother') || null;
    return { father, mother };
  }, [parents]);

  const parentById = useMemo(() => {
    const father = parents.find((p) => String(p.id || p.parentid || '') === String(student?.father_id || '')) || null;
    const mother = parents.find((p) => String(p.id || p.parentid || '') === String(student?.mother_id || '')) || null;
    return { father, mother };
  }, [parents, student]);

  const personal = asObject(sections.personal);
  const contact = asObject(sections.contact);
  const academic = asObject(sections.academic);
  const guardian = asObject(sections.guardian);
  const documents = asObject(sections.documents);
  const declaration = asObject(sections.declaration);

  const fatherDraft = asObject(guardian.father);
  const motherDraft = asObject(guardian.mother);

  const father = hasValues(fatherDraft)
    ? fatherDraft
    : (parentById.father || parentByRelation.father || null);
  const mother = hasValues(motherDraft)
    ? motherDraft
    : (parentById.mother || parentByRelation.mother || null);
  const displayStudentName = pick(
    personal.nameMm,
    personal.studentNameMM,
    personal.studentName,
    personal.name_mm,
    student?.namemm,
    student?.name_mm,
    student?.student_name,
    student?.full_name
  ) || 'Unknown Student';
  const displayUsername = pick(
    student?.user_name,
    student?.username,
    location.state?.studentRecord?.user_name,
    location.state?.studentRecord?.username
  ) || '-';

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 font-black text-teal-600 uppercase tracking-widest text-sm animate-pulse">
            Syncing Profile Data...
        </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-10">
        <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-10 rounded-[32px] text-center shadow-sm">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">System Error</h2>
          <p className="text-slate-500 mt-4 mb-8 font-bold">{error || 'Student record not found.'}</p>
          <button className="bg-teal-600 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-teal-700 transition-all active:scale-95" onClick={() => navigate('/admin/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-10 font-roboto">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Registration Review</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Staged registration details</p>
          </div>
          <button className="bg-slate-900 dark:bg-slate-800 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform" onClick={() => navigate('/admin/dashboard')}>
            Back
          </button>
        </header>

        <section className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-24 w-24 bg-teal-500/5 rounded-bl-full transform group-hover:scale-110 transition-transform" />
          <div className="inline-flex rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-600 px-4 py-1.5 text-[9px] font-black uppercase tracking-widest border border-teal-100 dark:border-teal-800">
            {String(student.status || 'DETAILS_SUBMITTED').toUpperCase()}
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-4">{displayStudentName}</h2>
          <div className="flex gap-8 mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
             <p>Submitted at: <span className="text-slate-600 dark:text-slate-300">{formatDate(pick(declaration.submittedAt, student.updatedAt, student.createdAt))}</span></p>
             <p>ID: <span className="text-slate-600 dark:text-slate-300">{registrationId || '-'}</span></p>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <section className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Student Information</h3>
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800"><span className="font-bold text-slate-600">Name (MM)</span><span className="font-black text-slate-900 dark:text-white">{pick(personal.nameMm, personal.studentNameMM, personal.studentName, personal.name_mm, student.namemm, student.name_mm) || '-'}</span></div>
              <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800"><span className="font-bold text-slate-600">Name (EN)</span><span className="font-black text-slate-900 dark:text-white">{pick(personal.nameEn, personal.studentNameEN, personal.studentNameEn, personal.name_en, student.nameen, student.name_en) || '-'}</span></div>
              <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800"><span className="font-bold text-slate-600">Gender</span><span className="font-black text-slate-900 dark:text-white">{pick(personal.gender, personal.sex, contact.gender, student.gender) || '-'}</span></div>
              <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800"><span className="font-bold text-slate-600">Date of Birth</span><span className="font-black text-slate-900 dark:text-white">{formatDate(pick(personal.dateOfBirth, personal.dob, personal.birthDate, student.date_of_birth, student.dateOfBirth))}</span></div>
              <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800"><span className="font-bold text-slate-600">NRC Number</span><span className="font-black text-slate-900 dark:text-white">{pick(personal.nrcNumber, personal.nrc, student.nrc_number, student.nrcNumber) || '-'}</span></div>
              <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800"><span className="font-bold text-slate-600">Religion</span><span className="font-black text-slate-900 dark:text-white">{pick(personal.religion, contact.religion, student.religion) || '-'}</span></div>
              <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800"><span className="font-bold text-slate-600">Ethnic</span><span className="font-black text-slate-900 dark:text-white">{pick(personal.ethnic, personal.ethnicity, student.ethnic) || '-'}</span></div>
              <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800"><span className="font-bold text-slate-600">Birthplace</span><span className="font-black text-slate-900 dark:text-white">{pick(personal.birthplace, personal.placeOfBirth, student.birthplace, student.place_of_birth) || '-'}</span></div>
              <div className="flex justify-between py-2"><span className="font-bold text-slate-600">Blood Type</span><span className="font-black text-slate-900 dark:text-white">{pick(personal.bloodType, personal.blood_group, student.bloodType, student.blood_type) || '-'}</span></div>
            </div>
           </section>
           
           <section className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Contact & Academic</h3>
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800"><span className="font-bold text-slate-600">Email</span><span className="font-black text-slate-900 dark:text-white">{pick(contact.email, personal.email, student.email) || '-'}</span></div>
              <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800"><span className="font-bold text-slate-600">Phone</span><span className="font-black text-slate-900 dark:text-white">{pick(contact.phone, personal.phone, student.phone) || '-'}</span></div>
              <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800"><span className="font-bold text-slate-600">Division/State</span><span className="font-black text-slate-900 dark:text-white">{pick(contact.divisionOrState, contact.division, contact.region, student.division_or_state, student.divisionOrState) || '-'}</span></div>
              <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800"><span className="font-bold text-slate-600">Township</span><span className="font-black text-slate-900 dark:text-white">{pick(contact.township, contact.townshipCode, student.township) || '-'}</span></div>
              <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800"><span className="font-bold text-slate-600">Address</span><span className="font-black text-slate-900 dark:text-white">{pick(contact.address, personal.address, student.address) || '-'}</span></div>
              <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800"><span className="font-bold text-slate-600">Current Year</span><span className="font-black text-slate-900 dark:text-white">{pick(academic.currentYear, academic.current_year, student.currentyear, student.current_year) ?? '-'}</span></div>
              <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800"><span className="font-bold text-slate-600">Semester</span><span className="font-black text-slate-900 dark:text-white">{pick(academic.academicSemester, academic.semester, student.academic_semester, student.academicSemester) || '-'}</span></div>
              <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800"><span className="font-bold text-slate-600">Major</span><span className="font-black text-slate-900 dark:text-white">{pick(academic.major, academic.majorCode, student.major) || '-'}</span></div>
              <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800"><span className="font-bold text-slate-600">Matric Roll No</span><span className="font-black text-slate-900 dark:text-white">{pick(academic.matriculationRollNo, personal.matriculationRollNo, student.matriculation_rollno, student.matriculation_roll_no, student.matriculationRollNo) || '-'}</span></div>
              <div className="flex justify-between py-2"><span className="font-bold text-slate-600">Matric Passed Year</span><span className="font-black text-slate-900 dark:text-white">{pick(academic.matriculationPassedYear, academic.matriculationYear, personal.matriculationPassedYear, personal.matriculationYear, student.matriculation_passed_year, student.matriculationPassedYear, student.matriculation_year, student.matriculationYear) || '-'}</span></div>
            </div>
           </section>
        </div>

        <section className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Documents & Images</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ImageCard label="Passport Photo" url={pick(documents.passportPhoto, documents.passportPhotoUrl, student.passportphoto, student.passportPhoto, student.passport_photo)} />
            <ImageCard label="Student NRC Front" url={pick(documents.studentNrcFront, documents.nrcFrontImage, student.nrcfrontimage, student.nrcFrontImage, student.nrc_front_image)} />
            <ImageCard label="Student NRC Back" url={pick(documents.studentNrcBack, documents.nrcBackImage, student.nrcbackimage, student.nrcBackImage, student.nrc_back_image)} />
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Father Information</h3>
             <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800"><span className="font-bold text-slate-600">Name</span><span className="font-black text-slate-900 dark:text-white">{pick(father?.nameMm, father?.nameMM, father?.nameEn, father?.name, father?.full_name, student.father_name, student.fatherName) || '-'}</span></div>
              <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800"><span className="font-bold text-slate-600">Occupation</span><span className="font-black text-slate-900 dark:text-white">{pick(father?.occupation, father?.job_position) || '-'}</span></div>
              <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800"><span className="font-bold text-slate-600">Phone</span><span className="font-black text-slate-900 dark:text-white">{pick(father?.phone, father?.phone_number) || '-'}</span></div>
              <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800"><span className="font-bold text-slate-600">Address</span><span className="font-black text-slate-900 dark:text-white">{pick(father?.address) || '-'}</span></div>
              <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800"><span className="font-bold text-slate-600">NRC</span><span className="font-black text-slate-900 dark:text-white">{pick(father?.nrcNumber, father?.nrc_number) || '-'}</span></div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <ImageCard label="Father NRC Front" url={pick(documents.fatherNrcFront, father?.nrcFront, father?.nrcFrontImage, father?.nrc_front_image)} />
                <ImageCard label="Father NRC Back" url={pick(documents.fatherNrcBack, father?.nrcBack, father?.nrcBackImage, father?.nrc_back_image)} />
              </div>
             </div>
          </section>
          <section className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Mother Information</h3>
             <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800"><span className="font-bold text-slate-600">Name</span><span className="font-black text-slate-900 dark:text-white">{pick(mother?.nameMm, mother?.nameMM, mother?.nameEn, mother?.name, mother?.full_name, student.mother_name, student.motherName) || '-'}</span></div>
              <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800"><span className="font-bold text-slate-600">Occupation</span><span className="font-black text-slate-900 dark:text-white">{pick(mother?.occupation, mother?.job_position) || '-'}</span></div>
              <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800"><span className="font-bold text-slate-600">Phone</span><span className="font-black text-slate-900 dark:text-white">{pick(mother?.phone, mother?.phone_number) || '-'}</span></div>
              <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800"><span className="font-bold text-slate-600">Address</span><span className="font-black text-slate-900 dark:text-white">{pick(mother?.address) || '-'}</span></div>
              <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800"><span className="font-bold text-slate-600">NRC</span><span className="font-black text-slate-900 dark:text-white">{pick(mother?.nrcNumber, mother?.nrc_number) || '-'}</span></div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <ImageCard label="Mother NRC Front" url={pick(documents.motherNrcFront, mother?.nrcFront, mother?.nrcFrontImage, mother?.nrc_front_image)} />
                <ImageCard label="Mother NRC Back" url={pick(documents.motherNrcBack, mother?.nrcBack, mother?.nrcBackImage, mother?.nrc_back_image)} />
              </div>
             </div>
          </section>
        </section>

        <section className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Agreements & Support</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl"><p className="text-[9px] font-black uppercase text-slate-400">Financial Aid</p><p className="font-black mt-1">{formatYesNo(pick(guardian.needsFinancialAid, guardian.needFinancialAid, student.is_benefit_student, student.isBenefitStudent))}</p></div>
            <div className="p-4 bg-slate-50 rounded-2xl"><p className="text-[9px] font-black uppercase text-slate-400">Hostel</p><p className="font-black mt-1">{formatYesNo(pick(guardian.needsHostel, guardian.needHostel, student.is_hostel_student, student.isHostelStudent))}</p></div>
            <div className="p-4 bg-slate-50 rounded-2xl"><p className="text-[9px] font-black uppercase text-slate-400">Terms Accepted</p><p className="font-black mt-1">{formatYesNo(pick(declaration.schoolTermsAccepted, declaration.termsAccepted, declaration.school_terms_accepted))}</p></div>
            <div className="p-4 bg-slate-50 rounded-2xl"><p className="text-[9px] font-black uppercase text-slate-400">Confession</p><p className="font-black mt-1">{formatYesNo(pick(declaration.confessionAccepted, declaration.confession_accepted))}</p></div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default IsolatedReview;