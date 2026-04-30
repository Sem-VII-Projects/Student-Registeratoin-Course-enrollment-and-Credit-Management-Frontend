import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/client';

// UI Components to match project style
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/50", className)} />;
}

function IconBadge({ icon, tone = "primary" }: { icon: string, tone?: string }) {
  const tones: any = {
    primary: "bg-teal-100 text-teal-700 dark:bg-teal-900/35 dark:text-teal-300",
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/35 dark:text-amber-300",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-900/35 dark:text-rose-300",
    cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/35 dark:text-cyan-300",
    indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/35 dark:text-indigo-300",
  };
  return (
    <div className={cn("grid h-10 w-10 place-items-center rounded-xl", tones[tone])}>
      <span className="material-icons-outlined text-[20px]">{icon}</span>
    </div>
  );
}

interface Props {
  user?: any;
  onLogout?: () => void;
}

function pick(...values: any[]) {
  return values.find((v) => v !== undefined && v !== null && String(v).trim() !== '');
}

function mapRegistrationToDraft(record: any) {
  if (!record) return null;
  const nestedStudent = record.student || record.studentDto || record.student_data || {};
  return {
    studentid: pick(record.studentid, record.student_id, record.studentId, nestedStudent.studentid, nestedStudent.id),
    registrationid: pick(record.id, record.registrationId, record.registration_id),
    namemm: pick(record.namemm, record.name_mm, record.student_name, record.full_name, nestedStudent.namemm, nestedStudent.name_mm) || 'Unknown',
    student_name: pick(record.student_name, record.studentName, record.full_name, record.fullName, nestedStudent.student_name, nestedStudent.studentName),
    father_name: pick(record.father_name, record.fatherName, nestedStudent.father_name, nestedStudent.fatherName),
    mother_name: pick(record.mother_name, record.motherName, nestedStudent.mother_name, nestedStudent.motherName),
    gender: pick(record.gender, nestedStudent.gender),
    birthplace: pick(record.birthplace, record.place_of_birth, nestedStudent.birthplace, nestedStudent.place_of_birth),
    date_of_birth: pick(record.date_of_birth, record.dateOfBirth, nestedStudent.date_of_birth, nestedStudent.dateOfBirth),
    nrc_number: pick(record.nrc_number, record.nrcNumber, nestedStudent.nrc_number, nestedStudent.nrcNumber),
    email: pick(record.email, record.student_email, nestedStudent.email),
    phone: pick(record.phone, record.phone_number, nestedStudent.phone),
    exam_roll_no: pick(record.exam_roll_no, record.examRollNo, nestedStudent.exam_roll_no, nestedStudent.examRollNo),
    matriculation_rollno: pick(record.matriculation_rollno, record.matriculation_roll_no, nestedStudent.matriculation_rollno, nestedStudent.matriculation_roll_no),
    matriculation_passed_year: pick(
      record.matriculation_passed_year,
      record.matriculationPassedYear,
      record.matriculation_year,
      record.matriculationYear,
      nestedStudent.matriculation_passed_year,
      nestedStudent.matriculationPassedYear,
      nestedStudent.matriculation_year,
      nestedStudent.matriculationYear
    ),
    totalmarks_obtained: pick(record.totalmarks_obtained, record.total_marks_obtained, record.total_marks, nestedStudent.totalmarks_obtained, nestedStudent.total_marks_obtained),
    academicyearentered: pick(record.academicyearentered, record.academic_year_entered, record.academicYearEntered, nestedStudent.academicyearentered, nestedStudent.academic_year_entered),
    division_or_state: pick(record.division_or_state, record.divisionOrState, nestedStudent.division_or_state),
    township: pick(record.township, nestedStudent.township),
    address: pick(record.address, nestedStudent.address),
    status: pick(record.status, nestedStudent.status) || 'DRAFT',
    rejection_reason: pick(record.rejection_reason, record.rejectionReason, nestedStudent.rejection_reason, nestedStudent.rejectionReason),
    createdAt: pick(record.createdAt, record.created_at, nestedStudent.createdAt)
  };
}

function formatDate(raw: any) {
  if (!raw) return '-';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return String(raw);
  return date.toLocaleDateString();
}

const NewStudentDraftDetail: React.FC<Props> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { recordId } = useParams();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<any>(location.state?.draftRecord || null);
  const [admin, setAdmin] = useState<any>(user || null);
  const [isApproving, setIsApproving] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const registrationId = draft?.registrationid || draft?.registrationId || draft?.registration_id || draft?.id;
      if (!registrationId) throw new Error('No registration found');
      await api.adminApproveRegistration(registrationId);
      alert(t('Registration approved successfully'));
      navigate('/admin/dashboard');
    } catch (err:any) {
      console.error(err);
      alert(err.message || t('Approval failed'));
    } finally {
      setIsApproving(false);
    }
  };

  const handleDecline = async () => {
    const reason = prompt(t('Enter rejection reason'));
    if (!reason) return;
    setIsDeclining(true);
    try {
      const registrationId = draft?.registrationid || draft?.registrationId || draft?.registration_id || draft?.id;
      if (!registrationId) throw new Error('No registration found');
      await api.adminRejectRegistration(registrationId, reason);
      alert(t('Registration declined successfully'));
      navigate('/admin/dashboard');
    } catch (err:any) {
      console.error(err);
      alert(err.message || t('Decline failed'));
    } finally {
      setIsDeclining(false);
    }
  };

  const recordType = useMemo(() => (recordId || '').split('_')[0], [recordId]);
  const recordValue = useMemo(() => (recordId || '').split('_').slice(1).join('_'), [recordId]);

  useEffect(() => {
    // Rely on global user state or fallbacks (localStorage/sessionStorage)
    const activeUser = user || JSON.parse(sessionStorage.getItem('user') || 'null') || JSON.parse(localStorage.getItem('adminData') || 'null');
    
    if (!activeUser || (activeUser.role !== 'admin' && !activeUser.adminname)) {
      navigate('/admin-login');
      return;
    }
    setAdmin(activeUser);

    const loadDraft = async () => {
      try {
        let found = location.state?.draftRecord || null;

        if (!found && recordType === 's' && recordValue) {
          const students = await api.getStudents();
          found = students.find((s: any) => String(s.studentid || s.id) === recordValue);
        }

        if (!found && (recordType === 'r' || recordType === 'e')) {
          const registrations = await api.adminListRegistrations();
          const matched = registrations.find((r: any) => {
            if (recordType === 'r') {
              return String(r.id || r.registrationId || r.registration_id) === recordValue;
            }
            const emailValue = decodeURIComponent(recordValue || '').toLowerCase();
            return String(r.email || r.student_email || '').toLowerCase() === emailValue;
          });
          found = mapRegistrationToDraft(matched);
        }

        if (found) {
          const currentYear = pick(
            found.matriculation_passed_year,
            found.matriculationPassedYear,
            found.matriculation_year,
            found.matriculationYear
          );
          const studentId = pick(found.studentid, found.student_id, found.studentId, found.id);
          if (!currentYear && studentId) {
            try {
              const registrations = await api.listRegistrations(studentId);
              if (Array.isArray(registrations) && registrations.length > 0) {
                const latest = [...registrations].sort((a, b) => {
                  const aTime = new Date(a?.submittedAt || a?.submitted_at || a?.createdAt || a?.created_at || 0).getTime() || 0;
                  const bTime = new Date(b?.submittedAt || b?.submitted_at || b?.createdAt || b?.created_at || 0).getTime() || 0;
                  return bTime - aTime;
                })[0];
                const registrationDraft = mapRegistrationToDraft(latest);
                found = {
                  ...registrationDraft,
                  ...found,
                  registrationid: pick(
                    found.registrationid,
                    found.registrationId,
                    found.registration_id,
                    registrationDraft?.registrationid
                  ),
                  exam_roll_no: pick(
                    found.exam_roll_no,
                    found.examRollNo,
                    found.entrance_roll_no,
                    found.entranceRollNo,
                    registrationDraft?.exam_roll_no
                  ),
                  matriculation_rollno: pick(
                    found.matriculation_rollno,
                    found.matriculation_roll_no,
                    found.matriculationRollNo,
                    registrationDraft?.matriculation_rollno
                  ),
                  matriculation_passed_year: pick(
                    found.matriculation_passed_year,
                    found.matriculationPassedYear,
                    found.matriculation_year,
                    found.matriculationYear,
                    registrationDraft?.matriculation_passed_year
                  ),
                  totalmarks_obtained: pick(
                    found.totalmarks_obtained,
                    found.total_marks_obtained,
                    found.totalMarksObtained,
                    registrationDraft?.totalmarks_obtained
                  )
                };
              }
            } catch (_) {
              // Best-effort fallback only.
            }
          }
        }

        setDraft(found);
      } catch (error) {
        setDraft(null);
      } finally {
        setLoading(false);
      }
    };

    loadDraft();
  }, [location.state, navigate, recordType, recordValue, user]);

  const sidebarLinks = [
    { key: 'overview', label: 'Overview', icon: 'dashboard', section: null },
    { key: 'new', label: 'New Registrations', icon: 'group_add', section: 'Student Management' },
    { key: 'details', label: 'Details Review', icon: 'fact_check', section: null },
    { key: 'payment', label: 'Payment Desk', icon: 'payments', section: null },
    { key: 'enrolled', label: 'Enrolled List', icon: 'school', section: 'Academic' },
    { key: 'all', label: 'Full Directory', icon: 'groups', section: null },
    { key: 'composer', label: 'Form Designer', icon: 'settings_applications', section: 'System' },
    { key: 'class-sections', label: 'Section Config', icon: 'grid_view', section: null },
  ];

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-white dark:bg-slate-950 font-black text-teal-600 uppercase tracking-widest text-xs animate-pulse">{t('Loading Draft Context...')}</div>;
  }

  if (!draft || !admin) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-slate-950 p-10">
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-2xl text-center max-w-lg">
          <IconBadge icon="error_outline" tone="rose" />
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-6 uppercase tracking-tight">{t('Record Desynchronized')}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">{t('This registration record could not be retrieved from the central database.')}</p>
          <button 
            className="mt-8 inline-flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:shadow-xl active:scale-95 transition-all"
            onClick={() => navigate('/admin/dashboard')}
          >
            {t('Return to Dashboard')}
          </button>
        </div>
      </div>
    );
  }

  const DataField = ({ label, value }: { label: string, value: any }) => (
    <div className="flex flex-col gap-1 py-1">
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{label}</span>
      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{value || '-'}</span>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-white dark:bg-slate-950 overflow-hidden font-roboto transition-colors duration-500">
      {/* SIDEBAR - Mirrored from AdminDashboard_Friend */}
      <aside className="w-72 flex flex-col border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 transition-all shrink-0 hidden lg:flex">
        <div className="h-20 flex items-center px-8">
            <span className="text-2xl font-black tracking-tighter text-teal-600">
                Uni<span className="text-slate-900 dark:text-white font-black">Admin</span>
            </span>
        </div>
        <nav className="flex-1 px-4 py-8 space-y-1.5 overflow-y-auto scrollbar-hide">
            {sidebarLinks.map((link, idx) => (
                <React.Fragment key={idx}>
                    {link.section && (
                        <div className="pt-8 pb-3 px-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{t(link.section)}</p>
                        </div>
                    )}
                    <button
                        onClick={() => navigate('/admin/dashboard')}
                        className={cn(
                            "w-full group flex items-center rounded-2xl px-4 py-3 transition-all duration-300",
                            "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
                        )}
                    >
                        <span className="material-icons-outlined text-[22px] mr-4 transition-transform group-hover:scale-110 duration-300">{link.icon}</span>
                        <span className="text-sm font-bold tracking-tight">{t(link.label)}</span>
                    </button>
                </React.Fragment>
            ))}
        </nav>
        <div className="p-6">
            <div className="rounded-[32px] bg-slate-50 dark:bg-slate-900/50 p-5 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center mb-6 px-1">
                    <div className="relative group shrink-0">
                        <div className="h-11 w-11 rounded-2xl bg-teal-600 flex items-center justify-center text-white font-black shadow-sm transition-transform duration-500 group-hover:scale-105 uppercase">{admin.adminname?.charAt(0)}</div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                    </div>
                    <div className="ml-4 overflow-hidden">
                        <p className="text-sm font-black text-slate-900 dark:text-white truncate tracking-tight uppercase">{admin.adminname}</p>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate">{t('System Admin')}</p>
                    </div>
                </div>
                <button onClick={() => navigate('/')} className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-100 dark:border-slate-800 transition-all text-xs font-black uppercase tracking-widest shadow-sm active:scale-[0.98]">
                    <span className="material-icons-round text-sm">logout</span>
                    <span>{t('Sign Out')}</span>
                </button>
            </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* HEADER */}
        <header className="flex h-20 items-center justify-between border-b border-slate-100 bg-white/80 px-6 md:px-10 dark:border-slate-800 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
            <div className="flex flex-col">
                <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase tracking-widest text-[11px] opacity-40 mb-0.5">{t('NAVIGATION CONTEXT')}</h1>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 capitalize">{t('Registration Audit')} • {draft.namemm}</p>
            </div>
            <div className="flex items-center gap-6">
                <button 
                  onClick={() => navigate('/admin/dashboard')}
                  className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:shadow-xl active:scale-95 transition-all"
                >
                    <span className="material-icons-outlined text-sm">arrow_back</span>
                    <span>{t('Back to Portal')}</span>
                </button>
            </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
            <div className="px-6 md:px-10 py-10 space-y-10 animate-in fade-in duration-1000 slide-in-from-bottom-4 max-w-full">
                
                {/* HERO SECTION */}
                <section className="flex flex-col md:flex-row md:items-end justify-between gap-8 bg-slate-50 dark:bg-slate-900/50 p-10 rounded-[48px] border border-slate-100 dark:border-slate-800 relative group overflow-hidden">
                    <div className="relative z-10 flex-1">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-16 w-16 rounded-[24px] bg-white dark:bg-slate-950 flex items-center justify-center text-teal-600 border border-slate-100 dark:border-slate-800 shadow-xl shadow-teal-500/5 transition-transform duration-700 group-hover:rotate-12">
                                <span className="material-icons-outlined text-3xl">person_search</span>
                            </div>
                            <span className="px-4 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 text-[10px] font-black uppercase tracking-widest border border-amber-100 dark:border-amber-800">{String(draft.status || 'DRAFT').toUpperCase()}</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight mb-6">{pick(draft.student_name, draft.namemm) || 'Unknown Student'}</h2>
                        <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mb-4">{t('Record ID: ')}{recordId} • {t('Submitted ')}{formatDate(draft.createdAt)}</p>
                        
                        {draft.rejection_reason && (
                          <div className="mt-4 p-5 rounded-3xl bg-amber-500/10 border border-amber-200 dark:border-amber-900/30">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="material-icons-outlined text-amber-600 text-sm">warning_amber</span>
                              <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{t('Rejection Reason')}</span>
                            </div>
                            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">{draft.rejection_reason}</p>
                          </div>
                        )}
                    </div>
                    
                    <div className="flex gap-4 relative z-10">
                        <button
                          className={cn(
                            "h-14 px-8 bg-teal-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-teal-500/20 transition-all",
                            isApproving
                              ? "opacity-60 cursor-not-allowed bg-teal-600/80" 
                              : "hover:bg-teal-700 active:scale-95"
                          )}
                          onClick={handleApprove}
                          disabled={isApproving}
                          aria-disabled={isApproving}
                        >
                          {isApproving ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              {t('Approving...')}
                            </span>
                          ) : (
                            t('Approve Entry')
                          )}
                        </button>
                        <button
                          className={cn(
                            "h-14 px-8 bg-white dark:bg-slate-950 text-rose-600 border border-rose-100 dark:border-rose-900/30 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                            isDeclining
                              ? "opacity-60 cursor-not-allowed bg-rose-50/50 dark:bg-rose-900/20" 
                              : "hover:bg-rose-50 dark:hover:bg-rose-900/30 active:scale-95"
                          )}
                          onClick={handleDecline}
                          disabled={isDeclining}
                          aria-disabled={isDeclining}
                        >
                          {isDeclining ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="w-3 h-3 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                              {t('Declining...')}
                            </span>
                          ) : (
                            t('Decline')
                          )}
                        </button>
                    </div>

                    <div className="absolute top-0 right-0 h-64 w-64 bg-teal-500/5 rounded-bl-full transform translate-x-10 -translate-y-10 transition-transform group-hover:scale-110" />
                </section>

                {/* DATA GRID */}
                <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-full">
                    
                    {/* CORE IDENTITY */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden">
                        <div className="flex items-center gap-4 mb-8">
                            <IconBadge icon="badge" tone="primary" />
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{t('Core Identity')}</h3>
                        </div>
                        <div className="space-y-6">
                            <DataField label={t('Student Name (EN)')} value={pick(draft.student_name, draft.nameen)} />
                            <DataField label={t('Student Name (MM)')} value={draft.namemm} />
                            <div className="grid grid-cols-2 gap-4">
                                <DataField label={t('Gender')} value={t(draft.gender)} />
                                <DataField label={t('Birth Date')} value={formatDate(draft.date_of_birth)} />
                            </div>
                            <DataField label={t('NRC Number')} value={draft.nrc_number} />
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50 dark:border-slate-800/50">
                                <DataField label={t('Father Name')} value={draft.father_name} />
                                <DataField label={t('Mother Name')} value={draft.mother_name} />
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 h-24 w-24 bg-teal-500/5 rounded-bl-full transform translate-x-4 -translate-y-4 transition-transform group-hover:scale-110" />
                    </div>

                    {/* COMMUNICATION */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden">
                        <div className="flex items-center gap-4 mb-8">
                            <IconBadge icon="alternate_email" tone="indigo" />
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{t('Communication Hub')}</h3>
                        </div>
                        <div className="space-y-6">
                            <DataField label={t('Primary Email')} value={draft.email} />
                            <DataField label={t('Phone Contact')} value={draft.phone} />
                            <DataField label={t('Birthplace Origin')} value={draft.birthplace} />
                            <DataField label={t('Residential Address')} value={draft.address} />
                        </div>
                        <div className="absolute top-0 right-0 h-24 w-24 bg-indigo-500/5 rounded-bl-full transform translate-x-4 -translate-y-4 transition-transform group-hover:scale-110" />
                    </div>

                    {/* ACADEMIC HISTORY */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden">
                        <div className="flex items-center gap-4 mb-8">
                            <IconBadge icon="history_edu" tone="cyan" />
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{t('Academic Credentials')}</h3>
                        </div>
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <DataField label={t('Entrance Roll')} value={draft.exam_roll_no} />
                                <DataField label={t('Matric Roll')} value={draft.matriculation_rollno} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <DataField label={t('Passed Year')} value={draft.matriculation_passed_year} />
                                <DataField label={t('Total Marks')} value={draft.totalmarks_obtained} />
                            </div>
                            <DataField label={t('Academic Year Entered')} value={draft.academicyearentered} />
                            <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-relaxed">{t('System Note')}</p>
                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">{t('Values shown are extracted from the original registration draft payload.')}</p>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 h-24 w-24 bg-cyan-500/5 rounded-bl-full transform translate-x-4 -translate-y-4 transition-transform group-hover:scale-110" />
                    </div>

                </section>
            </div>
        </main>
      </div>
    </div>
  );
}

export default NewStudentDraftDetail;
