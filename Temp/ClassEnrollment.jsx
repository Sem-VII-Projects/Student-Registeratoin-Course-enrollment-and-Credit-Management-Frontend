import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { getStudentSession, persistStudentSession } from '../utils/studentStorage';
import '../styles/ClassEnrollment.css';

const formatApiError = (error, fallbackMessage) => {
  const code = error?.apiCode || error?.code;
  const message = error?.apiMessage || error?.message || fallbackMessage;
  return code ? `${code}: ${message}` : message;
};

function ClassEnrollment() {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [mode, setMode] = useState('');
  const [majorSelectionStartYear, setMajorSelectionStartYear] = useState(null);
  const [resolvedYearLevel, setResolvedYearLevel] = useState(null);
  const [foundationOptions, setFoundationOptions] = useState([]);
  const [majorClassOptions, setMajorClassOptions] = useState([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedMajorClassId, setSelectedMajorClassId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const parsedStudent = getStudentSession();
    if (!parsedStudent) {
      navigate('/login');
      return;
    }

    const loadCurrentTermAndOptions = async () => {
      try {
        let resolvedStudent = parsedStudent;
        let studentId = resolvedStudent.studentid || resolvedStudent.id || null;

        if (!studentId && resolvedStudent?.email) {
          const candidates = await api.getStudents(resolvedStudent.email);
          if (Array.isArray(candidates) && candidates.length > 0) {
            resolvedStudent = [...candidates].sort((a, b) => {
              const aDate = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
              const bDate = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
              return bDate - aDate;
            })[0] || resolvedStudent;
            studentId = resolvedStudent.studentid || resolvedStudent.id || null;
          }
        }

        if (!studentId) {
          throw new Error('Student ID is missing. Please log in again.');
        }

        setStudent(resolvedStudent);
        persistStudentSession(resolvedStudent);

        const fallbackYearLevel = resolvedStudent.currentyear || resolvedStudent.currentYear || null;
        const [term, options] = await Promise.all([
          api.getCurrentTerm(),
          api.getEnrollmentOptions(studentId)
        ]);

        setCurrentTerm(term || null);
        const resolvedMode = options?.mode || '';
        const normalizedOptions = Array.isArray(options?.options) ? options.options : [];
        const effectiveYearLevel = options?.yearLevel ?? fallbackYearLevel;

        if (!effectiveYearLevel) {
          alert('Year information is missing. Please contact admin.');
          navigate('/student-dashboard');
          return;
        }

        setMode(resolvedMode);
        setMajorSelectionStartYear(options?.majorSelectionStartYear ?? null);
        setResolvedYearLevel(effectiveYearLevel);
        setFoundationOptions(
          resolvedMode === 'FOUNDATION_SECTION'
            ? normalizedOptions
            : []
        );
        setMajorClassOptions(
          resolvedMode === 'MAJOR_CLASS'
            ? normalizedOptions
            : []
        );
      } catch (error) {
        console.error('Error loading enrollment options:', error);
        const errorCode = String(error?.apiCode || '').toUpperCase();
        if (errorCode === 'ENROLLMENT_CLOSED' || errorCode === 'REGISTRATION_DEADLINE_PASSED') {
          navigate('/dashboard', {
            state: {
              startRoute: {
                reason: 'CLOSED',
                route: '/dashboard'
              }
            }
          });
          return;
        }
        setStudent((prev) => prev || parsedStudent);
        setFoundationOptions([]);
        setMajorClassOptions([]);
        alert(formatApiError(error, 'Failed to load enrollment options.'));
      }
    };

    loadCurrentTermAndOptions();
  }, [navigate]);

  const getSection = (name) =>
    foundationOptions.find((s) => String(s?.section || '').toUpperCase() === String(name || '').toUpperCase());

  const handleClassSelect = (className) => {
    const section = getSection(className);
    if (section?.isLocked) {
      alert(`Class ${className} is locked.`);
      return;
    }
    if (section && section.remaining <= 0) {
      alert(`Class ${className} is full. Please select another section.`);
      return;
    }
    setSelectedSection(className);
  };

  const handleEnroll = async () => {
    if (mode === 'FOUNDATION_SECTION' && !selectedSection) {
      alert('Please select a class section.');
      return;
    }
    if (mode === 'MAJOR_CLASS' && !selectedMajorClassId) {
      alert('Please select a major class.');
      return;
    }
    if (!mode) {
      alert('Enrollment mode is unavailable. Please refresh.');
      return;
    }

    const selectedMajor = majorClassOptions.find(
      (item) => String(item?.majorClassId || item?.courseId || '') === String(selectedMajorClassId || '')
    );
    const confirmLabel = mode === 'FOUNDATION_SECTION'
      ? `Class ${selectedSection}`
      : (selectedMajor?.label || selectedMajor?.courseName || 'the selected major class');

    const isConfirmed = window.confirm(`Are you sure you want to enroll in ${confirmLabel}?`);
    if (!isConfirmed) return;

    setLoading(true);
    try {
      let resolvedStudent = student;
      let studentId = resolvedStudent?.studentid || resolvedStudent?.id || null;
      if (!studentId && resolvedStudent?.email) {
        const candidates = await api.getStudents(resolvedStudent.email);
        if (Array.isArray(candidates) && candidates.length > 0) {
          resolvedStudent = [...candidates].sort((a, b) => {
            const aDate = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bDate = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bDate - aDate;
          })[0] || resolvedStudent;
          studentId = resolvedStudent?.studentid || resolvedStudent?.id || null;
          setStudent(resolvedStudent);
          persistStudentSession(resolvedStudent);
        }
      }
      if (!studentId) {
        throw new Error('Student ID is missing. Please log in again.');
      }

      const yearLevel = resolvedYearLevel || resolvedStudent?.currentyear || resolvedStudent?.currentYear;
      const payload = {
        studentId,
        yearLevel
      };

      if (mode === 'FOUNDATION_SECTION') {
        payload.section = selectedSection;
      }
      if (mode === 'MAJOR_CLASS') {
        payload.majorClassId = selectedMajorClassId;
      }
      const enrollment = await api.registerTermEnrollment(payload);
      const enrolledSection = enrollment?.section || (mode === 'FOUNDATION_SECTION' ? selectedSection : '');
      const currentSemesterNumber = Number(currentTerm?.semester || 0);
      const semesterLabel = currentSemesterNumber === 1
        ? 'Sem I'
        : currentSemesterNumber === 2
          ? 'Sem II'
          : (currentTerm?.semester ? `Sem ${currentTerm.semester}` : '');

      const updatedStudent = {
        ...resolvedStudent,
        assigned_class: mode === 'FOUNDATION_SECTION'
          ? (enrolledSection || resolvedStudent?.assigned_class || '')
          : '',
        selected_major_class_id: mode === 'MAJOR_CLASS'
          ? selectedMajorClassId
          : (resolvedStudent?.selected_major_class_id || null),
        currentyear: yearLevel || resolvedStudent?.currentyear || resolvedStudent?.currentYear,
        academic_semester: semesterLabel || resolvedStudent?.academic_semester || '',
        status: 'ENROLLED'
      };
      let latestStudent = updatedStudent;
      try {
        const refreshed = await api.getStudentById(studentId);
        if (refreshed) {
          latestStudent = {
            ...refreshed,
            status: 'ENROLLED',
            assigned_class: refreshed.assigned_class || refreshed.assignedClass || enrolledSection || ''
          };
        }
      } catch (_) {
        // Keep local enrolled state when refresh fails.
      }
      persistStudentSession(latestStudent);
      setStudent(latestStudent);

      alert('Enrollment completed successfully.');
      navigate('/dashboard');
    } catch (error) {
      console.error('Enrollment error:', error);
      alert(`Enrollment failed: ${formatApiError(error, 'Please try again.')}`);
    } finally {
      setLoading(false);
    }
  };

  if (!student) {
    return <div className="loading">Loading...</div>;
  }

  const classes = foundationOptions
    .map((item) => item?.section)
    .filter(Boolean)
    .map((name) => {
    const section = getSection(name);
    return {
      name,
      maxCapacity: section?.maxCapacity ?? 40,
      currentEnrolled: section?.currentEnrolled ?? 0,
      remaining: section?.remaining ?? 40,
      isLocked: section?.isLocked ?? false
    };
  });
  const selectedMajor = majorClassOptions.find(
    (item) => String(item?.majorClassId || item?.courseId || '') === String(selectedMajorClassId || '')
  );
  const selectedFoundation = classes.find((item) => String(item?.name || '') === String(selectedSection || ''));
  const modeLabel = mode === 'FOUNDATION_SECTION'
    ? 'Foundation Section'
    : mode === 'MAJOR_CLASS'
      ? 'Major Class'
      : 'Loading...';

  return (
    <div className="enrollment-container">
      <header className="enrollment-header">
        <h1>Class Enrollment</h1>
        <p>
          {currentTerm?.academicYear && currentTerm?.semester
            ? `${currentTerm.academicYear} \u2022 Semester ${currentTerm.semester}`
            : 'Select a section'}
        </p>
        <p>
          Mode: <strong>{modeLabel}</strong>
          {majorSelectionStartYear ? ` (Major starts from Year ${majorSelectionStartYear})` : ''}
        </p>
      </header>

      <div className="enrollment-content">
        {mode === 'FOUNDATION_SECTION' ? (
          <div className="major-class-panel">
            <div className="major-class-field">
              <label htmlFor="foundation-section-select">Select Foundation Section</label>
              <select
                id="foundation-section-select"
                value={selectedSection}
                onChange={(event) => handleClassSelect(event.target.value)}
              >
                <option value="">Select a section</option>
                {classes.map((classItem) => {
                  const disabled = classItem.isLocked || classItem.remaining <= 0;
                  return (
                    <option key={classItem.name} value={classItem.name} disabled={disabled}>
                      {`Section ${classItem.name} (${classItem.currentEnrolled}/${classItem.maxCapacity}, remaining ${classItem.remaining})`}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="major-class-preview">
              {classes.length === 0 ? (
                <p>No foundation sections are configured for this term.</p>
              ) : selectedFoundation ? (
                <>
                  <p><strong>Section:</strong> {selectedFoundation.name}</p>
                  <p><strong>Year:</strong> {resolvedYearLevel || student?.currentyear || student?.currentYear || '-'}</p>
                  <p><strong>Capacity:</strong> {selectedFoundation.currentEnrolled}/{selectedFoundation.maxCapacity}</p>
                  <p><strong>Remaining:</strong> {selectedFoundation.remaining}</p>
                  <p><strong>Status:</strong> {selectedFoundation.isLocked ? 'Locked' : selectedFoundation.remaining <= 0 ? 'Full' : 'Open'}</p>
                </>
              ) : (
                <p>Select a section from the dropdown.</p>
              )}
            </div>
          </div>
        ) : mode === 'MAJOR_CLASS' ? (
          <div className="major-class-panel">
            <div className="major-class-field">
              <label htmlFor="major-class-select">Select Major Class</label>
              <select
                id="major-class-select"
                value={selectedMajorClassId}
                onChange={(event) => setSelectedMajorClassId(event.target.value)}
              >
                <option value="">Select a major class</option>
                {majorClassOptions.map((item) => {
                  const optionId = item?.majorClassId || item?.courseId;
                  return (
                    <option key={optionId} value={optionId}>
                      {item?.label || item?.courseName || optionId}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="major-class-preview">
              {selectedMajor ? (
                <>
                  <p><strong>Section:</strong> {selectedMajor.sectionCode || '-'}</p>
                  <p><strong>Code:</strong> {selectedMajor.courseCode || '-'}</p>
                  <p><strong>Name:</strong> {selectedMajor.courseName || '-'}</p>
                </>
              ) : (
                <p>Select a major class from the dropdown.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="major-class-panel">
            <div className="major-class-preview">
              <p>Loading enrollment options...</p>
            </div>
          </div>
        )}

        <div className="enrollment-actions">
          <button className="btn btn-back" onClick={() => navigate('/student-dashboard')}>
            Back
          </button>
          <button
            className="btn btn-enroll"
            onClick={handleEnroll}
            disabled={
              loading
              || (mode === 'FOUNDATION_SECTION' && !selectedSection)
              || (mode === 'MAJOR_CLASS' && !selectedMajorClassId)
            }
          >
            {loading
              ? 'Processing...'
              : mode === 'FOUNDATION_SECTION'
                ? `Enroll Section ${selectedSection || '...'}`
                : 'Enroll Major Class'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClassEnrollment;
