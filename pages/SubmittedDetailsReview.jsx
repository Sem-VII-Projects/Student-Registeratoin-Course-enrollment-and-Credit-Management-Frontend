import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import '../styles/SubmittedDetailsReview.css';

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
    <div className="submitted-image-card">
      <h4>{label}</h4>
      {url ? (
        <>
          <a href={url} target="_blank" rel="noreferrer">
            <img src={url} alt={alt || label} />
          </a>
          <a className="open-link" href={url} target="_blank" rel="noreferrer">
            Open Full Image
          </a>
        </>
      ) : (
        <p className="missing">Not submitted</p>
      )}
    </div>
  );
}

function SubmittedDetailsReview() {
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
    const adminData = localStorage.getItem('adminData');
    if (!adminData) {
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
            // Ignore and leave URL empty if backend lookup fails.
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
  }, [isPaymentView, location.state, navigate, studentId]);

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
    return <div className="submitted-review-loading">Loading submitted details...</div>;
  }

  if (error || !student) {
    return (
      <div className="submitted-review-page">
        <div className="submitted-review-empty">
          <h2>Unable to load submitted details</h2>
          <p>{error || 'Student record not found.'}</p>
          <button className="submitted-btn" onClick={() => navigate('/admin/dashboard')}>
            Back to Admin Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (isPaymentView) {
    return (
      <div className="submitted-review-page">
        <div className="submitted-review-wrap">
          <header className="submitted-review-header">
            <div>
              <h1>Payment Submission Review</h1>
              <p>Verify student payment screenshot</p>
            </div>
            <button className="submitted-btn" onClick={() => navigate('/admin/dashboard')}>
              Back
            </button>
          </header>

          <section className="submitted-section">
            <h3>Student Information</h3>
            <p><strong>Name:</strong> {displayStudentName}</p>
            <p><strong>Username:</strong> {displayUsername}</p>
          </section>

          <section className="submitted-section">
            <h3>Payment Screenshot</h3>
            <div className="submitted-image-grid two">
              <ImageCard
                label="Payment Receipt"
                url={paymentReceiptUrl}
                alt="Payment receipt screenshot"
              />
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="submitted-review-page">
      <div className="submitted-review-wrap">
        <header className="submitted-review-header">
          <div>
            <h1>Submitted Details Review</h1>
            <p>Staged details from registration sections</p>
          </div>
          <button className="submitted-btn" onClick={() => navigate('/admin/dashboard')}>
            Back
          </button>
        </header>

        <section className="submitted-highlight">
          <div className="status">{String(student.status || 'DETAILS_SUBMITTED').toUpperCase()}</div>
          <h2>{displayStudentName}</h2>
          <p>Submitted at: {formatDate(pick(declaration.submittedAt, student.updatedAt, student.createdAt))}</p>
          <p>Registration ID: {registrationId || '-'}</p>
        </section>

        <section className="submitted-grid two-col">
          <div className="submitted-section">
            <h3>Student Information</h3>
            <p><strong>Name (MM):</strong> {pick(personal.nameMm, personal.studentNameMM, personal.studentName, personal.name_mm, student.namemm, student.name_mm) || '-'}</p>
            <p><strong>Name (EN):</strong> {pick(personal.nameEn, personal.studentNameEN, personal.studentNameEn, personal.name_en, student.nameen, student.name_en) || '-'}</p>
            <p><strong>Gender:</strong> {pick(personal.gender, personal.sex, contact.gender, student.gender) || '-'}</p>
            <p><strong>Date of Birth:</strong> {formatDate(pick(personal.dateOfBirth, personal.dob, personal.birthDate, student.date_of_birth, student.dateOfBirth))}</p>
            <p><strong>NRC Number:</strong> {pick(personal.nrcNumber, personal.nrc, student.nrc_number, student.nrcNumber) || '-'}</p>
            <p><strong>Religion:</strong> {pick(personal.religion, contact.religion, student.religion) || '-'}</p>
            <p><strong>Ethnic:</strong> {pick(personal.ethnic, personal.ethnicity, student.ethnic) || '-'}</p>
            <p><strong>Birthplace:</strong> {pick(personal.birthplace, personal.placeOfBirth, student.birthplace, student.place_of_birth) || '-'}</p>
            <p><strong>Blood Type:</strong> {pick(personal.bloodType, personal.blood_group, student.bloodType, student.blood_type) || '-'}</p>
          </div>

          <div className="submitted-section">
            <h3>Contact & Academic</h3>
            <p><strong>Email:</strong> {pick(contact.email, personal.email, student.email) || '-'}</p>
            <p><strong>Phone:</strong> {pick(contact.phone, personal.phone, student.phone) || '-'}</p>
            <p><strong>Division/State:</strong> {pick(contact.divisionOrState, contact.division, contact.region, student.division_or_state, student.divisionOrState) || '-'}</p>
            <p><strong>Township:</strong> {pick(contact.township, contact.townshipCode, student.township) || '-'}</p>
            <p><strong>Address:</strong> {pick(contact.address, personal.address, student.address) || '-'}</p>
            <p><strong>Current Year:</strong> {pick(academic.currentYear, academic.current_year, student.currentyear, student.current_year) ?? '-'}</p>
            <p><strong>Semester:</strong> {pick(academic.academicSemester, academic.semester, student.academic_semester, student.academicSemester) || '-'}</p>
            <p><strong>Major:</strong> {pick(academic.major, academic.majorCode, student.major) || '-'}</p>
            <p><strong>Matric Roll No:</strong> {pick(academic.matriculationRollNo, personal.matriculationRollNo, student.matriculation_rollno, student.matriculation_roll_no, student.matriculationRollNo) || '-'}</p>
            <p><strong>Matric Passed Year:</strong> {pick(academic.matriculationPassedYear, academic.matriculationYear, personal.matriculationPassedYear, personal.matriculationYear, student.matriculation_passed_year, student.matriculationPassedYear, student.matriculation_year, student.matriculationYear) || '-'}</p>
            <p><strong>Financial Aid:</strong> {formatYesNo(pick(guardian.needsFinancialAid, guardian.needFinancialAid, student.is_benefit_student, student.isBenefitStudent))}</p>
            <p><strong>Hostel Requested:</strong> {formatYesNo(pick(guardian.needsHostel, guardian.needHostel, student.is_hostel_student, student.isHostelStudent))}</p>
          </div>
        </section>

        <section className="submitted-section">
          <h3>Student NRC / Photo</h3>
          <div className="submitted-image-grid">
            <ImageCard
              label="Passport Photo"
              url={pick(documents.passportPhoto, documents.passportPhotoUrl, student.passportphoto, student.passportPhoto, student.passport_photo)}
              alt="Passport photo"
            />
            <ImageCard
              label="Student NRC Front"
              url={pick(documents.studentNrcFront, documents.nrcFrontImage, student.nrcfrontimage, student.nrcFrontImage, student.nrc_front_image)}
              alt="Student NRC front"
            />
            <ImageCard
              label="Student NRC Back"
              url={pick(documents.studentNrcBack, documents.nrcBackImage, student.nrcbackimage, student.nrcBackImage, student.nrc_back_image)}
              alt="Student NRC back"
            />
          </div>
        </section>

        <section className="submitted-grid two-col">
          <div className="submitted-section">
            <h3>Father Information</h3>
            <p><strong>Name:</strong> {pick(father?.nameMm, father?.nameMM, father?.nameEn, father?.name, father?.full_name, student.father_name, student.fatherName) || '-'}</p>
            <p><strong>Relation:</strong> {pick(father?.relation, 'Father')}</p>
            <p><strong>Occupation:</strong> {pick(father?.occupation, father?.job_position) || '-'}</p>
            <p><strong>Phone:</strong> {pick(father?.phone, father?.phone_number) || '-'}</p>
            <p><strong>Address:</strong> {pick(father?.address) || '-'}</p>
            <p><strong>Ethnic:</strong> {pick(father?.ethnic) || '-'}</p>
            <p><strong>Religion:</strong> {pick(father?.religion) || '-'}</p>
            <p><strong>Birthplace:</strong> {pick(father?.birthplace) || '-'}</p>
            <p><strong>NRC Number:</strong> {pick(father?.nrcNumber, father?.nrc_number) || '-'}</p>
            <div className="submitted-image-grid two">
              <ImageCard
                label="Father NRC Front"
                url={pick(documents.fatherNrcFront, father?.nrcFront, father?.nrcFrontImage, father?.nrc_front_image)}
                alt="Father NRC front"
              />
              <ImageCard
                label="Father NRC Back"
                url={pick(documents.fatherNrcBack, father?.nrcBack, father?.nrcBackImage, father?.nrc_back_image)}
                alt="Father NRC back"
              />
            </div>
          </div>

          <div className="submitted-section">
            <h3>Mother Information</h3>
            <p><strong>Name:</strong> {pick(mother?.nameMm, mother?.nameMM, mother?.nameEn, mother?.name, mother?.full_name, student.mother_name, student.motherName) || '-'}</p>
            <p><strong>Relation:</strong> {pick(mother?.relation, 'Mother')}</p>
            <p><strong>Occupation:</strong> {pick(mother?.occupation, mother?.job_position) || '-'}</p>
            <p><strong>Phone:</strong> {pick(mother?.phone, mother?.phone_number) || '-'}</p>
            <p><strong>Address:</strong> {pick(mother?.address) || '-'}</p>
            <p><strong>Ethnic:</strong> {pick(mother?.ethnic) || '-'}</p>
            <p><strong>Religion:</strong> {pick(mother?.religion) || '-'}</p>
            <p><strong>Birthplace:</strong> {pick(mother?.birthplace) || '-'}</p>
            <p><strong>NRC Number:</strong> {pick(mother?.nrcNumber, mother?.nrc_number) || '-'}</p>
            <div className="submitted-image-grid two">
              <ImageCard
                label="Mother NRC Front"
                url={pick(documents.motherNrcFront, mother?.nrcFront, mother?.nrcFrontImage, mother?.nrc_front_image)}
                alt="Mother NRC front"
              />
              <ImageCard
                label="Mother NRC Back"
                url={pick(documents.motherNrcBack, mother?.nrcBack, mother?.nrcBackImage, mother?.nrc_back_image)}
                alt="Mother NRC back"
              />
            </div>
          </div>
        </section>

        <section className="submitted-section">
          <h3>Agreement</h3>
          <p><strong>Financial Supporter:</strong> {formatFinancialSupporter(pick(guardian.financialSupporter, guardian.financial_supporter))}</p>
          <p><strong>Needs Financial Aid:</strong> {formatYesNo(pick(guardian.needsFinancialAid, guardian.needFinancialAid))}</p>
          <p><strong>Needs Hostel:</strong> {formatYesNo(pick(guardian.needsHostel, guardian.needHostel))}</p>
          <p><strong>School Terms Accepted:</strong> {formatYesNo(pick(declaration.schoolTermsAccepted, declaration.termsAccepted, declaration.school_terms_accepted))}</p>
          <p><strong>Confession Accepted:</strong> {formatYesNo(pick(declaration.confessionAccepted, declaration.confession_accepted))}</p>
          <div className="submitted-image-grid two">
            <ImageCard
              label="Family Registration"
              url={pick(documents.familyRegistration, guardian.familyRegistration)}
              alt="Family registration"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

export default SubmittedDetailsReview;
