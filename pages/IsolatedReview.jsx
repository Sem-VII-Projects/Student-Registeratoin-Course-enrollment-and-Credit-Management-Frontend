import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

function ImageCard({ label, url, alt, t }) {
  return (
    <div className="submitted-image-card-isolated group/img overflow-hidden rounded-[24px] border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-sm transition-all hover:shadow-xl">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t ? t(label) : label}</h4>
      </div>
      <div className="relative aspect-video">
        {url ? (
          <>
            <a href={url} target="_blank" rel="noreferrer" className="block h-full w-full overflow-hidden">
              <img src={url} alt={alt || label} className="h-full w-full object-cover transition-transform duration-500 group-hover/img:scale-110" />
            </a>
            <div className="absolute inset-0 bg-teal-900/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
              <a className="bg-white text-teal-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform" href={url} target="_blank" rel="noreferrer">
                <span className="material-icons-outlined text-sm">visibility</span>
                {t ? t('Full Detail') : 'Full Detail'}
              </a>
            </div>
          </>
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-400">
            <span className="material-icons-outlined text-3xl opacity-20">no_photography</span>
            <p className="text-[9px] font-black uppercase tracking-widest">{t ? t('Not uploaded') : 'Not uploaded'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function IsolatedReview({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { studentId } = useParams();
  const { t } = useTranslation();
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

        console.log('DEBUG: studentResponse:', studentResponse);
        console.log('DEBUG: parentResponse:', parentResponse);

        const safeStudent = studentResponse || null;
        setStudent(safeStudent);
        setParents(Array.isArray(parentResponse) ? parentResponse : []);

        const preferredRegistrationId =
          registrationIdOf(location.state?.studentRecord) ||
          registrationIdOf(safeStudent);
        
        console.log('DEBUG: preferredRegistrationId:', preferredRegistrationId);

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
            console.log('DEBUG: Fetching sections for:', candidateId);
            const payload = await api.getRegistrationSections(candidateId);
            console.log(`DEBUG: Payload for ${candidateId}:`, payload);
            return asObject(payload);
          } catch (sectionError) {
            console.error(`DEBUG: Error fetching sections for ${candidateId}:`, sectionError);
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
          console.log('DEBUG: registrationList:', registrationList);
        } catch (registrationError) {
          console.error('DEBUG: Error listing registrations:', registrationError);
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
    const father = parents.find((p) => String(p.id || p.parentid || '') === String(student?.father_id || student?.fatherId || '')) || null;
    const mother = parents.find((p) => String(p.id || p.parentid || '') === String(student?.mother_id || student?.motherId || '')) || null;
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
    : (parentById.father || parentByRelation.father || { name: student?.fatherName || student?.father_name || '-' });
  const mother = hasValues(motherDraft)
    ? motherDraft
    : (parentById.mother || parentByRelation.mother || { name: student?.motherName || student?.mother_name || '-' });

  const displayStudentName = pick(
    personal.nameMm,
    personal.studentNameMM,
    personal.studentName,
    personal.name_mm,
    student?.nameMm,
    student?.namemm,
    student?.name_mm,
    student?.student_name,
    student?.full_name,
    student?.fullName
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-10 font-roboto animate-in fade-in duration-500 pb-20">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* ENHANCED HEADER */}
        <header className="flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm sticky top-6 z-50">
          <div className="flex items-center gap-6">
             <div className="h-12 w-12 rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-lg shadow-teal-600/20">
                <span className="material-icons-outlined">fact_check</span>
             </div>
             <div>
               <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{t('Registration Review')}</h1>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                 <span className="h-1 w-1 rounded-full bg-teal-500" /> {t('Staged Registration Dossier')}
               </p>
               </div>
               </div>
               <button
               className="group bg-slate-900 dark:bg-slate-800 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-600 transition-all active:scale-95 flex items-center gap-2 shadow-xl shadow-slate-900/10"
               onClick={() => navigate('/admin/dashboard')}
               >
               <span className="material-icons-round text-sm group-hover:-translate-x-1 transition-transform">arrow_back</span>
               {t('Return to Dashboard')}
               </button>

        </header>

        {/* HERO STATUS CARD */}
        <section className="bg-white dark:bg-slate-900 p-10 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-48 w-48 bg-teal-500/5 rounded-bl-full transform group-hover:scale-110 transition-transform duration-700" />
          <div className="absolute bottom-0 left-0 h-24 w-24 bg-teal-500/5 rounded-tr-full transform -translate-x-4 translate-y-4" />
          
          <div className="relative z-10">
            <div className="inline-flex rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-600 px-5 py-2 text-[10px] font-black uppercase tracking-widest border border-teal-100 dark:border-teal-800 mb-6">
              {String(student.status || 'DETAILS_SUBMITTED').toUpperCase()}
            </div>
            <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{displayStudentName}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-8 pt-8 border-t border-slate-50 dark:border-slate-800">
               <div className="space-y-1">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Application Date</p>
                 <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{formatDate(pick(declaration.submittedAt, student.updatedAt, student.createdAt))}</p>
               </div>
               <div className="space-y-1">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Registry Identity</p>
                 <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{registrationId || 'PENDING_GEN'}</p>
               </div>
               <div className="space-y-1">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">System Username</p>
                 <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{displayUsername}</p>
               </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* STUDENT PRIMARY INFO */}
           <section className="bg-white dark:bg-slate-900 p-10 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-8 w-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <span className="material-icons-outlined text-lg">person</span>
              </div>
              <h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">{t('Biometric Profile')}</h3>
            </div>
            <div className="space-y-4">
              {[
                { label: t('Name (MM)'), val: pick(personal.nameMm, personal.studentNameMM, personal.studentName, personal.name_mm, student?.nameMm, student?.namemm, student?.name_mm) },
                { label: t('Name (EN)'), val: pick(personal.nameEn, personal.studentNameEN, personal.studentNameEn, personal.name_en, student?.nameEn, student?.nameen, student?.name_en) },
                { label: t('Gender'), val: pick(personal.gender, personal.sex, contact.gender, student?.gender) },
                { label: t('Date of Birth'), val: formatDate(pick(personal.dateOfBirth, personal.dob, personal.birthDate, student?.dateOfBirth, student?.date_of_birth)) },
                { label: t('NRC Number'), val: pick(personal.nrcNumber, personal.nrc, student?.nrcNumber, student?.nrc_number) },
                { label: t('Religion'), val: pick(personal.religion, contact.religion, student?.religion) },
                { label: t('Ethnic Group'), val: pick(personal.ethnic, personal.ethnicity, student?.ethnic) },
                { label: t('Place of Birth'), val: pick(personal.birthplace, personal.placeOfBirth, student?.birthplace, student?.place_of_birth) },
                { label: t('Blood Group'), val: pick(personal.bloodType, personal.blood_group, student?.bloodType, student?.blood_type) }
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center py-3 border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors px-2 rounded-xl">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                  <span className="text-sm font-black text-slate-800 dark:text-white tracking-tight">{item.val || '-'}</span>
                </div>
              ))}
            </div>
           </section>
           
           {/* CONTACT & ACADEMIC */}
           <section className="bg-white dark:bg-slate-900 p-10 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-8 w-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <span className="material-icons-outlined text-lg">school</span>
              </div>
              <h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">{t('Academic Credentials')}</h3>
            </div>
            <div className="space-y-4">
              {[
                { label: t('Email Address'), val: pick(contact.email, personal.email, student?.email) },
                { label: t('Primary Phone'), val: pick(contact.phone, personal.phone, student?.phone) },
                { label: t('Administrative Division'), val: pick(contact.divisionOrState, contact.division, contact.region, student?.divisionOrState, student?.division_or_state) },
                { label: t('Home Township'), val: pick(contact.township, contact.townshipCode, student?.township) },
                { label: t('Residential Address'), val: pick(contact.address, personal.address, student?.address) },
                { label: t('Active Year'), val: pick(academic.currentYear, academic.current_year, student?.currentYear, student?.currentyear, student?.current_year) },
                { label: t('Semester'), val: pick(academic.academicSemester, academic.semester, student?.academicSemester, student?.academic_semester) },
                { label: t('Specialization major'), val: pick(academic.major, academic.majorCode, student?.major) },
                { label: t('Matric Roll No'), val: pick(academic.matriculationRollNo, personal.matriculationRollNo, student?.matriculationRollNo, student?.matriculation_rollno, student?.matriculation_roll_no) },
                { label: t('Matric Passed Year'), val: pick(academic.matriculationPassedYear, academic.matriculationYear, personal.matriculationPassedYear, personal.matriculationYear, student?.matriculationPassedYear, student?.matriculation_passed_year, student?.matriculation_year) }
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center py-3 border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors px-2 rounded-xl">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                  <span className="text-sm font-black text-slate-800 dark:text-white tracking-tight">{item.val || '-'}</span>
                </div>
              ))}
            </div>
           </section>
        </div>

        {/* PRIMARY DOCUMENT GALLERY */}
        <section className="bg-white dark:bg-slate-900 p-10 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-10">
            <div className="h-8 w-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <span className="material-icons-outlined text-lg">image</span>
            </div>
            <h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">{t('Verification Documents')}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ImageCard label="Passport Photo" url={pick(documents.passportPhoto, documents.passportPhotoUrl, student?.passportPhoto, student?.passportphoto, student?.passport_photo)} t={t} />
            <ImageCard label="Student NRC Front" url={pick(documents.studentNrcFront, documents.nrcFrontImage, student?.nrcFrontImage, student?.nrcfrontimage, student?.nrc_front_image)} t={t} />
            <ImageCard label="Student NRC Back" url={pick(documents.studentNrcBack, documents.nrcBackImage, student?.nrcBackImage, student?.nrcbackimage, student?.nrc_back_image)} t={t} />
          </div>
        </section>

        {/* PARENTAL PROFILES */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="bg-white dark:bg-slate-900 p-10 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm group">
             <div className="flex items-center gap-3 mb-8">
                <div className="h-8 w-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <span className="material-icons-outlined text-lg">family_restroom</span>
                </div>
                <h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">{t('Father Profile')}</h3>
             </div>
             <div className="space-y-4">
              {[
                { label: t('Full Name'), val: pick(father?.nameMm, father?.nameMM, father?.nameEn, father?.name, father?.full_name, father?.fullName, student?.fatherName, student?.father_name) },
                { label: t('Relationship'), val: pick(father?.relation, t('Father')) },
                { label: t('Career / Position'), val: pick(father?.occupation, father?.job_position) },
                { label: t('Contact Phone'), val: pick(father?.phone, father?.phone_number) },
                { label: t('Primary Address'), val: pick(father?.address) },
                { label: t('National Registry'), val: pick(father?.nrcNumber, father?.nrc_number) },
                { label: t('Ethnic Group'), val: pick(father?.ethnic) },
                { label: t('Religion'), val: pick(father?.religion) },
                { label: t('Birthplace'), val: pick(father?.birthplace) }
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center py-3 border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50/50 transition-colors px-2 rounded-xl">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                  <span className="text-sm font-black text-slate-800 dark:text-white tracking-tight">{item.val || '-'}</span>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4 pt-6">
                <ImageCard label="NRC Front" url={pick(documents.fatherNrcFront, father?.nrcFront, father?.nrcFrontImage, father?.nrc_front_image)} t={t} />
                <ImageCard label="NRC Back" url={pick(documents.fatherNrcBack, father?.nrcBack, father?.nrcBackImage, father?.nrc_back_image)} t={t} />
              </div>
             </div>
          </section>
          
          <section className="bg-white dark:bg-slate-900 p-10 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm group">
             <div className="flex items-center gap-3 mb-8">
                <div className="h-8 w-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <span className="material-icons-outlined text-lg">family_restroom</span>
                </div>
                <h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">{t('Mother Profile')}</h3>
             </div>
             <div className="space-y-4">
              {[
                { label: t('Full Name'), val: pick(mother?.nameMm, mother?.nameMM, mother?.nameEn, mother?.name, mother?.full_name, mother?.fullName, student?.motherName, student?.mother_name) },
                { label: t('Relationship'), val: pick(mother?.relation, t('Mother')) },
                { label: t('Career / Position'), val: pick(mother?.occupation, mother?.job_position) },
                { label: t('Contact Phone'), val: pick(mother?.phone, mother?.phone_number) },
                { label: t('Primary Address'), val: pick(mother?.address) },
                { label: t('National Registry'), val: pick(mother?.nrcNumber, mother?.nrc_number) },
                { label: t('Ethnic Group'), val: pick(mother?.ethnic) },
                { label: t('Religion'), val: pick(mother?.religion) },
                { label: t('Birthplace'), val: pick(mother?.birthplace) }
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center py-3 border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50/50 transition-colors px-2 rounded-xl">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                  <span className="text-sm font-black text-slate-800 dark:text-white tracking-tight">{item.val || '-'}</span>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4 pt-6">
                <ImageCard label="NRC Front" url={pick(documents.motherNrcFront, mother?.nrcFront, mother?.nrcFrontImage, mother?.nrc_front_image)} t={t} />
                <ImageCard label="NRC Back" url={pick(documents.motherNrcBack, mother?.nrcBack, mother?.nrcBackImage, mother?.nrc_back_image)} t={t} />
              </div>
             </div>
          </section>
        </section>

        {/* AGREEMENTS & DECLARATIONS */}
        <section className="bg-white dark:bg-slate-900 p-10 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-32 w-32 bg-slate-500/5 rounded-bl-full transform group-hover:scale-110 transition-transform duration-700" />
          <div className="flex items-center gap-3 mb-10">
            <div className="h-8 w-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <span className="material-icons-outlined text-lg">gavel</span>
            </div>
            <h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">{t('Agreements & Legal Declarations')}</h3>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 content-start">
               {[
                 { label: t('Financial Support Grant'), val: formatYesNo(pick(guardian.needsFinancialAid, guardian.needFinancialAid, student?.isBenefitStudent, student?.is_benefit_student), t), icon: 'payments' },
                 { label: t('On-Campus Housing'), val: formatYesNo(pick(guardian.needsHostel, guardian.needHostel, student?.isHostelStudent, student?.is_hostel_student), t), icon: 'home' },
                 { label: t('Institutional Terms'), val: formatYesNo(pick(declaration.schoolTermsAccepted, declaration.termsAccepted, declaration.school_terms_accepted), t), icon: 'assignment_turned_in' },
                 { label: t('Confession Status'), val: formatYesNo(pick(declaration.confessionAccepted, declaration.confession_accepted), t), icon: 'history_edu' }
               ].map((card, i) => (
                 <div key={i} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[24px] border border-slate-100/50 dark:border-slate-700/50 hover:shadow-lg transition-all group/item">
                    <div className="flex items-center gap-3 mb-3">
                       <span className="material-icons-outlined text-slate-400 group-hover/item:text-teal-600 transition-colors text-lg">{card.icon}</span>
                       <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{card.label}</p>
                    </div>
                    <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{card.val}</p>
                 </div>
               ))}
               <div className="sm:col-span-2 p-6 bg-teal-600 rounded-[24px] shadow-lg shadow-teal-600/20 text-white mt-2">
                 <div className="flex items-center gap-3 mb-2">
                    <span className="material-icons-outlined text-teal-200">account_balance_wallet</span>
                    <p className="text-[9px] font-black uppercase text-teal-100 tracking-[0.2em]">{t('Financial Supporter')}</p>
                 </div>
                 <p className="text-lg font-black">{formatFinancialSupporter(pick(guardian.financialSupporter, guardian.financial_supporter), t)}</p>
               </div>
            </div>
            <div className="space-y-4">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <span className="material-icons-outlined text-sm">family_restroom</span> {t('Family Household Registry')}
               </p>
               <ImageCard label="Household Registration" url={pick(documents.familyRegistration, guardian.familyRegistration)} t={t} />

            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default IsolatedReview;
