import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { clearStudentSession, getStudentSession, persistStudentSession } from '../utils/studentStorage';
import '../styles/StudentDashboard.css';

function normalizeStartReason(reason) {
  return String(reason || '').trim().toUpperCase();
}

function toSortableTimestamp(value) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function pickLatestStudentRecord(records) {
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

function resolveStudentCandidate(records, currentStudent) {
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

function StudentDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [student, setStudent] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [startRoute, setStartRoute] = useState(() => location.state?.startRoute || null);
  const [startRouteReason, setStartRouteReason] = useState(() =>
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
        const candidates = await api.getStudents(parsedStudent.email);
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
        const term = await api.getCurrentTerm();
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
          setCurrentTerm((prev) => ({
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
  }, [student, student?.id, student?.studentid, student?.email]);

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
    return `${raw} year`;
  }, [student?.currentyear, student?.currentYear]);

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
    ? 'Year Level Updated'
    : 'Registration Details Required';

  const statusLabel = useMemo(() => {
    const raw = String(student?.status || '');
    return raw
      .toLowerCase()
      .split('_')
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
      .join(' ');
  }, [student?.status]);

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

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    const currentPassword = passwordForm.currentPassword.trim();
    const newPassword = passwordForm.newPassword.trim();
    const confirmPassword = passwordForm.confirmPassword.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Please fill all password fields.');
      return;
    }
    if (newPassword.length < 6) {
      alert('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('New password and confirm password do not match.');
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
          const candidates = await api.getStudents(student.email);
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
        throw new Error('Student account ID not found. Please login again.');
      }

      await api.changeStudentPassword(studentId, {
        oldPassword: currentPassword,
        newPassword,
        email: student.email,
        username: student.user_name
      });
      alert('Password changed successfully.');
      closePasswordModal();
    } catch (error) {
      alert(`Failed to change password.\n\n${error.message}`);
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!student) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-glow header-glow-left" />
        <div className="header-glow header-glow-right" />
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-circle-small">UIT</div>
            <div>
              <h1>Student Dashboard</h1>
              <p>Student registration dashboard</p>
            </div>
          </div>

          <div className="header-actions">
            <button className="btn-logout-header" onClick={handleLogout}>
              Logout
            </button>
            <div className="profile-menu">
            <button
              className="profile-icon-btn"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Open profile menu"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="profile-icon-svg">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
              </svg>
            </button>
            {menuOpen && (
              <div className="profile-dropdown">
                <button className="profile-dropdown-item" onClick={openPasswordModal}>
                  Change Password
                </button>
                <button className="profile-dropdown-item danger" onClick={handleLogout}>
                  Logout
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
            <h2>Welcome, {student.namemm}!</h2>
            <p className="username-display">Username: <strong>{student.user_name}</strong></p>
          </section>

          <section className="status-card">
            <h3>Current Status</h3>
            {startRouteReason === 'CLOSED' && (
              <p className="status-note">Enrollment closed</p>
            )}
            <div className="status-info">
              <div className="status-item">
                <span className="label">Status</span>
                <span className={`badge badge-${String(student.status || '').toLowerCase()}`}>
                  {statusLabel}
                </span>
              </div>
              <div className="status-item">
                <span className="label">Year</span>
                <span className="value">{yearLevelLabel}</span>
              </div>
              <div className="status-item">
                <span className="label">Current Academic Year</span>
                <span className="value">{currentTerm?.academicYear || '-'}</span>
              </div>
              <div className="status-item">
                <span className="label">Current Semester</span>
                <span className="value">{currentTerm?.semester || '-'}</span>
              </div>
              <div className="status-item">
                <span className="label">Email</span>
                <span className="value">{student.email}</span>
              </div>
            </div>
          </section>

          <section className="action-cards">
            {showYearChangedRegistrationAction && (
              <div className="action-card warning">
                <div className="card-icon">YR</div>
                <h3>{yearChangedActionTitle}</h3>
                <p>Your year level is updated for the new academic cycle.</p>
                <p>Please continue Registration Details for this academic year.</p>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate(yearChangedTargetRoute)}
                >
                  Go To Registration Details
                </button>
              </div>
            )}

            {student.status === 'PENDING' && (
              <div className="action-card warning">
                <div className="card-icon">PD</div>
                <h3>Admin Review Pending</h3>
                <p>Your registration is currently under review.</p>
              </div>
            )}

            {student.status === 'APPROVED' && (
              <div className="action-card">
                <div className="card-icon">FM</div>
                <h3>{(student.rejection_reason || student.rejectionReason) ? 'Resubmit Student Details' : 'Fill Student Details'}</h3>
                <p>Complete the 6-section student details form.</p>
                {(student.rejection_reason || student.rejectionReason) && (
                  <p><strong>Admin rejection reason:</strong> {student.rejection_reason || student.rejectionReason}</p>
                )}
                <button className="btn btn-primary" onClick={() => navigate('/student-details')}>
                  {(student.rejection_reason || student.rejectionReason) ? 'Resubmit Now' : 'Fill Now'}
                </button>
              </div>
            )}

            {student.status === 'DETAILS_SUBMITTED' && (
              <div className="action-card warning">
                <div className="card-icon">RV</div>
                <h3>Details Under Review</h3>
                <p>Your submitted details are waiting for admin approval.</p>
              </div>
            )}

            {student.status === 'PAYMENT_REQUIRED' && (
              <>
                <div className="action-card success">
                  <div className="card-icon">OK</div>
                  <h3>Details Approved</h3>
                  <p>You can now pay your fee and submit the payment form.</p>
                  {(student.rejection_reason || student.rejectionReason) && (
                    <p>
                      <strong>Admin payment note:</strong>{' '}
                      {student.rejection_reason || student.rejectionReason}
                    </p>
                  )}
                </div>

                <div className="action-card">
                  <div className="card-icon">PY</div>
                  <h3>Submit Payment Form</h3>
                  <p>Pay fee and submit proof to admin for approval.</p>
                  <button className="btn btn-primary" onClick={() => navigate('/payment')}>
                    Submit Payment
                  </button>
                </div>
              </>
            )}

            {student.status === 'PAYMENT_PENDING' && (
              <div className="action-card warning">
                <div className="card-icon">CK</div>
                <h3>Waiting For Payment Approval</h3>
                <p>Your payment form was sent to admin and is waiting for approval.</p>
              </div>
            )}

            {canShowEnrollClassAction && (
              <div className="action-card success">
                <div className="card-icon">CL</div>
                <h3>Payment Approved</h3>
                <p>You can now enroll your class.</p>
                <button className="btn btn-primary" onClick={handleOpenEnrollment}>
                  Enroll Class
                </button>
              </div>
            )}

            {showEnrollmentCompleteCard && (
              <div className="action-card success">
                <div className="card-icon">EN</div>
                <h3>Enrollment Complete</h3>
                <p>Class: {student.assigned_class || student.assignedClass || 'Not assigned'}</p>
                <p>Your registration is fully completed.</p>
              </div>
            )}

            {student.status === 'REJECTED' && (
              <div className="action-card error">
                <div className="card-icon">NO</div>
                <h3>Registration Rejected</h3>
                <p>Your registration was rejected.</p>
                {(student.rejection_reason || student.rejectionReason) && (
                  <p><strong>Reason:</strong> {student.rejection_reason || student.rejectionReason}</p>
                )}
              </div>
            )}
          </section>

          <section className="info-section">
            <h3>Student Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <strong>Matriculation Roll No</strong>
                <p>{matriculationRollNo}</p>
              </div>
              <div className="info-item">
                <strong>Total Marks</strong>
                <p>{totalMarksObtained}</p>
              </div>
              <div className="info-item">
                <strong>Entry Academic Year</strong>
                <p>{student.academicyearentered}</p>
              </div>
              <div className="info-item">
                <strong>Phone</strong>
                <p>{student.phone}</p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {showPasswordModal && (
        <div className="modal-overlay" onClick={closePasswordModal}>
          <div className="password-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Change Password</h3>
            <form onSubmit={handlePasswordChange}>
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="At least 6 characters"
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={closePasswordModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-save" disabled={passwordLoading}>
                  {passwordLoading ? 'Saving...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentDashboard;
