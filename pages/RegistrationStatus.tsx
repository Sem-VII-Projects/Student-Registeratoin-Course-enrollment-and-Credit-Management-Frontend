import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { clearStudentSession, getStudentSession, persistStudentSession } from '../src/utils/studentStorage';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import '../styles/RegistrationStatus.css';

function normalizeStartReason(reason: any) {
  return String(reason || '').trim().toUpperCase();
}

function toSortableTimestamp(value: any) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function pickLatestStudentRecord(records: any[]) {
  if (!Array.isArray(records) || records.length === 0) return null;
  return [...records].sort((a, b) => {
    const timeA = Math.max(
      toSortableTimestamp(a?.updated_at),
      toSortableTimestamp(a?.updatedAt),
      toSortableTimestamp(a?.created_at),
      toSortableTimestamp(a?.createdAt)
    );
    const timeB = Math.max(
      toSortableTimestamp(b?.updated_at),
      toSortableTimestamp(b?.updatedAt),
      toSortableTimestamp(b?.created_at),
      toSortableTimestamp(b?.createdAt)
    );
    return timeB - timeA;
  })[0];
}

function resolveStudentCandidate(records: any[], currentStudent: any) {
  if (!Array.isArray(records) || records.length === 0) {
    return null;
  }
  const matched = records.find((s) =>
    (currentStudent?.user_name && s?.user_name && s.user_name === currentStudent.user_name)
    || (currentStudent?.studentid && s?.studentid && s.studentid === currentStudent.studentid)
    || (currentStudent?.id && s?.id && s.id === currentStudent.id)
  );
  return matched || pickLatestStudentRecord(records) || records[0];
}

interface RegistrationStatusProps {
  user?: any;
  onLogout?: () => void;
  onEnterPortal?: () => void;
}

const RegistrationStatus: React.FC<RegistrationStatusProps> = ({ user: initialUser, onLogout, onEnterPortal }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [student, setStudent] = useState<any>(null);
  const [currentTerm, setCurrentTerm] = useState<any>(null);
  const [startRoute, setStartRoute] = useState<any>(() => location.state?.startRoute || null);
  const [startRouteReason, setStartRouteReason] = useState<string>(() =>
    normalizeStartReason(location.state?.startRoute?.reason)
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleEnterPortal = () => {
    // Attempt to update global user role if possible via navigation/refresh
    if (onEnterPortal) {
      onEnterPortal();
      navigate('/student/dashboard');
    } else {
      // Fallback for legacy behavior
      sessionStorage.setItem("portal_entered", "true");
      window.location.href = '/#/student/dashboard';
      window.location.reload();
    }
  };

  useEffect(() => {
    const parsedStudent = getStudentSession();
    if (!parsedStudent) {
      navigate('/login');
      return;
    }

    setStudent(parsedStudent);

    const refreshStudent = async () => {
      try {
        const parsedStudentId = parsedStudent?.studentid || parsedStudent?.id || null;

        if (parsedStudentId) {
          try {
            const latest = await api.getStudentById(parsedStudentId);
            if (latest) {
              setStudent(latest);
              persistStudentSession(latest);
              return;
            }
          } catch (_) {
            // Fallback to list-by-email lookup below.
          }
        }

        if (!parsedStudent?.email) return;
        const candidates = await api.getStudents(parsedStudent.email, "spring");
        if (!Array.isArray(candidates) || candidates.length === 0) return;

        const resolved = resolveStudentCandidate(candidates, parsedStudent) || candidates[0];
        setStudent(resolved);
        persistStudentSession(resolved);
      } catch (error) {
        console.error('Failed to refresh latest student data:', error);
      }
    };

    refreshStudent();
  }, [navigate]);

  useEffect(() => {
    const payload = location.state?.startRoute || null;
    if (!payload) return;
    setStartRoute(payload);
    setStartRouteReason(normalizeStartReason(payload.reason));
  }, [location.state]);

  useEffect(() => {
    let cancelled = false;
    const fetchCurrentTerm = async () => {
      try {
        const term = await api.getCurrentTerm("spring");
        if (!cancelled) {
          setCurrentTerm(term || null);
        }
      } catch (_) {
        if (!cancelled) {
          setCurrentTerm(null);
        }
      }
    };
    fetchCurrentTerm();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!student) return;
    let cancelled = false;
    const fetchStartRoute = async () => {
      try {
        const payload = await api.getStudentStartRoute();
        if (cancelled || !payload) return;
        setStartRoute(payload);
        setStartRouteReason(normalizeStartReason(payload.reason));
        if (payload.currentAcademicYear || payload.currentSemester) {
          setCurrentTerm((prev: any) => ({
            academicYear: payload.currentAcademicYear || prev?.academicYear || null,
            semester: payload.currentSemester || prev?.semester || null
          }));
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to resolve student start route:', error);
        }
      }
    };
    fetchStartRoute();
    return () => {
      cancelled = true;
    };
  }, [student]);

  const resolvedStartRoute = useMemo(() => {
    const route = String(startRoute?.route || '').trim();
    if (route === '/dashboard' || route === '/enrollment' || route.startsWith('/registration/')) {
      return route;
    }
    return '/dashboard';
  }, [startRoute?.route]);

  const yearLevelLabel = useMemo(() => {
    const raw = student?.currentyear ?? student?.currentYear;
    if (raw === null || raw === undefined || String(raw).trim() === '') {
      return '-';
    }
    const labelMap: Record<string, string> = {
      '1st': '1st year',
      '2nd': '2nd year',
      '3rd': '3rd year',
      '4th': '4th year',
      '5th': '5th year'
    };
    const engLabel = labelMap[String(raw)] || `${raw} year`;
    return t(engLabel);
  }, [student?.currentyear, student?.currentYear, t]);

  const showYearChangedRegistrationAction = useMemo(() => {
    if (startRouteReason === 'YEAR_CHANGED') {
      return true;
    }
    if (startRouteReason === 'CLOSED') {
      return false;
    }
    return resolvedStartRoute.startsWith('/registration/');
  }, [startRouteReason, resolvedStartRoute]);

  const yearChangedTargetRoute = useMemo(
    () => (startRouteReason === 'YEAR_CHANGED'
      ? '/registration/start'
      : (resolvedStartRoute.startsWith('/registration/') ? resolvedStartRoute : '/registration/start')),
    [resolvedStartRoute, startRouteReason]
  );

  const yearChangedActionTitle = startRouteReason === 'YEAR_CHANGED'
    ? t('Year Level Updated')
    : t('Registration Details Required');

  const statusLabel = useMemo(() => {
    const raw = String(student?.status || '').toUpperCase();
    if (!raw) return t('Unknown');
    // Map backend status codes to translation keys
    const keys: Record<string, string> = {
      'PENDING': 'PENDING',
      'APPROVED': 'APPROVED',
      'DETAILS_SUBMITTED': 'DETAILS_SUBMITTED',
      'PAYMENT_REQUIRED': 'PAYMENT_REQUIRED',
      'PAYMENT_PENDING': 'PAYMENT_PENDING',
      'PAYMENT_DONE': 'PAYMENT_DONE',
      'ENROLLED': 'ENROLLED',
      'REJECTED': 'REJECTED'
    };
    return t(keys[raw] || raw);
  }, [student?.status, t]);

  const normalizedStatus = useMemo(
    () => String(student?.status || '').trim().toUpperCase(),
    [student?.status]
  );

  const showEnrollmentCompleteCard = useMemo(() => {
    if (normalizedStatus === 'ENROLLED') {
      return true;
    }
    if (normalizedStatus !== 'PAYMENT_DONE') {
      return false;
    }
    if (startRouteReason === 'CLOSED') {
      return false;
    }
    const assignedClass = String(student?.assigned_class || student?.assignedClass || '').trim();
    const hasMajorEnrollment = Boolean(student?.selected_major_class_id || student?.selectedMajorClassId);
    const hasEnrollmentArtifacts = assignedClass !== '' || hasMajorEnrollment;
    if (!hasEnrollmentArtifacts) {
      return false;
    }
    // Do not treat previous-cycle class data as current-term enrollment completion.
    if (startRouteReason === 'YEAR_CHANGED' || resolvedStartRoute === '/enrollment') {
      return false;
    }
    return resolvedStartRoute === '/dashboard';
  }, [
    normalizedStatus,
    resolvedStartRoute,
    startRouteReason,
    student?.assigned_class,
    student?.assignedClass,
    student?.selected_major_class_id,
    student?.selectedMajorClassId
  ]);

  const canShowEnrollClassAction = useMemo(() => {
    if (normalizedStatus !== 'PAYMENT_DONE') {
      return false;
    }
    if (startRouteReason === 'CLOSED') {
      return false;
    }
    // Keep Enroll button visible until enrollment is actually completed.
    return !showEnrollmentCompleteCard;
  }, [normalizedStatus, showEnrollmentCompleteCard, startRouteReason]);

  const matriculationRollNo = useMemo(
    () =>
      student?.matriculation_rollno
      || student?.matriculation_roll_no
      || student?.matriculationRollNo
      || '-',
    [student]
  );

  const totalMarksObtained = useMemo(() => {
    const marks =
      student?.totalmarks_obtained
      ?? student?.total_marks_obtained
      ?? student?.totalMarksObtained
      ?? student?.total_marks
      ?? student?.totalMarks;
    return marks === null || marks === undefined || marks === '' ? '-' : marks;
  }, [student]);

  const handleLogout = () => {
    clearStudentSession();
    localStorage.removeItem('authToken');
    if (onLogout) onLogout();
    navigate('/');
  };

  const handleOpenEnrollment = async () => {
    try {
      const latestStartRoute = await api.getStudentStartRoute();
      if (latestStartRoute) {
        setStartRoute(latestStartRoute);
        setStartRouteReason(normalizeStartReason(latestStartRoute.reason));
        navigate('/enrollment', { state: { startRoute: latestStartRoute } });
        return;
      }
    } catch (error) {
      console.error('Failed to refresh start route before enrollment:', error);
    }

    if (startRoute) {
      navigate('/enrollment', { state: { startRoute } });
      return;
    }
    navigate('/enrollment');
  };

  const openPasswordModal = () => {
    setMenuOpen(false);
    setShowPasswordModal(true);
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentPassword = passwordForm.currentPassword.trim();
    const newPassword = passwordForm.newPassword.trim();
    const confirmPassword = passwordForm.confirmPassword.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      alert(t('Please fill all password fields.'));
      return;
    }
    if (newPassword.length < 6) {
      alert(t('At least 6 characters'));
      return;
    }
    if (newPassword !== confirmPassword) {
      alert(t('New password and confirm password do not match.'));
      return;
    }

    setPasswordLoading(true);
    try {
      let studentId = student.studentid || student.id;

      // Resolve latest student record but do not block password change when refresh fails.
      if (studentId) {
        try {
          const latest = await api.getStudentById(studentId);
          if (latest) {
            studentId = latest.studentid || latest.id || studentId;
            if ((latest.studentid || latest.id) && (latest.studentid !== student.studentid || latest.id !== student.id)) {
              setStudent(latest);
              persistStudentSession(latest);
            }
          }
        } catch (_) {
          // Continue with existing student ID.
        }
      } else if (student?.email) {
        try {
          const candidates = await api.getStudents(student.email, "spring");
          if (Array.isArray(candidates) && candidates.length > 0) {
            const resolved = resolveStudentCandidate(candidates, student) || candidates[0];
            studentId = resolved.studentid || resolved.id || studentId;
            if (studentId && (resolved.studentid || resolved.id) && (resolved.studentid !== student.studentid || resolved.id !== student.id)) {
              setStudent(resolved);
              persistStudentSession(resolved);
            }
          }
        } catch (_) {
          // Continue with existing student ID fallback.
        }
      }
      if (!studentId) {
        throw new Error(t('Student account ID not found. Please login again.'));
      }

      await api.changeStudentPassword(studentId, {
        oldPassword: currentPassword,
        newPassword,
        email: student.email,
        username: student.user_name
      });
      alert(t('Password changed successfully.'));
      closePasswordModal();
    } catch (error: any) {
      alert(`${t('Failed to change password.')}\n\n${error.message}`);
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!student) {
    return <div className="loading">{t('Loading...')}</div>;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-circle-small">UIT</div>
            <div>
              <h1>Portal</h1>
              <p>{t('Registration Management')}</p>
            </div>
          </div>

          <div className="header-actions">
            <LanguageSwitcher />
            {(normalizedStatus === 'ENROLLED' || showEnrollmentCompleteCard) && (
              <button 
                className="btn-primary" 
                onClick={handleEnterPortal}
                style={{ marginTop: 0, padding: '10px 20px', background: '#10b981' }}
              >
                {t('Enter Portal')}
              </button>
            )}
            <div className="profile-menu">
              <button
                className="profile-icon-btn"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label="Open profile menu"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </button>
              {menuOpen && (
                <div className="profile-dropdown">
                  <button className="profile-dropdown-item" onClick={openPasswordModal}>
                    {t('Security Settings')}
                  </button>
                  <button className="profile-dropdown-item danger" onClick={handleLogout}>
                    {t('Sign Out')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-content">
          <section className="welcome-section">
            <h2>{t('Hello, {{name}}.', { name: student.fullName || student.namemm || student.name || 'Student' })}</h2>
            <p className="username-display">{t('Account:')} <strong>{student.username || student.user_name}</strong></p>
          </section>

          <section className="status-card">
            <h3>{t('Current Status')}</h3>
            <div className="status-info">
              <div className="status-item">
                <span className="label">{t('Registry Status')}</span>
                <span className={`badge badge-${String(student.status || '').toLowerCase()}`}>
                  {statusLabel}
                </span>
              </div>
              <div className="status-item">
                <span className="label">{t('Academic Year')}</span>
                <span className="value">{currentTerm?.academicYear || '2024-2025'}</span>
              </div>
              <div className="status-item">
                <span className="label">{t('Semester')}</span>
                <span className="value">{t(currentTerm?.semester || 'Semester 1')}</span>
              </div>
              <div className="status-item">
                <span className="label">{t('Level')}</span>
                <span className="value">{yearLevelLabel}</span>
              </div>
            </div>
            {startRouteReason === 'CLOSED' && (
              <p className="status-note" style={{ marginTop: '20px', color: '#ef4444', fontWeight: '700' }}>
                {t('Registration cycle is currently closed.')}
              </p>
            )}
          </section>

          <section className="action-cards">
            {showYearChangedRegistrationAction && (
              <div className="action-card warning">
                <div className="card-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <div className="card-text">
                  <h3>{yearChangedActionTitle}</h3>
                  <p>{t('Your record has been advanced to the next academic cycle. Please update your registration details.')}</p>
                  <button className="btn-primary" onClick={() => navigate(yearChangedTargetRoute)}>
                    {t('Begin Registration')}
                  </button>
                </div>
              </div>
            )}

            {student.status === 'PENDING' && (
              <div className="action-card warning">
                <div className="card-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div className="card-text">
                  <h3>{t('Pending Review')}</h3>
                  <p>{t('Your initial application is in the queue for administrative verification.')}</p>
                </div>
              </div>
            )}

            {student.status === 'APPROVED' && (
              <div className="action-card success">
                <div className="card-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                </div>
                <div className="card-text">
                  <h3>{(student.rejection_reason || student.rejectionReason) ? t('Action Required: Resubmit') : t('Complete Registration')}</h3>
                  <p>{t('Please provide your comprehensive student details and required documentation.')}</p>
                  <button className="btn-primary" onClick={() => navigate('/student-details')}>
                    {(student.rejection_reason || student.rejectionReason) ? t('Resubmit Details') : t('Continue to Form')}
                  </button>
                </div>
              </div>
            )}

            {student.status === 'DETAILS_SUBMITTED' && (
              <div className="action-card warning">
                <div className="card-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <div className="card-text">
                  <h3>{t('Verification in Progress')}</h3>
                  <p>{t('Your submitted details are currently being audited by the registrar\'s office.')}</p>
                </div>
              </div>
            )}

            {student.status === 'PAYMENT_REQUIRED' && (
              <div className="action-card success">
                <div className="card-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                </div>
                <div className="card-text">
                  <h3>{t('Audit Successful')}</h3>
                  <p>{t('Your details are verified. Please proceed with the tuition payment to finalize your seat.')}</p>
                  <button className="btn-primary" onClick={() => navigate('/payment')}>
                    {t('Proceed to Payment')}
                  </button>
                </div>
              </div>
            )}

            {student.status === 'PAYMENT_PENDING' && (
              <div className="action-card warning">
                <div className="card-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <div className="card-text">
                  <h3>{t('Payment Under Review')}</h3>
                  <p>{t('We are confirming your transaction with the finance department.')}</p>
                </div>
              </div>
            )}

            {canShowEnrollClassAction && (
              <div className="action-card success">
                <div className="card-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                </div>
                <div className="card-text">
                  <h3>{t('Course Enrollment')}</h3>
                  <p>{t('Your financial status is cleared. You may now select your sections for the current term.')}</p>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn-primary" onClick={handleOpenEnrollment}>
                      {t('Enroll Courses')}
                    </button>
                    <button className="btn-primary" onClick={handleEnterPortal} style={{ background: '#fff', color: '#000', border: '1px solid #000' }}>
                      {t('Enter Portal')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showEnrollmentCompleteCard && (
              <div className="action-card success">
                <div className="card-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <div className="card-text">
                  <h3>{t('Enrollment Finalized')}</h3>
                  <p>{t('Class:')} <strong>{student.assigned_class || student.assignedClass || t('Unassigned')}</strong></p>
                  <p>{t('Registration cycle complete. Welcome to the new academic year.')}</p>
                  <button className="btn-primary" onClick={handleEnterPortal} style={{ background: '#10b981' }}>
                    {t('Enter Academic Portal')}
                  </button>
                </div>
              </div>
            )}

            {student.status === 'REJECTED' && (
              <div className="action-card error">
                <div className="card-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                </div>
                <div className="card-text">
                  <h3>{t('Application Refused')}</h3>
                  <p>{t('Reason:')} {student.rejection_reason || student.rejectionReason || t('No reason provided.')}</p>
                </div>
              </div>
            )}
          </section>

          <section className="info-section">
            <h3>{t('Registry Information')}</h3>
            <div className="info-grid">
              <div className="info-item">
                <strong>{t('Identity')}</strong>
                <p>{matriculationRollNo}</p>
              </div>
              <div className="info-item">
                <strong>{t('Academic Merit')}</strong>
                <p>{totalMarksObtained}</p>
              </div>
              <div className="info-item">
                <strong>{t('Entry Cycle')}</strong>
                <p>{student.academicyearentered}</p>
              </div>
              <div className="info-item">
                <strong>{t('Contact')}</strong>
                <p>{student.phone}</p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {showPasswordModal && (
        <div className="modal-overlay" onClick={closePasswordModal}>
          <div className="password-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t('Change Password')}</h3>
            <form onSubmit={handlePasswordChange}>
              <div className="form-group">
                <label>{t('Current Password')}</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder={t('Enter current password')}
                />
              </div>
              <div className="form-group">
                <label>{t('New Password')}</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder={t('At least 6 characters')}
                />
              </div>
              <div className="form-group">
                <label>{t('Confirm New Password')}</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder={t('Confirm new password')}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={closePasswordModal}>
                  {t('cancel')}
                </button>
                <button type="submit" className="btn-save" disabled={passwordLoading}>
                  {passwordLoading ? t('Loading...') : t('Save Password')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default RegistrationStatus;
