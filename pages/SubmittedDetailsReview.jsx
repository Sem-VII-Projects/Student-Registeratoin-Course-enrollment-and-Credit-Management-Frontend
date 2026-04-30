import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

function formatYesNo(value, t) {
  if (!hasMeaningfulValue(value)) return '-';
  return toBoolean(value) ? t('Yes') : t('No');
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

function formatFinancialSupporter(value, t) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '-';
  if (normalized === 'father') return t('Father');
  if (normalized === 'mother') return t('Mother');
  if (normalized === 'other') return t('Other');
  return value;
}

function ImageCard({ label, url, alt, t }) {
  return (
    <div className="submitted-image-card">
      <h4>{t(label)}</h4>
      {url ? (
        <>
          <a href={url} target="_blank" rel="noreferrer">
            <img src={url} alt={alt || label} />
          </a>
          <a className="open-link" href={url} target="_blank" rel="noreferrer">
            {t('Open Full Image')}
          </a>
        </>
      ) : (
        <p className="missing">{t('Not submitted')}</p>
      )}
    </div>
  );
}

function SubmittedDetailsReview() {
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
  const [detailsRejectDialog, setDetailsRejectDialog] = useState({ open: false, reason: '' });
  const isPaymentView = location.state?.viewMode === 'payment';

  const approveDetails = async () => {
    const confirmApprove = window.confirm(t('Approve {{name}}\'s details?', { name: displayStudentName }));
    if (!confirmApprove) return;
    setLoading(true);
    try {
      await api.updateStudent(student.studentid || student.id || studentId, { status: 'PAYMENT_REQUIRED', rejectionReason: null, rejection_reason: null });
      alert(t('Approved details for {{name}}. Student can now proceed to payment.', { name: displayStudentName }));
      navigate('/admin/dashboard');
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const rejectDetails = async () => {
    const sId = student.studentid || student.id || studentId;
    if (!sId) {
      alert(t('Cannot reject details: student ID not found.'));
      return;
    }
    const reason = detailsRejectDialog.reason.trim();
    if (!reason) {
      alert(t('Rejection reason is required.'));
      return;
    }
    const confirmReject = window.confirm(
      t('Reject {{name}}\'s details form?\n\nStudent will see this reason and must resubmit details.', { name: displayStudentName })
    );
    if (!confirmReject) return;

    setLoading(true);
    let clearSectionsError = null;
    let deleteDocsError = null;
    try {
      // 1. Clear staged registration sections
      if (registrationId) {
        try {
          await api.clearRegistrationSections(registrationId);
        } catch (clearError) {
          clearSectionsError = clearError;
          console.warn(`Failed to clear sections for registration ${registrationId}`, clearError);
        }
      }

      // 2. Delete all student documents
      try {
        await api.deleteStudentDocuments(sId);
      } catch (docClearError) {
        deleteDocsError = docClearError;
        console.warn(`Failed to clear student documents for ${sId}`, docClearError);
      }

      // 3. Store rejection reason
      await api.updateStudent(sId, {
        rejectionReason: reason,
        rejection_reason: reason
      });

      // 4. Send internal notification (regardless of cleanup success)
      try {
        await api.adminCreateMessage({
          recipientId: sId,
          subject: 'Details Form Rejected',
          body: `Your details form has been rejected. Reason: ${reason}`
        });
      } catch (msgErr) {
        console.warn('Failed to send rejection message to student', msgErr);
      }

      // 5. Check cleanup results
      if (clearSectionsError || deleteDocsError) {
        const failedParts = [];
        if (clearSectionsError) failedParts.push(`clear registration sections (${clearSectionsError.message || 'unknown error'})`);
        if (deleteDocsError) failedParts.push(`delete student documents (${deleteDocsError.message || 'unknown error'})`);
        alert(t('{{name}}\'s details were rejected.\n\nReason saved, but failed to: {{failedParts}}.', { name: displayStudentName, failedParts: failedParts.join(', ') }));
        navigate('/admin/dashboard');
        return;
      }

      // 6. Set status to APPROVED only when both cleanups succeeded
      await api.updateStudentStatus(sId, 'APPROVED');
      alert(t('{{name}}\'s details were rejected.\n\nReason sent to student and staged data cleared.', { name: displayStudentName }));
      navigate('/admin/dashboard');
    } catch (error) {
      console.error('Reject details error:', error);
      alert(t('Error: ') + (error.message || t('Rejection failed')));
    } finally {
      setLoading(false);
    }
  };

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
              <h1>{t('Payment Submission Review')}</h1>
              <p>{t('Verify student payment screenshot')}</p>
            </div>
            <button className="submitted-btn" onClick={() => navigate('/admin/dashboard')}>
              {t('Back')}
            </button>
          </header>

          <section className="submitted-section">
            <h3>{t('Student Information')}</h3>
            <p><strong>{t('Name')}:</strong> {displayStudentName}</p>
            <p><strong>{t('Username')}:</strong> {displayUsername}</p>
          </section>

          <section className="submitted-section">
            <h3>{t('Payment Screenshot')}</h3>
            <div className="submitted-image-grid two">
              <ImageCard
                label="Payment Receipt"
                url={paymentReceiptUrl}
                alt="Payment receipt screenshot"
                t={t}
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
            <h1>{t('Submitted Details Review')}</h1>
            <p>{t('Staged details from registration sections')}</p>
          </div>
          <button className="submitted-btn" onClick={() => navigate('/admin/dashboard')}>
            {t('Back')}
          </button>
        </header>

        <section className="submitted-highlight">
          <div className="status-badge">WAITING APPROVAL</div>
          <h2>{displayStudentName}</h2>
          <div className="submitted-info-grid">
            <p><strong>{t('Username')}:</strong> {displayUsername}</p>
            <p><strong>{t('Email')}:</strong> {student?.email || '-'}</p>
            <p><strong>{t('Status')}:</strong> {String(student.status || 'DETAILS_SUBMITTED').toUpperCase()}</p>
            <p><strong>{t('Review')}:</strong> {t('Waiting for admin approval')}</p>
            <p><strong>{t('Source')}:</strong> {t('Staged Registration Sections')}</p>
          </div>
          <div className="submitted-actions">
            <button className="btn-approve" onClick={approveDetails} disabled={loading}>{t('Approve Details')}</button>
            <button className="btn-reject" onClick={() => setDetailsRejectDialog({ open: true, reason: '' })} disabled={loading}>{t('Reject Details')}</button>
          </div>
        </section>

        <section className="submitted-grid two-col">
          <div className="submitted-section">
            <h3>{t('Student Information')}</h3>
            <p><strong>{t('Name (MM)')}:</strong> {pick(personal.nameMm, personal.studentNameMM, personal.studentName, personal.name_mm, student.namemm, student.name_mm) || '-'}</p>
            <p><strong>{t('Name (EN)')}:</strong> {pick(personal.nameEn, personal.studentNameEN, personal.studentNameEn, personal.name_en, student.nameen, student.name_en) || '-'}</p>
            <p><strong>{t('Gender')}:</strong> {pick(personal.gender, personal.sex, contact.gender, student.gender) || '-'}</p>
            <p><strong>{t('Date of Birth')}:</strong> {formatDate(pick(personal.dateOfBirth, personal.dob, personal.birthDate, student.date_of_birth, student.dateOfBirth))}</p>
            <p><strong>{t('NRC Number')}:</strong> {pick(personal.nrcNumber, personal.nrc, student.nrc_number, student.nrcNumber) || '-'}</p>
            <p><strong>{t('Religion')}:</strong> {pick(personal.religion, contact.religion, student.religion) || '-'}</p>
            <p><strong>{t('Ethnic')}:</strong> {pick(personal.ethnic, personal.ethnicity, student.ethnic) || '-'}</p>
            <p><strong>{t('Birthplace')}:</strong> {pick(personal.birthplace, personal.placeOfBirth, student.birthplace, student.place_of_birth) || '-'}</p>
            <p><strong>{t('Blood Type')}:</strong> {pick(personal.bloodType, personal.blood_group, student.bloodType, student.blood_type) || '-'}</p>
          </div>

          <div className="submitted-section">
            <h3>{t('Contact & Academic')}</h3>
            <p><strong>{t('Email')}:</strong> {pick(contact.email, personal.email, student.email) || '-'}</p>
            <p><strong>{t('Phone')}:</strong> {pick(contact.phone, personal.phone, student.phone) || '-'}</p>
            <p><strong>{t('Division/State')}:</strong> {pick(contact.divisionOrState, contact.division, contact.region, student.division_or_state, student.divisionOrState) || '-'}</p>
            <p><strong>{t('Township')}:</strong> {pick(contact.township, contact.townshipCode, student.township) || '-'}</p>
            <p><strong>{t('Address')}:</strong> {pick(contact.address, personal.address, student.address) || '-'}</p>
            <p><strong>{t('Current Year')}:</strong> {pick(academic.currentYear, academic.current_year, student.currentyear, student.current_year) ?? '-'}</p>
            <p><strong>{t('Semester')}:</strong> {pick(academic.academicSemester, academic.semester, student.academic_semester, student.academicSemester) || '-'}</p>
            <p><strong>{t('Major')}:</strong> {pick(academic.major, academic.majorCode, student.major) || '-'}</p>
            <p><strong>{t('Matric Roll No')}:</strong> {pick(academic.matriculationRollNo, personal.matriculationRollNo, student.matriculation_rollno, student.matriculation_roll_no, student.matriculationRollNo) || '-'}</p>
            <p><strong>{t('Matric Passed Year')}:</strong> {pick(academic.matriculationPassedYear, academic.matriculationYear, personal.matriculationPassedYear, personal.matriculationYear, student.matriculation_passed_year, student.matriculationPassedYear, student.matriculation_year, student.matriculationYear) || '-'}</p>
            <p><strong>{t('Financial Aid')}:</strong> {formatYesNo(pick(guardian.needsFinancialAid, guardian.needFinancialAid, student.is_benefit_student, student.isBenefitStudent), t)}</p>
            <p><strong>{t('Hostel Requested')}:</strong> {formatYesNo(pick(guardian.needsHostel, guardian.needHostel, student.is_hostel_student, student.isHostelStudent), t)}</p>
          </div>
        </section>

        <section className="submitted-section">
          <h3>{t('Student NRC / Photo')}</h3>
          <div className="submitted-image-grid">
            <ImageCard
              label="Passport Photo"
              url={pick(documents.passportPhoto, documents.passportPhotoUrl, student.passportphoto, student.passportPhoto, student.passport_photo)}
              alt="Passport photo"
              t={t}
            />
            <ImageCard
              label="Student NRC Front"
              url={pick(documents.studentNrcFront, documents.nrcFrontImage, student.nrcfrontimage, student.nrcFrontImage, student.nrc_front_image)}
              alt="Student NRC front"
              t={t}
            />
            <ImageCard
              label="Student NRC Back"
              url={pick(documents.studentNrcBack, documents.nrcBackImage, student.nrcbackimage, student.nrcBackImage, student.nrc_back_image)}
              alt="Student NRC back"
              t={t}
            />
          </div>
        </section>

        <section className="submitted-grid two-col">
          <div className="submitted-section">
            <h3>{t('Father Information')}</h3>
            <p><strong>{t('Name')}:</strong> {pick(father?.nameMm, father?.nameMM, father?.nameEn, father?.name, father?.full_name, student.father_name, student.fatherName) || '-'}</p>
            <p><strong>{t('Relation')}:</strong> {pick(father?.relation, t('Father'))}</p>
            <p><strong>{t('Occupation')}:</strong> {pick(father?.occupation, father?.job_position) || '-'}</p>
            <p><strong>{t('Phone')}:</strong> {pick(father?.phone, father?.phone_number) || '-'}</p>
            <p><strong>{t('Address')}:</strong> {pick(father?.address) || '-'}</p>
            <p><strong>{t('Ethnic')}:</strong> {pick(father?.ethnic) || '-'}</p>
            <p><strong>{t('Religion')}:</strong> {pick(father?.religion) || '-'}</p>
            <p><strong>{t('Birthplace')}:</strong> {pick(father?.birthplace) || '-'}</p>
            <p><strong>{t('NRC Number')}:</strong> {pick(father?.nrcNumber, father?.nrc_number) || '-'}</p>
            <div className="submitted-image-grid two">
              <ImageCard
                label="Father NRC Front"
                url={pick(documents.fatherNrcFront, father?.nrcFront, father?.nrcFrontImage, father?.nrc_front_image)}
                alt="Father NRC front"
                t={t}
              />
              <ImageCard
                label="Father NRC Back"
                url={pick(documents.fatherNrcBack, father?.nrcBack, father?.nrcBackImage, father?.nrc_back_image)}
                alt="Father NRC back"
                t={t}
              />
            </div>
          </div>

          <div className="submitted-section">
            <h3>{t('Mother Information')}</h3>
            <p><strong>{t('Name')}:</strong> {pick(mother?.nameMm, mother?.nameMM, mother?.nameEn, mother?.name, mother?.full_name, student.mother_name, student.motherName) || '-'}</p>
            <p><strong>{t('Relation')}:</strong> {pick(mother?.relation, t('Mother'))}</p>
            <p><strong>{t('Occupation')}:</strong> {pick(mother?.occupation, mother?.job_position) || '-'}</p>
            <p><strong>{t('Phone')}:</strong> {pick(mother?.phone, mother?.phone_number) || '-'}</p>
            <p><strong>{t('Address')}:</strong> {pick(mother?.address) || '-'}</p>
            <p><strong>{t('Ethnic')}:</strong> {pick(mother?.ethnic) || '-'}</p>
            <p><strong>{t('Religion')}:</strong> {pick(mother?.religion) || '-'}</p>
            <p><strong>{t('Birthplace')}:</strong> {pick(mother?.birthplace) || '-'}</p>
            <p><strong>{t('NRC Number')}:</strong> {pick(mother?.nrcNumber, mother?.nrc_number) || '-'}</p>
            <div className="submitted-image-grid two">
              <ImageCard
                label="Mother NRC Front"
                url={pick(documents.motherNrcFront, mother?.nrcFront, mother?.nrcFrontImage, mother?.nrc_front_image)}
                alt="Mother NRC front"
                t={t}
              />
              <ImageCard
                label="Mother NRC Back"
                url={pick(documents.motherNrcBack, mother?.nrcBack, mother?.nrcBackImage, mother?.nrc_back_image)}
                alt="Mother NRC back"
                t={t}
              />
            </div>
          </div>
        </section>

        <section className="submitted-section">
          <h3>{t('Agreement')}</h3>
          <p><strong>{t('Financial Supporter')}:</strong> {formatFinancialSupporter(pick(guardian.financialSupporter, guardian.financial_supporter), t)}</p>
          <p><strong>{t('Needs Financial Aid')}:</strong> {formatYesNo(pick(guardian.needsFinancialAid, guardian.needFinancialAid), t)}</p>
          <p><strong>{t('Needs Hostel')}:</strong> {formatYesNo(pick(guardian.needsHostel, guardian.needHostel), t)}</p>
          <p><strong>{t('School Terms Accepted')}:</strong> {formatYesNo(pick(declaration.schoolTermsAccepted, declaration.termsAccepted, declaration.school_terms_accepted), t)}</p>
          <p><strong>{t('Confession Accepted')}:</strong> {formatYesNo(pick(declaration.confessionAccepted, declaration.confession_accepted), t)}</p>
          <div className="submitted-image-grid two">
            <ImageCard
              label="Family Registration"
              url={pick(documents.familyRegistration, guardian.familyRegistration)}
              alt="Family registration"
              t={t}
            />
          </div>
        </section>
      </div>

      {detailsRejectDialog.open && (
        <div className="admin-modal-overlay" onClick={() => setDetailsRejectDialog({ open: false, reason: '' })}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t('Reject Details Form')}</h3>
            <div style={{ marginBottom: '0.75rem' }}>
              {t('Student')}: <strong>{displayStudentName}</strong>
            </div>
            <label htmlFor="details-reject-reason">{t('Reason shown to student')}</label>
            <textarea
              id="details-reject-reason"
              className="admin-reject-textarea"
              value={detailsRejectDialog.reason}
              onChange={(e) => setDetailsRejectDialog((prev) => ({ ...prev, reason: e.target.value }))}
              rows={4}
              style={{ width: '100%', padding: '0.5rem', fontSize: '0.875rem' }}
              placeholder={t("Type why the details form is rejected...")}
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setDetailsRejectDialog({ open: false, reason: '' })}
                disabled={loading}
              >
                {t('Cancel')}
              </button>
              <button
                type="button"
                className="btn-reject"
                onClick={rejectDetails}
                disabled={loading || !detailsRejectDialog.reason.trim()}
              >
                {loading ? t('Processing...') : t('Reject Details')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SubmittedDetailsReview;
