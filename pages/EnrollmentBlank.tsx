import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { getStudentSession, persistStudentSession } from '../src/utils/studentStorage';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import '../styles/ClassEnrollment.css';

const formatApiError = (error: any, fallbackMessage: string, t: any) => {
  const code = error?.apiCode || error?.code;
  const message = error?.apiMessage || error?.message || fallbackMessage;
  return code ? `${code}: ${message}` : message;
};

const EnrollmentBlank: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [student, setStudent] = useState<any>(null);
  const [currentTerm, setCurrentTerm] = useState<any>(null);
  const [mode, setMode] = useState('');
  const [majorSelectionStartYear, setMajorSelectionStartYear] = useState<number | null>(null);
  const [resolvedYearLevel, setResolvedYearLevel] = useState<any>(null);
  const [foundationOptions, setFoundationOptions] = useState<any[]>([]);
  const [majorClassOptions, setMajorClassOptions] = useState<any[]>([]);
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
          const candidates = await api.getStudents(resolvedStudent.email, "spring");
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
          api.getCurrentTerm("spring"),
          api.getEnrollmentOptions(studentId)
        ]);

        setCurrentTerm(term || null);
        const resolvedMode = options?.mode || '';
        const normalizedOptions = Array.isArray(options?.options) ? options.options : [];
        const effectiveYearLevel = options?.yearLevel ?? fallbackYearLevel;

        if (!effectiveYearLevel) {
          alert('Year information is missing. Please contact admin.');
          navigate('/student/dashboard');
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
      } catch (error: any) {
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
        setStudent((prev: any) => prev || parsedStudent);
        setFoundationOptions([]);
        setMajorClassOptions([]);
        alert(formatApiError(error, t('failed_to_load_enrollment_setting'), t));
      }
    };

    loadCurrentTermAndOptions();
  }, [navigate, t]);

  const getSection = (name: string) =>
    foundationOptions.find((s) => String(s?.section || '').toUpperCase() === String(name || '').toUpperCase());

  const handleClassSelect = (className: string) => {
    const section = getSection(className);
    if (section?.isLocked) {
      alert(t('locked'));
      return;
    }
    if (section && section.remaining <= 0) {
      alert(t('FULL'));
      return;
    }
    setSelectedSection(className);
  };

  const handleEnroll = async () => {
    if (mode === 'FOUNDATION_SECTION' && !selectedSection) {
      alert(t('Please select a section.'));
      return;
    }
    if (mode === 'MAJOR_CLASS' && !selectedMajorClassId) {
      alert(t('Please select a major class.'));
      return;
    }
    if (!mode) {
      alert(t('Enrollment mode is unavailable. Please refresh.'));
      return;
    }

    const selectedMajor = majorClassOptions.find(
      (item) => String(item?.majorClassId || item?.courseId || '') === String(selectedMajorClassId || '')
    );
    const confirmLabel = mode === 'FOUNDATION_SECTION'
      ? `Section ${selectedSection}`
      : (selectedMajor?.label || selectedMajor?.courseName || 'Selected Major');

    const isConfirmed = window.confirm(t('Are you sure you want to enroll in {{label}}?', { label: confirmLabel }));
    if (!isConfirmed) return;

    setLoading(true);
    try {
      let resolvedStudent = student;
      let studentId = resolvedStudent?.studentid || resolvedStudent?.id || null;
      if (!studentId && resolvedStudent?.email) {
        const candidates = await api.getStudents(resolvedStudent.email, "spring");
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
      const payload: any = {
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

      alert(t('Enrollment completed successfully.'));
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Enrollment error:', error);
      alert(t('Enrollment failed: {{error}}', { error: formatApiError(error, t('Try Again'), t) }));
    } finally {
      setLoading(false);
    }
  };

  if (!student) {
    return (
      <div className="loading animate-in fade-in duration-700">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-500/30 border-t-teal-600 rounded-full animate-spin" />
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t('Initializing Portal...')}</p>
        </div>
      </div>
    );
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
    ? t('Foundation Section')
    : mode === 'MAJOR_CLASS'
      ? t('Major Class')
       : t('Awaiting System Sync...');

  return (
    <div className="enrollment-container animate-in fade-in duration-1000">
      <header className="enrollment-header">
        <div className="header-inner">
          <div className="logo-section">
                  <h1 className="tracking-tight">{t('Course Enrollment')}</h1>
            <p className="text-slate-400 font-medium">
              {currentTerm?.academicYear && currentTerm?.semester
                 ? `${currentTerm.academicYear} • ${t('Semester')} ${currentTerm.semester}`
                 : t('Registration Gateway')}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:block text-right">
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-1">{t('Enrollment')}</span>
              <span className="text-sm font-black text-teal-600 uppercase tracking-tighter">{modeLabel}</span>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="enrollment-content animate-in slide-in-from-bottom-4 duration-1000">
        <section className="major-class-panel group relative overflow-hidden">
          {/* UniPortal Signature Accent */}
          <div className="absolute top-0 right-0 h-32 w-32 bg-teal-500/5 rounded-bl-full transform translate-x-8 -translate-y-8 transition-transform group-hover:scale-110" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600 shadow-sm border border-teal-100/50">
                <span className="material-icons-outlined text-2xl">architecture</span>
              </div>
              <div>
                 <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{t('Configuration Selection')}</h2>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('Select your academic placement')}</p>
              </div>
            </div>

            {mode === 'FOUNDATION_SECTION' ? (
              <div className="space-y-8">
                <div className="major-class-field">
                     <label htmlFor="foundation-section-select">{t('Available Foundation Sections')}</label>
                  <select
                    id="foundation-section-select"
                    value={selectedSection}
                    onChange={(event) => handleClassSelect(event.target.value)}
                    className="hover:border-teal-500/30 transition-all"
                  >
                     <option value="">{t('Choose a section...')}</option>
                    {classes.map((classItem) => {
                      const disabled = classItem.isLocked || classItem.remaining <= 0;
                      return (
                        <option key={classItem.name} value={classItem.name} disabled={disabled}>
                          {`Section ${classItem.name} (${classItem.currentEnrolled}/${classItem.maxCapacity} ${t('Enrolled')})`}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="major-class-preview animate-in fade-in slide-in-from-left-2 duration-500">
                  {classes.length === 0 ? (
                    <div className="flex items-center gap-3 text-slate-400 italic py-4">
                       <span className="material-icons-outlined">info</span>
                         <p className="text-sm font-medium">{t('No sections are configured for this term cycle.')}</p>
                    </div>
                  ) : selectedFoundation ? (
                    <div className="space-y-1">
                        <p><strong>{t('Section Identifier')}</strong> <span className="font-black text-teal-600">{selectedFoundation.name}</span></p>
                        <p><strong>{t('Academic Level')}</strong> <span className="font-black">{resolvedYearLevel || student?.currentyear || student?.currentYear || '-'}</span></p>
                        <p><strong>{t('Utilization')}</strong> <span className="font-black">{selectedFoundation.currentEnrolled} / {selectedFoundation.maxCapacity}</span></p>
                        <p><strong>{t('Available Slots')}</strong> <span className="font-black text-teal-600">{selectedFoundation.remaining}</span></p>
                        <p><strong>{t('Placement Status')}</strong> <span className={`font-black ${selectedFoundation.isLocked ? 'text-rose-500' : 'text-emerald-500'}`}>{selectedFoundation.isLocked ? t('locked') : selectedFoundation.remaining <= 0 ? 'FULL' : t('Open')}</span></p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-slate-400 italic py-4">
                       <span className="material-icons-outlined">touch_app</span>
                       <p className="text-sm font-medium">{t('Select a placement from the dropdown above.')}</p>

                    </div>
                  )}
                </div>
              </div>
            ) : mode === 'MAJOR_CLASS' ? (
              <div className="space-y-8">
                <div className="major-class-field">
                   <label htmlFor="major-class-select">{t('Available Major Specializations')}</label>
                  <select
                    id="major-class-select"
                    value={selectedMajorClassId}
                    onChange={(event) => setSelectedMajorClassId(event.target.value)}
                    className="hover:border-teal-500/30 transition-all"
                  >
                     <option value="">{t('Choose a specialization...')}</option>
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

                <div className="major-class-preview animate-in fade-in slide-in-from-left-2 duration-500">
                  {selectedMajor ? (
                    <div className="space-y-1">
                        <p><strong>{t('Assigned Section')}</strong> <span className="font-black text-teal-600">{selectedMajor.sectionCode || '-'}</span></p>
                        <p><strong>{t('Curriculum Code')}</strong> <span className="font-black">{selectedMajor.courseCode || '-'}</span></p>
                        <p><strong>{t('Designation')}</strong> <span className="font-black">{selectedMajor.courseName || '-'}</span></p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-slate-400 italic py-4">
                       <span className="material-icons-outlined">touch_app</span>
                        <p className="text-sm font-medium">{t('Choose a specialization to view parameters.')}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-slate-300">
                <div className="w-12 h-12 border-2 border-slate-100 border-t-slate-200 rounded-full animate-spin mb-4" />
                 <p className="text-[10px] font-black uppercase tracking-widest">{t('Awaiting System Sync...')}</p>
              </div>
            )}
          </div>
        </section>

        <footer className="enrollment-actions">
          <button className="btn btn-back active:scale-95" onClick={() => navigate('/student/dashboard')}>
            <span className="material-icons-outlined text-sm">west</span>
             {t('Cancel')}
          </button>
          <button
            className="btn btn-enroll active:scale-95 transition-all shadow-emerald-500/10"
            onClick={handleEnroll}
            disabled={
              loading
              || (mode === 'FOUNDATION_SECTION' && !selectedSection)
              || (mode === 'MAJOR_CLASS' && !selectedMajorClassId)
            }
          >
            {loading
               ? t('Processing Transaction...')
               : (
                 <>
                   {mode === 'FOUNDATION_SECTION' 
                     ? t('Enroll Section {{section}}', { section: selectedSection || '...' }) 
                     : t('Enroll Major Class')}
                  <span className="material-icons-outlined text-sm">check_circle</span>
                </>
              )}
          </button>
        </footer>
      </main>
    </div>
  );
}

export default EnrollmentBlank;
