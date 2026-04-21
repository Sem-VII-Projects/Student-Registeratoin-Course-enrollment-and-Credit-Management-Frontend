import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { User } from "../types";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

type AdminStatisticsResponse = {
  totalStudents: number;
  graduatedCount: number;
  retakeRequirement: number;
  averageGPA: number;
};

type AdminMajorDistributionItem = {
  major: string;
  count: number;
};

type PendingDoc = Record<string, any>;

type AdminPendingActionsResponse = {
  majorChanges?: PendingDoc[] | { count: number }; // still supported by backend, but hidden in UI
  scheduleConflicts?: PendingDoc[] | { count: number };

  //  new backend shape
  mustResetPasswords?: PendingDoc[] | { count: number };
  mustResetPasswordCount?: number;
};

type HealthState = "online" | "degraded" | "offline" | "unknown";
type SessionState = "active" | "expired" | "unknown";

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

function formatNumber(n: any) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return new Intl.NumberFormat().format(num);
}

function formatCompact(n: any) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return new Intl.NumberFormat(undefined, { notation: "compact" }).format(num);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getCount(v: any): number {
  if (!v) return 0;
  if (Array.isArray(v)) return v.length;
  if (typeof v === "object" && typeof v.count === "number") return v.count;
  return 0;
}

function timeAgo(ts?: string | number) {
  if (!ts) return "—";
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
  const t = d.getTime();
  if (!Number.isFinite(t)) return "—";
  const diff = Date.now() - t;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

function detectHttpStatus(err: any): number | null {
  const direct = err?.status;
  if (typeof direct === "number") return direct;

  const nested = err?.response?.status;
  if (typeof nested === "number") return nested;

  const msg = String(err?.message || "");
  const m = msg.match(/\b(401|403|404|500|502|503)\b/);
  if (m) return Number(m[1]);

  return null;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/50", className)} />;
}

function IconBadge({
  icon,
  tone = "primary",
}: {
  icon: string;
  tone?: "primary" | "emerald" | "amber" | "rose" | "cyan" | "indigo";
}) {
  const tones: Record<string, string> = {
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

function Pill({
  children,
  tone = "gray",
}: {
  children: React.ReactNode;
  tone?: "gray" | "green" | "amber" | "rose" | "cyan";
}) {
  const tones: Record<string, string> = {
    gray: "bg-gray-100 text-gray-700 dark:bg-slate-700/40 dark:text-slate-200",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-200",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/35 dark:text-amber-200",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-900/35 dark:text-rose-200",
    cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/35 dark:text-cyan-200",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone])}>
      {children}
    </span>
  );
}

function StatusBadge({
  kind,
  status,
}: {
  kind: "Schedule Pending" | "Password Reset";
  status: string;
}) {
  const tone = kind === "Schedule Pending" ? "rose" : "cyan";

  const cls =
    tone === "rose"
      ? "bg-rose-100 text-rose-700 dark:bg-rose-900/35 dark:text-rose-200"
      : "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/35 dark:text-cyan-200";

  return (
    <span className={cn("inline-flex rounded-full px-2 py-1 text-[11px] font-extrabold", cls)}>
      {status}
    </span>
  );
}

/**
 * CSS conic-gradient donut (no libs)
 */
function Donut({
  segments,
  centerTop,
  centerBottom,
}: {
  segments: { label: string; value: number; color: string }[];
  centerTop: string;
  centerBottom: string;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  let start = 0;

  const stops = segments
    .map((s) => {
      const pct = (s.value / total) * 100;
      const from = start;
      const to = start + pct;
      start = to;
      return `${s.color} ${from.toFixed(2)}% ${to.toFixed(2)}%`;
    })
    .join(", ");

  return (
    <div className="relative grid place-items-center">
      <div className="h-44 w-44 rounded-full" style={{ background: `conic-gradient(${stops})` }} />
      <div className="absolute grid h-28 w-28 place-items-center rounded-full border border-border-light bg-surface-light shadow-sm dark:border-border-dark dark:bg-surface-dark">
        <div className="text-center">
          <div className="text-xl font-extrabold text-gray-900 dark:text-white">{centerTop}</div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{centerBottom}</div>
        </div>
      </div>
    </div>
  );
}

function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-border-light bg-white shadow-2xl dark:border-border-dark dark:bg-surface-dark">
          <div className="flex items-start justify-between gap-4 border-b border-border-light px-5 py-4 dark:border-border-dark">
            <div className="min-w-0">
              <div className="text-lg font-extrabold text-gray-900 dark:text-white">{title}</div>
              {subtitle ? <div className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{subtitle}</div> : null}
            </div>
            <button
              onClick={onClose}
              className="rounded-xl border border-border-light bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:border-border-dark dark:bg-slate-900/40 dark:text-white dark:hover:bg-slate-900/60"
            >
              <span className="material-icons-outlined text-[18px]">close</span>
            </button>
          </div>
          <div className="max-h-[74vh] overflow-y-auto p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

const AdminDashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [stats, setStats] = useState<AdminStatisticsResponse | null>(null);
  const [majors, setMajors] = useState<AdminMajorDistributionItem[]>([]);
  const [pending, setPending] = useState<AdminPendingActionsResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const [apiHealth, setApiHealth] = useState<HealthState>("unknown");
  const [dbHealth, setDbHealth] = useState<HealthState>("unknown");
  const [sessionState, setSessionState] = useState<SessionState>("unknown");

  // Pending modal
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [pendingModalTab, setPendingModalTab] = useState<"pending" | "reset" | "all">("all");
  const [pendingSearch, setPendingSearch] = useState("");

  const load = async (mode: "initial" | "refresh" = "initial") => {
    try {
      mode === "refresh" ? setRefreshing(true) : setLoading(true);
      setError(null);

      const [s, m, p] = await Promise.all([
        api.adminStatistics(),
        api.adminMajorDistribution(),
        api.adminPendingActions(),
      ]);

      setStats(s);
      setMajors(Array.isArray(m) ? m : []);
      setPending(p);
      setLastUpdated(Date.now());

      setApiHealth("online");
      setDbHealth("online");
      setSessionState("active");
    } catch (e: any) {
      const status = detectHttpStatus(e);

      setApiHealth(lastUpdated ? "degraded" : "offline");
      setDbHealth(lastUpdated ? "degraded" : "offline");

      if (status === 401 || status === 403) setSessionState("expired");
      else setSessionState(lastUpdated ? "active" : "unknown");

      setError(e?.message || "Failed to load dashboard data");
    } finally {
      mode === "refresh" ? setRefreshing(false) : setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await load("initial");
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Counts (Major Change intentionally ignored in UI)
  const pendingSchedulePending = getCount(pending?.scheduleConflicts);

  //  backend now uses mustResetPasswords + mustResetPasswordCount
  const mustResetPasswordCount =
    typeof pending?.mustResetPasswordCount === "number"
      ? pending.mustResetPasswordCount
      : getCount(pending?.mustResetPasswords);

  const totalPending = pendingSchedulePending + (mustResetPasswordCount || 0);

  const majorWidget = useMemo(() => {
    const list = (majors || []).filter((x) => x && typeof x.count === "number" && x.count > 0);
    const total = list.reduce((a, x) => a + x.count, 0) || 0;

    const TOP_N = 6;
    const top = list.slice(0, TOP_N);
    const rest = list.slice(TOP_N);
    const othersCount = rest.reduce((a, x) => a + x.count, 0);

    const palette = ["#14b8a6", "#6366f1", "#22c55e", "#f59e0b", "#06b6d4", "#f43f5e", "#a855f7", "#94a3b8"];

    const segments = [
      ...top.map((x, idx) => ({
        label: x.major || `Major ${idx + 1}`,
        value: x.count,
        color: palette[idx % palette.length],
      })),
      ...(othersCount > 0 ? [{ label: t("Other Majors"), value: othersCount, color: palette[palette.length - 1] }] : []),
    ];

    const ranked = [
      ...top.map((x) => ({ label: x.major, value: x.count })),
      ...(othersCount > 0 ? [{ label: t("Other Majors"), value: othersCount }] : []),
    ];

    return { total, segments, ranked };
  }, [majors]);

  const kpis = useMemo(() => {
    const avgGpa = stats?.averageGPA ?? 0;
    const gpaTone = avgGpa >= 3.3 ? "emerald" : avgGpa >= 2.7 ? "cyan" : avgGpa > 0 ? "amber" : "primary";

    return [
      {
        label: t("Total Students"),
        value: stats ? formatCompact(stats.totalStudents) : "—",
        sub: t("Total active student accounts"),
        icon: <IconBadge icon="groups" tone="primary" />,
        rightHint: stats ? `${formatNumber(stats.totalStudents)} ${t("records")}` : "—",
      },
      {
        label: t("Graduated"),
        value: stats ? formatCompact(stats.graduatedCount) : "—",
        sub: t("Academic status: Graduated"),
        icon: <IconBadge icon="school" tone="emerald" />,
        rightHint: stats ? `${formatNumber(stats.graduatedCount)} ${t("completed")}` : "—",
      },
      {
        label: t("Retake Required"),
        value: stats ? formatCompact(stats.retakeRequirement) : "—",
        sub: t("Needs retake intervention"),
        icon: <IconBadge icon="history_edu" tone="amber" />,
        rightHint: t("Needs attention"),
      },
      {
        label: t("Average GPA"),
        value: stats ? (stats.averageGPA || 0).toFixed(2) : "—",
        sub: t("Average GPA of active students"),
        icon: <IconBadge icon="leaderboard" tone={gpaTone as any} />,
        rightHint: avgGpa ? (avgGpa >= 3.0 ? t("Healthy") : t("Watch")) : "—",
      },
    ] as const;
  }, [stats]);

  const workQueue = useMemo(() => {
    const items: Array<{
      key: string;
      title: string;
      description: string;
      count: number;
      tone: "rose" | "green";
      icon: string;
      route?: string;
      modalTab: "pending" | "reset";
      sample?: PendingDoc;
    }> = [
      {
        key: "passwordResets",
        title: t("Must Reset Password"),
        description: t("Accounts requiring password reset on next sign-in."),
        count: mustResetPasswordCount || 0,
        tone: "green",
        icon: "lock_reset",
        route: "/admin/students",
        modalTab: "reset",
        sample: Array.isArray(pending?.mustResetPasswords) ? pending?.mustResetPasswords?.[0] : undefined,
      },
      {
        key: "schedulePending",
        title: t("Schedule Pending"),
        description: t("Enrollments pending review (previously conflicts)."),
        count: pendingSchedulePending,
        tone: "rose",
        icon: "error_outline",
        route: "/admin/enrollment",
        modalTab: "pending",
        sample: Array.isArray(pending?.scheduleConflicts) ? pending?.scheduleConflicts?.[0] : undefined,
      },
    ];

    return items.sort((a, b) => b.count - a.count);
  }, [pending, pendingSchedulePending, mustResetPasswordCount]);

  const surface =
    "rounded-2xl bg-surface-light shadow-sm border border-border-light dark:bg-surface-dark dark:border-border-dark";

  const healthPill = (h: HealthState) => {
    if (h === "online") return { tone: "green" as const, label: t("Online") };
    if (h === "degraded") return { tone: "amber" as const, label: t("Degraded") };
    if (h === "offline") return { tone: "rose" as const, label: t("Offline") };
    return { tone: "gray" as const, label: t("Unknown") };
  };

  const sessionPill = (s: SessionState) => {
    if (s === "active") return { tone: "cyan" as const, label: t("Active") };
    if (s === "expired") return { tone: "rose" as const, label: t("Expired") };
    return { tone: "gray" as const, label: t("Unknown") };
  };

  //  Pending modal data (Major Change removed from UI)
  const pendingDocs = useMemo(() => {
    const conflict = Array.isArray(pending?.scheduleConflicts) ? pending?.scheduleConflicts : [];
    const reset = Array.isArray(pending?.mustResetPasswords) ? pending?.mustResetPasswords : [];

    const all: Array<{ kind: "Schedule Pending" | "Password Reset"; doc: PendingDoc }> = [
      ...conflict.map((doc) => ({ kind: "Schedule Pending" as const, doc })),
      ...reset.map((doc) => ({ kind: "Password Reset" as const, doc })),
    ];

    return { conflict, reset, all };
  }, [pending]);

  const modalList = useMemo(() => {
    const base =
      pendingModalTab === "pending"
        ? pendingDocs.conflict.map((doc) => ({ kind: "Schedule Pending" as const, doc }))
        : pendingModalTab === "reset"
        ? pendingDocs.reset.map((doc) => ({ kind: "Password Reset" as const, doc }))
        : pendingDocs.all;

    const q = pendingSearch.trim().toLowerCase();
    if (!q) return base;

    return base.filter(({ kind, doc }) => {
      const text = JSON.stringify({ kind, ...doc }).toLowerCase();
      return text.includes(q);
    });
  }, [pendingDocs, pendingModalTab, pendingSearch]);

  const openPendingModal = (tab: typeof pendingModalTab) => {
    setPendingModalTab(tab);
    setPendingModalOpen(true);
  };

  const go = (path: string) => navigate(path);

  // Row formatting for modal table (better UX)
  const rowMeta = (kind: "Schedule Pending" | "Password Reset", doc: PendingDoc) => {
    if (kind === "Password Reset") {
      const userObj = doc?.user || {};
      const name = userObj?.name || "Unknown";
      const email = userObj?.email || "";
      const uid = doc?.user_id || userObj?.id || "—";
      const key = email ? `${name} • ${email}` : `${name} • ${uid}`;
      const status = "must_reset_password";
      const id = String(doc?.id || doc?._id || uid || "");
      const when = doc?.updated_at || doc?.created_at;
      return { key, status, id, when };
    }

    // Schedule Pending
    const key =
      doc?.course_id ||
      doc?.course_code ||
      (doc?.student_id ? `Student ${doc.student_id}` : "") ||
      doc?.user_id ||
      "—";
    const status = String(doc?.status || "Pending");
    const id = String(doc?._id || doc?.id || "");
    const when = doc?.updated_at || doc?.created_at;
    return { key: String(key), status, id, when };
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-slate-950">
      <Sidebar user={user} onLogout={onLogout} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={t("Admin Dashboard")} user={user} />

        <main className="flex-1 overflow-y-auto scrollbar-hide">
          {/* Top command bar */}
          <div className="px-10 pt-10 animate-in fade-in duration-1000 slide-in-from-bottom-4">
            <div className="bg-slate-50/30 dark:bg-slate-900/20 rounded-[40px] border border-slate-100 dark:border-slate-800/50 p-10 shadow-sm transition-all hover:shadow-md">
              <div className="flex flex-col gap-10 xl:flex-row xl:items-end xl:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-4">
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">{t("Operations Overview")}</h1>
                    {refreshing ? (
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                        <span className="material-icons-outlined text-[14px] animate-spin">sync</span>
                        {t("Synchronizing")}
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 text-[10px] font-black uppercase tracking-[0.2em] border border-teal-100 dark:border-teal-800">
                        <span className="material-icons-outlined text-[14px]">history</span>
                        {lastUpdated ? (Date.now() - lastUpdated < 60000 ? t("Just now") : timeAgo(lastUpdated)) : "—"}
                      </div>
                    )}
                  </div>
                  <p className="text-lg font-medium text-slate-400 dark:text-slate-500 max-w-2xl leading-relaxed">{t("Institutional intelligence and administrative priorities synchronized in real-time.")}</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <button
                    onClick={() => load("refresh")}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-[0.98]"
                  >
                    <span className={cn("material-icons-outlined text-[20px]", refreshing && "animate-spin")}>
                      refresh
                    </span>{t("Sync")}</button>

                  <div className="hidden sm:block h-10 w-px bg-slate-200 dark:bg-slate-800 mx-4" />

                  <button
                    onClick={() => go("/admin/announcements")}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-3 rounded-2xl bg-teal-600 px-8 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg hover:bg-teal-700 transition-all active:scale-[0.98]"
                  >
                    <span className="material-icons-outlined text-[20px]">campaign</span>{t("Announce")}</button>

                  <button
                    onClick={() => go("/admin/courses")}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-3 rounded-2xl bg-white dark:bg-slate-900 px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-[0.98]"
                  >
                    Catalog
                  </button>

                  <button
                    onClick={() => go("/admin/students")}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-3 rounded-2xl bg-white dark:bg-slate-900 px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-[0.98]"
                  >
                    Directory
                  </button>
                </div>
              </div>

              {error && (
                <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="material-icons-outlined text-[20px]">error_outline</span>
                      <div>
                        <span className="font-bold mr-2">{t("Sync Error:")}</span>
                        <span className="opacity-90">{error}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => load("refresh")}
                      className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors"
                    >{t("Retry Sync")}</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* KPI row */}
          <div className="px-10 pt-10 animate-in fade-in duration-1000 slide-in-from-bottom-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {kpis.map((kpi, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] p-8 transition-all hover:-translate-y-2 hover:shadow-2xl group cursor-default">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-5">
                      <div className="shrink-0 transform group-hover:scale-110 transition-transform duration-500 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">{kpi.icon}</div>
                      <div>
                        <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{kpi.label}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-end justify-between gap-2">
                    <div className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white">
                      {loading ? <Skeleton className="h-12 w-28 rounded-xl" /> : kpi.value}
                    </div>

                    <div className="flex items-end gap-1.5 mb-3">
                      {[8, 18, 12, 28, 22, 36, 30].map((h, i) => (
                        <div key={i} className="w-1.5 rounded-full bg-teal-500/10 group-hover:bg-teal-500/40 transition-all duration-700" style={{ height: `${h}px` }} />
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-800/50 flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em]">{kpi.rightHint}</span>
                    <div className="h-6 w-6 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                      <span className="text-teal-500 material-icons-outlined text-[14px]">arrow_forward</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main grid */}
          <div className="px-8 py-8">
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
              {/* Analytics (left) */}
              <section className="xl:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{t("Student Analytics")}</h2>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 text-[10px] font-bold uppercase tracking-widest border border-teal-100 dark:border-teal-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                        Live Metrics
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Distribution of academic performance and institutional scale.
                    </p>
                  </div>

                  <button
                    onClick={() => openPendingModal("all")}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-5 py-2.5 text-sm font-bold text-slate-900 dark:text-white hover:bg-white dark:hover:bg-slate-700 transition-all shadow-sm"
                  >
                    <span className="material-icons-outlined text-[18px]">visibility</span>
                    Management Queue
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="relative overflow-hidden rounded-3xl border border-emerald-100/50 bg-emerald-50/30 p-6 dark:border-emerald-900/20 dark:bg-emerald-900/10 transition-all hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20">
                    <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-emerald-200/20 dark:bg-emerald-500/5" />
                    <div className="relative flex items-start justify-between gap-2">
                      <div className="flex items-center gap-4">
                        <IconBadge icon="school" tone="emerald" />
                        <div>
                          <div className="text-base font-bold text-slate-900 dark:text-white">{t("Graduated")}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{t("Successfully completed")}</div>
                        </div>
                      </div>
                      <div className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[9px] font-extrabold uppercase tracking-widest">
                        Healthy
                      </div>
                    </div>

                    <div className="relative mt-8 flex items-end justify-between">
                      <div className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                        {loading ? <Skeleton className="h-10 w-32" /> : formatNumber(stats?.graduatedCount ?? 0)}
                      </div>
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                        {stats?.totalStudents
                          ? `${Math.round(((stats.graduatedCount || 0) / (stats.totalStudents || 1)) * 100)}% of system`
                          : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-3xl border border-amber-100/50 bg-amber-50/30 p-6 dark:border-amber-900/20 dark:bg-amber-900/10 transition-all hover:bg-amber-50/50 dark:hover:bg-amber-900/20">
                    <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-amber-200/20 dark:bg-emerald-500/5" />
                    <div className="relative flex items-start justify-between gap-2">
                      <div className="flex items-center gap-4">
                        <IconBadge icon="history_edu" tone="amber" />
                        <div>
                          <div className="text-base font-bold text-slate-900 dark:text-white">{t("Retake Required")}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{t("Requires intervention")}</div>
                        </div>
                      </div>
                      <div className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[9px] font-extrabold uppercase tracking-widest">{t("Attention")}</div>
                    </div>

                    <div className="relative mt-8 flex items-end justify-between">
                      <div className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                        {loading ? <Skeleton className="h-10 w-32" /> : formatNumber(stats?.retakeRequirement ?? 0)}
                      </div>
                      <div className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">{t("Review pending")}</div>
                    </div>
                  </div>
                </div>

                {/* Major chart */}
                <div className="mt-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 p-10">
                  <div className="flex items-start justify-between gap-4 mb-8">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Major Distribution
                      </h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("Cohort split by academic specialization")}</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase tracking-widest shadow-sm">
                      <span className="material-icons-outlined text-[14px]">pie_chart</span>
                      {loading ? "Loading" : `${formatNumber(majorWidget.total)} students`}
                    </div>
                  </div>

                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 items-center">
                    <div className="flex items-center justify-center -mr-16">
                      {loading ? (
                        <div className="grid place-items-center relative">
                          <Skeleton className="h-48 w-48 rounded-full" />
                          <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <Skeleton className="h-8 w-16 mb-2" />
                            <Skeleton className="h-4 w-20" />
                          </div>
                        </div>
                      ) : majorWidget.total > 0 ? (
                        <Donut segments={majorWidget.segments} centerTop={formatCompact(majorWidget.total)} centerBottom="Students" />
                      ) : (
                        <div className="h-48 w-48 rounded-full border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-sm text-slate-400 italic">
                          No data
                        </div>
                      )}
                    </div>

                    <div className="space-y-6 pr-8 py-2">
                      {loading ? (
                        Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-2xl" />)
                      ) : (
                        majorWidget.ranked.map((r, idx) => {
                          const pct = majorWidget.total ? (r.value / majorWidget.total) * 100 : 0;
                          const color = majorWidget.segments[idx]?.color || "#94a3b8";
                          return (
                            <div key={`${r.label}-${idx}`} className="group p-1 transition-all">
                              <div className="flex items-center justify-between gap-3 mb-3 px-1">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-3">
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                                    <div className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{r.label || "—"}</div>
                                  </div>
                                  <div className="mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-5">
                                    {pct.toFixed(1)}% OF TOTAL
                                  </div>
                                </div>
                                <div className="text-xl font-black text-slate-900 dark:text-white">{formatNumber(r.value)}</div>
                              </div>

                              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800/50">
                                <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${clamp(pct, 0, 100)}%`, backgroundColor: color }} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Right column */}
              <aside className="xl:col-span-4 flex flex-col gap-10">
                {/* System Status */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[40px] p-10 shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-start justify-between gap-6 mb-10">
                    <div className="space-y-1">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{t("Core Engine")}</h3>
                      <p className="text-sm font-bold text-slate-500">{t("Service availability")}</p>
                    </div>
                    {(() => {
                      const pill =
                        apiHealth === "online" && sessionState === "active"
                          ? { tone: "green" as const, label: "Nominal" }
                          : apiHealth === "degraded"
                          ? { tone: "amber" as const, label: "Warning" }
                          : apiHealth === "offline"
                          ? { tone: "rose" as const, label: "Critical" }
                          : { tone: "gray" as const, label: t("Unknown") };
                      return (
                        <div className={cn(
                          "flex items-center gap-2.5 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm",
                          pill.tone === "green" ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800" :
                          pill.tone === "amber" ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800" :
                          pill.tone === "rose" ? "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-800" :
                          "bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800"
                        )}>
                          <span className="material-icons-outlined text-[14px]">
                            {pill.tone === "green" ? "check_circle" : pill.tone === "amber" ? "warning" : "error"}
                          </span>
                          {pill.label}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="space-y-5">
                    {[
                      { label: "API Cluster", health: apiHealth, icon: "dns" },
                      { label: "Database", health: dbHealth, icon: "storage" },
                    ].map((svc, i) => {
                      const p = healthPill(svc.health);
                      return (
                        <div key={i} className="flex items-center justify-between rounded-[24px] border border-slate-50 dark:border-slate-800/50 bg-slate-50/20 dark:bg-slate-950/30 px-6 py-5 transition-all hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm group">
                          <div className="flex items-center gap-4">
                            <span className={cn(
                              "material-icons-outlined text-[20px] transition-colors",
                              p.tone === "green" ? "text-emerald-500" :
                              p.tone === "amber" ? "text-amber-500" :
                              p.tone === "rose" ? "text-rose-500" : "text-slate-300"
                            )}>
                              {svc.icon}
                            </span>
                            <div className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{svc.label}</div>
                          </div>
                          <div className={cn(
                            "text-[9px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-md",
                            p.tone === "green" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40" :
                            p.tone === "amber" ? "bg-amber-50 text-amber-600 dark:bg-amber-900/40" :
                            p.tone === "rose" ? "bg-rose-50 text-rose-600 dark:bg-rose-900/40" :
                            "bg-slate-100 text-slate-400 dark:bg-slate-800"
                          )}>
                            {p.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pending inbox */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[40px] p-10 shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-start justify-between gap-6 mb-10">
                    <div className="space-y-1">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{t("Action Inbox")}</h3>
                      <p className="text-sm font-bold text-slate-500">{t("Awaiting intervention")}</p>
                    </div>

                    <button onClick={() => openPendingModal("all")} className="text-[10px] font-black text-teal-600 hover:text-teal-700 uppercase tracking-[0.2em] transition-colors border-b-2 border-teal-600/20 pb-1">
                      Expand
                    </button>
                  </div>

                  <div className="space-y-5">
                    {loading ? (
                      Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-[24px]" />)
                    ) : (
                      workQueue.map((w) => (
                        <div
                          key={w.key}
                          className="group relative rounded-[32px] border border-slate-50 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/30 p-6 transition-all hover:bg-white dark:hover:bg-slate-900 hover:shadow-xl hover:border-teal-500/20"
                        >
                          <div className="flex items-start justify-between gap-6">
                            <div className="flex items-start gap-5 flex-1 min-w-0">
                              <div className="shrink-0 transform group-hover:scale-110 transition-transform duration-500">
                                <IconBadge icon={w.icon} tone={w.tone === "rose" ? "rose" : "emerald"} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="truncate text-base font-black text-slate-900 dark:text-white tracking-tight">{w.title}</div>
                                  <div className={cn(
                                    "px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm",
                                    w.count > 0 
                                      ? (w.tone === "rose" ? "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/40" : "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/40")
                                      : "bg-slate-50 text-slate-300 border-slate-100 dark:bg-slate-900 dark:text-slate-600 dark:border-slate-800"
                                  )}>
                                    {w.count}
                                  </div>
                                </div>
                                <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 line-clamp-2 leading-relaxed mb-4">{w.description}</div>
                                
                                {w.sample && (
                                  <div className="flex items-center gap-2 text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                                    <span className="material-icons-outlined text-[14px]">update</span>
                                    {timeAgo(w.sample?.updated_at || w.sample?.created_at)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => openPendingModal(w.modalTab)}
                            className={cn(
                              "mt-6 w-full rounded-2xl py-3.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-[0.98] shadow-sm",
                              w.count > 0 
                                ? "bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700" 
                                : "bg-slate-50 dark:bg-slate-900 text-slate-300 cursor-not-allowed border border-slate-100 dark:border-slate-800"
                            )}
                          >
                            Resolve Tasks
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </aside>
            </div>

            <footer className="mt-20 py-12 border-t border-slate-50 dark:border-slate-900 text-center">
              <p className="text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.4em]">
                University Administrative Operating System • V2.4.0
              </p>
            </footer>
          </div>
        </main>
      </div>

      {/* Pending Queue Modal */}
      <Modal
        open={pendingModalOpen}
        title={t("Institutional Queue")}
        subtitle={t("Priority protocols from the central records fabric")}
        onClose={() => setPendingModalOpen(false)}
      >
        <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between mb-10 px-2">
          <div className="flex flex-wrap gap-3 p-2 bg-slate-50 dark:bg-slate-950 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-inner">
            {[
              { key: "all", label: `Aggregate (${pendingDocs.all.length})` },
              { key: "pending", label: `Conflict (${pendingDocs.conflict.length})` },
              { key: "reset", label: `Security (${pendingDocs.reset.length || mustResetPasswordCount || 0})` },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setPendingModalTab(t.key as any)}
                className={cn(
                  "rounded-2xl px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all",
                  pendingModalTab === t.key
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xl ring-1 ring-slate-100 dark:ring-slate-700"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-sm group">
            <span className="material-icons-outlined pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[20px] text-slate-300 group-focus-within:text-teal-500 transition-colors">
              search
            </span>
            <input
              value={pendingSearch}
              onChange={(e) => setPendingSearch(e.target.value)}
              placeholder={t("Search protocols...")}
              className="w-full rounded-[24px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 pl-14 pr-6 py-4 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500/50 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950 mx-2">
          <div className="grid grid-cols-12 bg-slate-50/50 dark:bg-slate-900/50 px-10 py-5 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
            <div className="col-span-3">{t("Protocol")}</div>
            <div className="col-span-5">{t("Subject Matrix")}</div>
            <div className="col-span-2">{t("Vector")}</div>
            <div className="col-span-2 text-right">{t("Age")}</div>
          </div>

          <div className="divide-y divide-slate-50 dark:divide-slate-800/50 max-h-[50vh] overflow-y-auto scrollbar-hide">
            {modalList.length === 0 ? (
              <div className="p-20 text-center text-sm font-bold text-slate-300 italic uppercase tracking-widest">{t("Zero Matching Records")}</div>
            ) : (
              modalList.slice(0, 50).map((row, idx) => {
                const doc = row.doc || {};
                const meta = rowMeta(row.kind, doc);

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (row.kind === "Schedule Pending") go("/admin/enrollment");
                      else go("/admin/students");
                    }}
                    className="grid w-full grid-cols-12 items-center px-10 py-6 text-left text-sm hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-all group"
                  >
                    <div className="col-span-3 font-black text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors uppercase tracking-widest text-[11px]">{row.kind}</div>
                    <div className="col-span-5 truncate text-slate-500 dark:text-slate-400 font-bold">{meta.key}</div>
                    <div className="col-span-2">
                      <StatusBadge kind={row.kind} status={meta.status} />
                    </div>
                    <div className="col-span-2 text-right text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-tighter tabular-nums">
                      {meta.when ? timeAgo(meta.when) : "—"}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap justify-end gap-4 px-2">
          <button
            onClick={() => go("/admin/enrollment")}
            className="rounded-[20px] bg-teal-600 px-8 py-4 text-[11px] font-black uppercase tracking-widest text-white hover:bg-teal-700 shadow-lg shadow-teal-500/20 transition-all active:scale-[0.98]"
          >
            Manage Enrollment
          </button>
          <button
            onClick={() => go("/admin/students")}
            className="rounded-[20px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 py-4 text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-[0.98]"
          >
            Manage Students
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
