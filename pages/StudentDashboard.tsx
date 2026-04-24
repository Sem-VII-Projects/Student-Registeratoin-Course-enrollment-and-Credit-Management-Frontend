import React, { useEffect, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { User, StudentAlert } from '../types';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const StudentDashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<StudentAlert[]>([]);
  const [majorState, setMajorState] = useState<{ program_type?: string; selected_track?: string; selected_major?: string; status?: string; profile_major_id?: string; profile_major_track?: string; current_year?: string; current_semester?: string } | null>(null);
  const [eligibility, setEligibility] = useState<any | null>(null);
  const [startLoading, setStartLoading] = useState(false);
  const [gpa, setGpa] = useState<number | null>(null);
  const [currentCredits, setCurrentCredits] = useState<number | null>(null);
  type DegreeAuditResponse = {
    core_credits: { earned: number; required: number };
    elective_credits: { earned: number; required: number };
    major_specific: { earned: number; required: number };
    progress_bars?: Array<{ label: string; percentage: number; completed: number; total: number }>;
  };
  const [degreeAudit, setDegreeAudit] = useState<DegreeAuditResponse | null>(null);
  const [recent, setRecent] = useState<Array<{ id?: string, title: string; sub?: string; when: Date; icon: string; color: string }>>([]);
  const [maxCredits, setMaxCredits] = useState<number | null>(null);
  const auditCardRef = useRef<HTMLDivElement | null>(null);
  const [auditCardHeight, setAuditCardHeight] = useState<number | null>(null);

  useEffect(() => {
    // Fetch alerts on mount
    api.studentAlerts()
      .then((data) => {
        if (Array.isArray(data)) setAlerts(data);
      })
      .catch((err) => console.error("Failed to fetch alerts", err));
    api.studentAnnouncements()
      .then((anns) => {
        try {
          const annItems = (anns || []).slice(0, 10).map((a: any) => ({
            id: a._id || a.id || "",
            title: a.title || t("Announcement"),
            sub: (a.content || "").slice(0, 80),
            when: new Date(a.date_posted || a.created_at || Date.now()),
            icon: "campaign",
            color: "bg-teal-100 text-teal-600",
          }));
          const alertItems = (Array.isArray(alerts) ? alerts : []).slice(0, 10).map((al: any) => ({
            id: al._id || al.id || "",
            title: t("New Alert"),
            sub: al.message || "",
            when: new Date(al.created_at || Date.now()),
            icon: "notifications",
            color: "bg-amber-100 text-amber-600",
          }));
          const merged = [...annItems, ...alertItems].sort((a, b) => b.when.getTime() - a.when.getTime()).slice(0, 10);
          setRecent(merged);
        } catch {
          setRecent([]);
        }
      })
      .catch(() => setRecent([]));
    api.studentMajorState()
      .then((st) => setMajorState(st))
      .catch(() => setMajorState(null));
    api.studentMajorEligibility()
      .then((el) => setEligibility(el))
      .catch(() => setEligibility(null));
    api.studentDashboardSummary()
      .then((sum) => {
        console.log("Dashboard Summary API Response:", sum);
        if (sum && typeof sum.gpa === "number") {
          console.log("Setting GPA to:", sum.gpa);
          setGpa(sum.gpa);
        } else {
          console.log("Invalid GPA response:", sum);
          setGpa(null);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch dashboard summary:", err);
        setGpa(null);
      });
    api.studentDegreeAudit()
      .then((audit) => setDegreeAudit(audit))
      .catch(() => setDegreeAudit(null));
    api.currentStudentCourses()
      .then((resp) => {
        if (resp && typeof resp.total_credits === "number") setCurrentCredits(resp.total_credits);
      })
      .catch(() => {});
    api.studentEnrollmentSettingCurrent()
      .then((setting) => {
        if (setting && typeof setting.max_credits === "number") {
          setMaxCredits(setting.max_credits);
          try { localStorage.setItem("max_credits", String(setting.max_credits)); } catch {}
        } else {
          const cached = Number(localStorage.getItem("max_credits") || "");
          if (!Number.isNaN(cached) && cached > 0) setMaxCredits(cached);
        }
      })
      .catch(() => {
        const cached = Number(localStorage.getItem("max_credits") || "");
        if (!Number.isNaN(cached) && cached > 0) setMaxCredits(cached);
      });
  }, [t]); 

  useEffect(() => {
    const node = auditCardRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const syncHeight = () => {
      setAuditCardHeight(Math.round(node.getBoundingClientRect().height));
    };

    syncHeight();
    const observer = new ResizeObserver(() => syncHeight());
    observer.observe(node);
    window.addEventListener("resize", syncHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncHeight);
    };
  }, [degreeAudit]);

  const handleDismissAlert = async (id: string) => {
    try {
      await api.studentDeleteAlert(id);
      setAlerts((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      console.error("Failed to dismiss alert", err);
    }
  };

  const navigate = useNavigate();
  const startMajorProcess = async () => {
    setStartLoading(true);
    try {
      navigate("/student/progress/current");
    } finally {
      setStartLoading(false);
    }
  };
  const isEarlyYears = (eligibility?.current_year_num ?? 99) <= 2;
  const isLockedPhase =
    eligibility?.program_type === "5-year" &&
    ((eligibility?.current_year_num === 4 && eligibility?.current_semester_num === 2) ||
      eligibility?.current_year_num === 5);
  const recordedTrack = majorState?.selected_track || majorState?.profile_major_track || "-";
  const recordedMajor = majorState?.selected_major || majorState?.profile_major_id || "-";
  const showRecordedSummary =
    eligibility &&
    !eligibility.can_select_major &&
    !(majorState?.program_type === "5-year" &&
      majorState?.current_year === "Fourth Year" &&
      majorState?.current_semester === "First Semester");
  const majorStatusLabel = majorState?.status?.replace(/_/g, " ") || t("Unavailable");
  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-slate-950 font-poppins relative">
      {/* Toast Container */}
      <div className="fixed top-24 right-8 z-50 flex flex-col gap-4 max-w-sm w-full">
        {alerts.map((alert) => (
          <div 
            key={alert._id} 
            className="flex items-start gap-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 px-6 py-5 shadow-xl border border-amber-100 dark:border-amber-900/30 transition-all animate-in slide-in-from-right-10 duration-500"
          >
            <span className="material-icons-outlined text-amber-500 mt-0.5">warning</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900 dark:text-amber-200 leading-relaxed">
                {alert.message}
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-500/70 mt-3">
                {new Date(alert.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </p>
            </div>
            <button 
              onClick={() => handleDismissAlert(alert._id)}
              className="text-amber-400 hover:text-amber-600 transition-colors p-1"
            >
              <span className="material-icons-outlined text-sm">close</span>
            </button>
          </div>
        ))}
      </div>

      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={t("Dashboard Overview")} user={user} />
        <main className="flex-1 overflow-y-auto p-8 lg:p-12 relative animate-in fade-in duration-700 slide-in-from-bottom-4 scrollbar-hide">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-8">
            <div className="min-w-0 space-y-2">
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">{t("Welcome back")}, {user?.name?.split(' ')?.[0] || 'Student'}!</h2>
              <p className="text-lg font-medium text-slate-400 dark:text-slate-500">{t("Your academic trajectory is looking healthy. Here's the briefing.")}</p>
            </div>
            <div className="w-full md:w-auto bg-slate-50/50 dark:bg-slate-900/50 px-6 py-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-3 shrink-0">
              <span className="material-icons-round text-teal-600 text-base">calendar_today</span>
              <span className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">{t("Fall '24 • Week 08")}</span>
            </div>
          </div>

          <div className="mb-12 grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
            <div className="flex h-full flex-col gap-8 lg:col-span-5">
            <div className="bg-white dark:bg-slate-900 p-7 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden flex-1">
              <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/5 rounded-bl-full transform translate-x-4 -translate-y-4 transition-transform group-hover:scale-110" />
              <div className="flex justify-between items-start mb-5 relative z-10">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t("Enrollment Status")}</p>
                  <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{t("Active")}</h3>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50">
                  <span className="material-icons-round text-2xl">verified</span>
                </div>
              </div>
              <div className="relative z-10 mt-6 grid grid-cols-[auto_minmax(0,1fr)] items-end gap-6">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t("Current load")}</p>
                  <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                    {currentCredits !== null ? currentCredits : "-"}
                    <span className="ml-2 text-sm font-bold text-slate-400 dark:text-slate-500">{t("credits")}</span>
                  </p>
                </div>
                <div className="min-w-0">
                  <div className="w-full bg-slate-50 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-700"
                      style={{
                        width: (() => {
                          const cached = Number(localStorage.getItem("max_credits") || "");
                          const fallback = !Number.isNaN(cached) && cached > 0 ? cached : 24;
                          const maxC = (maxCredits ?? fallback);
                          const cur = currentCredits ?? 0;
                          const pct = maxC > 0 ? Math.max(0, Math.min(100, (cur / maxC) * 100)) : 0;
                          return `${pct}%`;
                        })(),
                      }}
                    />
                  </div>
                  <p className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                    {t("Full-time Matrix")}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-7 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden flex-1">
              <div className="absolute top-0 right-0 h-24 w-24 bg-blue-500/5 rounded-bl-full transform translate-x-4 -translate-y-4 transition-transform group-hover:scale-110" />
              <div className="flex justify-between items-start mb-5 relative z-10">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t("Academic Index")}</p>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{gpa !== null ? gpa.toFixed(2) : ""} <span className="ml-1 text-lg font-bold text-slate-300 dark:text-slate-600">/ 4.0</span></h3>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50">
                  <span className="material-icons-round text-2xl">analytics</span>
                </div>
              </div>
              <div className="relative z-10 mt-6 grid grid-cols-[auto_minmax(0,1fr)] items-end gap-6">
                <div>
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t("Standing")}</p>
                  <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                    {gpa !== null && gpa >= 3 ? t("Excellent") : gpa !== null && gpa >= 2 ? t("On Track") : t("Building")}
                  </p>
                </div>
                <div className="justify-self-start inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                  <span className="material-icons-round text-sm">trending_up</span>
                  <span className="text-[10px] font-black uppercase tracking-widest">{t("Optimizing Performance")}</span>
                </div>
              </div>
            </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-7 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm flex min-h-[240px] h-full flex-col group cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 lg:col-span-7 relative overflow-hidden">
               <div className="absolute top-0 right-0 h-24 w-24 bg-indigo-500/5 rounded-bl-full transform translate-x-4 -translate-y-4 transition-transform group-hover:scale-110" />
               <div className="flex items-start justify-between gap-4 mb-4 relative z-10">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">{t("Next Step")}</p>
                  <h3 className="text-2xl font-black mt-2 leading-tight text-gray-800 dark:text-white">
                    {t("Major Selection")}
                    {majorState?.program_type === "5-year" &&
                     majorState?.current_year === "Fourth Year" &&
                     majorState?.current_semester === "First Semester" &&
                     (majorState?.selected_major || majorState?.profile_major_id) ? (
                      <span className="block mt-2 text-sm font-semibold text-gray-500 dark:text-gray-300">
                        {t("Major")}: {majorState?.selected_major || majorState?.profile_major_id}
                      </span>
                    ) : null}
                  </h3>
                  {majorState?.program_type === "5-year" &&
                   majorState?.current_year === "Fourth Year" &&
                   majorState?.current_semester === "First Semester" ? (
                    <div className="mt-2 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                      {t("Major Track")}: {recordedTrack}
                    </div>
                  ) : null}
                  {majorStatusLabel && !majorState?.selected_major && (
                    <div className="mt-3 inline-flex items-center rounded-full border border-indigo-100 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                      {majorStatusLabel}
                    </div>
                  )}
                  {majorState?.program_type === "5-year" &&
                   majorState?.current_year === "Fourth Year" &&
                   majorState?.current_semester === "First Semester" &&
                   majorState?.selected_major ? (
                    <div className="mt-2 text-lg font-bold text-gray-800 dark:text-white">
                      {t("Major")}: {majorState?.selected_major}
                    </div>
                  ) : null}
                </div>
                <div className="shrink-0 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50">
                  <span className="material-icons-round text-2xl">alt_route</span>
                </div>
              </div>
              {(() => {
                if (isEarlyYears) {
                  return (
                    <div className="mt-3 space-y-3 min-w-0">
                      {eligibility && eligibility.reason && (
                        <p className="text-sm leading-5 text-gray-600 dark:text-gray-300">{eligibility.reason}</p>
                      )}
                      <div className="space-y-3">
                        {showRecordedSummary ? (
                          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 p-4 min-w-0">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t("Recorded Track")}</p>
                              <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{recordedTrack}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t("Recorded Major")}</p>
                              <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{recordedMajor}</p>
                            </div>
                          </div>
                        ) : null}
                        <button onClick={startMajorProcess} disabled={startLoading} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-teal-500 disabled:opacity-60">
                          {t("Start Process")} <span className="material-icons-round text-sm">arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  );
                }
                if (!majorState?.selected_major) {
                  if (isLockedPhase) {
                    return (
                      <div className="mt-3 space-y-3 text-sm text-gray-600 dark:text-gray-300 min-w-0">
                        <div className="inline-flex items-center gap-2 rounded-full border border-purple-100 bg-purple-50 px-3 py-1.5 text-[11px] font-bold text-purple-700 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-300">
                          <span className="material-icons-round text-purple-500">lock</span>
                          <span>{t("Major selection not available")}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/40 min-w-0">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t("Selected Major")}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{recordedMajor}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t("Major Track")}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{recordedTrack}</p>
                          </div>
                        </div>
                        <button onClick={startMajorProcess} disabled={startLoading} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white sm:w-auto">
                          {t("Start Process")} <span className="material-icons-round text-sm">arrow_forward</span>
                        </button>
                      </div>
                    );
                  }
                  return (
                    <div className="mt-3 space-y-3 min-w-0">
                      {eligibility && eligibility.reason && (
                        <p className="text-sm leading-5 text-gray-600 dark:text-gray-300">{eligibility.reason}</p>
                      )}
                      <div className="space-y-3">
                        {showRecordedSummary && !isLockedPhase ? (
                          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 p-4 min-w-0">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t("Recorded Track")}</p>
                              <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{recordedTrack}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t("Recorded Major")}</p>
                              <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{recordedMajor}</p>
                            </div>
                          </div>
                        ) : null}
                        <button onClick={startMajorProcess} disabled={startLoading} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-teal-500 disabled:opacity-60">
                          {t("Start Process")} <span className="material-icons-round text-sm">arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="mt-auto space-y-3 text-sm text-gray-600 dark:text-gray-300">
                    <div className="inline-flex items-center rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-teal-700 dark:border-teal-800 dark:bg-teal-900/20 dark:text-teal-300">
                      {majorState?.program_type}
                    </div>
                    {(majorState?.program_type === "5-year" ||
                      (majorState?.program_type === "4-year" &&
                        !(majorState?.current_year === "Third Year" && majorState?.current_semester === "First Semester"))) ? (
                      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/40 sm:grid-cols-2">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t("Major Track")}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{recordedTrack}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t("Selected Major")}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{recordedMajor}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t("Selected Major")}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{recordedMajor}</p>
                      </div>
                    )}
                    <div className="rounded-2xl border border-teal-300 bg-teal-50 p-4 dark:bg-teal-900/20">
                      <div className="flex items-center gap-2">
                        <span className="material-icons-outlined text-teal-600 dark:text-teal-400">school</span>
                        <span className="text-sm font-bold text-[#0d1a1c] dark:text-white">{recordedMajor}</span>
                        {majorState?.program_type === "5-year" ? (
                          <span className="ml-auto inline-flex items-center rounded-full border border-teal-400 px-2 py-0.5 text-[11px] font-semibold text-teal-700 dark:text-teal-300">
                            {t("Track")}: {recordedTrack}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {eligibility?.can_select_major ? (
                      <button onClick={() => navigate("/student/major/select")} className="inline-flex items-center justify-center rounded-2xl border border-teal-200 bg-white px-4 py-3 text-sm font-semibold text-teal-700 transition hover:border-teal-300 hover:bg-teal-50 dark:border-teal-800 dark:bg-slate-900 dark:text-teal-300 dark:hover:bg-teal-950/20">
                        {t("Change Major")}
                      </button>
                    ) : null}
                  </div>
                );
              })()}
              {!majorState?.selected_major && majorState?.selected_track && (
                <div className="relative z-10 mt-3 text-[11px] text-gray-500 dark:text-gray-400">
                  {t("Current Track")}: <span className="font-bold">{majorState.selected_track}</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-8">
              <div ref={auditCardRef} className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:shadow-md">
                <div className="px-8 py-7 border-b border-slate-50 dark:border-slate-800 flex items-center gap-4 bg-slate-50/30 dark:bg-slate-950/20">
                  <div className="h-10 w-10 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-sm">
                    <span className="material-icons-round text-teal-600 text-lg">auto_graph</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{t("Institutional Audit")}</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{t("Degree Completion Progress")}</p>
                  </div>
                </div>
                <div className="p-8 lg:p-9">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                    <div className="flex items-center justify-center relative">
                      <div className="relative w-48 h-48 md:w-56 md:h-56 transform transition-transform duration-1000 hover:scale-105">
                         <svg className="w-full h-full transform -rotate-90" viewBox="0 0 112 112">
                           <circle className="text-gray-100 dark:text-gray-800" cx="56" cy="56" fill="transparent" r="50" stroke="currentColor" strokeWidth="8" />
                           <circle
                             className="text-primary"
                             cx="56"
                             cy="56"
                             fill="transparent"
                             r="50"
                             stroke="currentColor"
                             strokeDasharray="314"
                             strokeDashoffset={(function() {
                               const totalReq = (degreeAudit?.core_credits.required ?? 0)
                                 + (degreeAudit?.elective_credits.required ?? 0)
                                 + (degreeAudit?.major_specific.required ?? 0);
                               const totalEarn = (degreeAudit?.core_credits.earned ?? 0)
                                 + (degreeAudit?.elective_credits.earned ?? 0)
                                 + (degreeAudit?.major_specific.earned ?? 0);
                               const pct = totalReq > 0 ? Math.min(100, Math.max(0, Math.round((totalEarn / totalReq) * 100))) : 0;
                               return 314 - (3.14 * pct);
                             })()}
                             strokeLinecap="round"
                             strokeWidth="8"
                           />
                         </svg>
                         <div className="absolute inset-0 flex flex-col items-center justify-center">
                           <span className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
                             {(function() {
                               const totalReq = (degreeAudit?.core_credits.required ?? 0)
                                 + (degreeAudit?.elective_credits.required ?? 0)
                                 + (degreeAudit?.major_specific.required ?? 0);
                               const totalEarn = (degreeAudit?.core_credits.earned ?? 0)
                                 + (degreeAudit?.elective_credits.earned ?? 0)
                                 + (degreeAudit?.major_specific.earned ?? 0);
                               const pct = totalReq > 0 ? Math.min(100, Math.max(0, Math.round((totalEarn / totalReq) * 100))) : 0;
                               return `${pct}%`;
                             })()}
                           </span>
                           <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">{t("Complete")}</span>
                         </div>
                      </div>
                    </div>
                    <div className="space-y-6">
                      {(degreeAudit?.progress_bars
                        ? degreeAudit.progress_bars.map(pb => ({
                            label: pb.label === 'Core' ? t('Core Requirements')
                              : pb.label === 'Elective' ? t('Electives')
                              : pb.label === 'Major' ? t('Major')
                              : t('Overall'),
                            earned: pb.completed,
                            required: pb.total,
                            percent: pb.percentage,
                            color: pb.label === 'Overall' ? 'bg-indigo-500' : (pb.label === 'Core' ? 'bg-primary' : pb.label === 'Major' ? 'bg-primary' : 'bg-green-500'),
                          }))
                        : [
                            {
                              label: t('Core Requirements'),
                              earned: degreeAudit?.core_credits.earned ?? 0,
                              required: degreeAudit?.core_credits.required ?? 0,
                              color: 'bg-primary',
                            },
                            {
                              label: t('Major Electives'),
                              earned: degreeAudit?.elective_credits.earned ?? 0,
                              required: degreeAudit?.elective_credits.required ?? 0,
                              color: 'bg-primary',
                            },
                            {
                              label: t('General Education'),
                              earned: degreeAudit?.major_specific.earned ?? 0,
                              required: degreeAudit?.major_specific.required ?? 0,
                              color: 'bg-green-500',
                            },
                          ]
                      ).map((item: any, i: number) => (
                        <div key={i}>
                          <div className="flex justify-between text-xs md:text-sm mb-1.5">
                            <span className="font-bold text-gray-600 dark:text-gray-400">{item.label}</span>
                            <span className="font-bold text-gray-900 dark:text-white">
                              {Math.round(item.earned)}/{Math.round(item.required)}
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                            <div
                              className={`${item.color} h-2 rounded-full transition-all duration-500`}
                              style={{
                                width: (() => {
                                  const pct = typeof item.percent === 'number'
                                    ? item.percent
                                    : (item.required > 0 ? Math.min(100, Math.max(0, (item.earned / item.required) * 100)) : 0);
                                  return `${pct}%`;
                                })(),
                              }}
                            ></div>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => navigate("/student/degree-audit")}
                        className="w-full mt-2 py-2.5 text-xs font-bold text-primary border border-primary/20 hover:bg-primary/5 rounded-xl transition-colors uppercase tracking-wide"
                      >
                        {t("View Degree Audit")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-8">
              <div
                className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden transition-all hover:shadow-md"
                style={auditCardHeight ? { height: `${auditCardHeight}px` } : undefined}
              >
                <div className="px-8 py-7 min-h-[104px] border-b border-slate-50 dark:border-slate-800 flex items-center gap-4 bg-slate-50/30 dark:bg-slate-950/20">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-sm text-teal-600">
                      <span className="material-icons-round text-lg">history</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{t("Sync History")}</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{t("Recent Ledger Activity")}</p>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800 overflow-y-auto flex-1 min-h-0">
                  {recent.map((act, i) => (
                    <div 
                      key={i} 
                      onClick={() => navigate(act.title === t("New Alert") ? "/student/announcements" : `/student/announcements#${act.id}`)} 
                      className="p-4 md:p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex gap-4 items-start cursor-pointer"
                    >
                      <div className={`${act.color} dark:bg-opacity-20 rounded-xl h-10 w-10 flex items-center justify-center shrink-0`}>
                        <span className="material-icons-round text-xl">{act.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{act.title}</p>
                        {act.sub ? <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">{act.sub}</p> : null}
                        <p className="text-[10px] text-gray-400 mt-1 uppercase font-extrabold">{new Date(act.when).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <footer className="mt-20 text-center space-y-4 pb-12">
            <div className="h-px w-20 bg-slate-100 dark:bg-slate-800 mx-auto" />
            <p className="text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.4em]">
              {t("Institutional Administrative Framework • 2024")}
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;