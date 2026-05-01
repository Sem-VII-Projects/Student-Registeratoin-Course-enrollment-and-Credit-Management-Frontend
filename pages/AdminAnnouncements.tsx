import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { DetailedCardGridSkeleton } from "../components/Skeleton";
import { User } from "../types";
import { api } from "../lib/api";

type AnnouncementType = "General" | "Urgent" | "Event" | "Academic";
type AnnouncementStatus = "draft" | "published" | "archived";
type SortMode = "Pinned+Newest" | "Newest" | "Oldest" | "Expiring Soon";

type Announcement = {
  _id: string;
  title: string;
  content: string;
  type?: AnnouncementType;

  // optional new fields
  status?: AnnouncementStatus;
  pinned?: boolean;
  pinned_at?: string | null;
  published_at?: string | null;
  updated_at?: string | null;

  // legacy fields (still returned)
  posted_by?: string;
  date_posted?: string;
  expiry_date?: string | null;
  target_audience?: string;
};

interface Props {
  user: User;
  onLogout: () => void;
}

const TYPES: AnnouncementType[] = ["General", "Urgent", "Event", "Academic"];
const STATUSES: Array<{ key: AnnouncementStatus | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "published", label: "Published" },
  { key: "archived", label: "Archived" },
];

function safeDate(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatLocalWithTz(iso?: string | null) {
  const d = safeDate(iso ?? null);
  if (!d) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function formatUtc(iso?: string | null) {
  const d = safeDate(iso ?? null);
  if (!d) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

function toDatetimeLocalValue(iso?: string | null) {
  const d = safeDate(iso ?? null);
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function isExpired(a: Announcement) {
  const exp = safeDate(a.expiry_date ?? null);
  if (!exp) return false;
  return exp.getTime() < Date.now();
}

function shortId(id: string) {
  return id.length > 14 ? `${id.slice(0, 14)}…` : id;
}

function clsx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function statusBadge(status?: AnnouncementStatus) {
  const s = (status ?? "draft") as AnnouncementStatus;
  if (s === "published") return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
  if (s === "archived") return "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-200";
  return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
}

function typeBadge(type?: AnnouncementType) {
  const t = type ?? "General";
  if (t === "Urgent") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200";
  if (t === "Event") return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200";
  if (t === "Academic") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
  return "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200";
}

function normalizeAnnouncement(a: any): Announcement {
  return {
    ...a,
    status: (a.status as AnnouncementStatus | undefined) ?? undefined,
    pinned: typeof a.pinned === "boolean" ? a.pinned : undefined,
    pinned_at: a.pinned_at ?? null,
    published_at: a.published_at ?? null,
    updated_at: a.updated_at ?? null,
    expiry_date: a.expiry_date ?? null,
    target_audience: a.target_audience ?? "All",
  };
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

/* =========================================================
   Confirm Modal + Toast
   ========================================================= */

type ConfirmVariant = "danger" | "primary" | "neutral";

function ConfirmModal({
  open,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "neutral",
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  const btn =
    variant === "danger"
      ? "bg-red-600 hover:opacity-90"
      : variant === "primary"
      ? "bg-primary hover:opacity-90"
      : "bg-gray-800 hover:opacity-90";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-gray-800 dark:text-white">{title}</h3>
          {description ? (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{description}</p>
          ) : null}
        </div>

        <div className="px-6 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:opacity-90 dark:border-gray-700 dark:text-gray-200 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={clsx("rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50", btn)}
          >
            {loading ? "Working..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

type ToastKind = "success" | "error" | "info";

function Toast({
  open,
  message,
  kind = "success",
  onClose,
}: {
  open: boolean;
  message: string;
  kind?: ToastKind;
  onClose: () => void;
}) {
  if (!open) return null;

  const color =
    kind === "success"
      ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-200"
      : kind === "error"
      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200"
      : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200";

  return (
    <div className="fixed z-[70] bottom-6 right-6 max-w-sm">
      <div className={clsx("rounded-lg border p-4 text-sm shadow-lg", color)}>
        <div className="flex items-start justify-between gap-3">
          <div className="font-bold">{message}</div>
          <button
            onClick={onClose}
            className="text-xs font-bold opacity-70 hover:opacity-100"
            aria-label="Close toast"
          >
            �
          </button>
        </div>
      </div>
    </div>
  );
}

const AdminAnnouncements: React.FC<Props> = ({ user, onLogout }) => {
  const { t } = useTranslation();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // create form
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<AnnouncementType>("General");
  const [statusVal, setStatusVal] = useState<AnnouncementStatus>("draft");
  const [pinned, setPinned] = useState(false);
  const [targetAudience, setTargetAudience] = useState("All");
  const [expiry, setExpiry] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // controls
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | AnnouncementType>("All");
  const [statusFilter, setStatusFilter] = useState<AnnouncementStatus | "all">("all");
  const [pinnedFilter, setPinnedFilter] = useState<"All" | "Pinned" | "Unpinned">("All");
  const [expiryFilter, setExpiryFilter] = useState<"All" | "Active" | "Expired">("All");
  const [sortMode, setSortMode] = useState<SortMode>("Pinned+Newest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [query, typeFilter, statusFilter, pinnedFilter, expiryFilter, sortMode]);

  // edit modal state
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editType, setEditType] = useState<AnnouncementType>("General");
  const [editStatus, setEditStatus] = useState<AnnouncementStatus>("draft");
  const [editPinned, setEditPinned] = useState(false);
  const [editTargetAudience, setEditTargetAudience] = useState("All");
  const [editExpiry, setEditExpiry] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState(false);

  // bulk selection
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  // confirm + toast
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDesc, setConfirmDesc] = useState<string | undefined>(undefined);
  const [confirmText, setConfirmText] = useState("Confirm");
  const [confirmVariant, setConfirmVariant] = useState<ConfirmVariant>("neutral");
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | (() => Promise<void>)>(null);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastKind, setToastKind] = useState<ToastKind>("success");

  function showToast(kind: ToastKind, msg: string) {
    setToastKind(kind);
    setToastMsg(msg);
    setToastOpen(true);
    window.setTimeout(() => setToastOpen(false), 2200);
  }

  function openConfirm(opts: {
    title: string;
    description?: string;
    confirmText?: string;
    variant?: ConfirmVariant;
    action: () => Promise<void>;
  }) {
    setConfirmTitle(opts.title);
    setConfirmDesc(opts.description);
    setConfirmText(opts.confirmText ?? "Confirm");
    setConfirmVariant(opts.variant ?? "neutral");
    setConfirmAction(() => opts.action);
    setConfirmOpen(true);
  }

  async function runConfirm() {
    if (!confirmAction) return;
    setConfirmLoading(true);
    try {
      await confirmAction();
      setConfirmOpen(false);
    } catch (e: any) {
      setError(e?.message || t("Action failed"));
      showToast("error", e?.message || t("Action failed"));
    } finally {
      setConfirmLoading(false);
    }
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.adminAnnouncements();
      const arr = Array.isArray(data) ? data : [];
      setItems(arr.map(normalizeAnnouncement));
      setSelected({});
    } catch (e: any) {
      setError(e?.message || t("Failed to load announcements"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...items];

    if (statusFilter !== "all") {
      list = list.filter((a) => (a.status ?? "draft") === statusFilter);
    }

    if (typeFilter !== "All") {
      list = list.filter((a) => (a.type ?? "General") === typeFilter);
    }

    if (pinnedFilter !== "All") {
      list = list.filter((a) => (pinnedFilter === "Pinned" ? !!a.pinned : !a.pinned));
    }

    if (expiryFilter !== "All") {
      list = list.filter((a) => (expiryFilter === "Expired" ? isExpired(a) : !isExpired(a)));
    }

    if (q) {
      list = list.filter((a) => {
        const hay = `${a._id} ${a.title ?? ""} ${a.content ?? ""} ${a.posted_by ?? ""} ${a.target_audience ?? ""} ${
          a.status ?? ""
        }`.toLowerCase();
        return hay.includes(q);
      });
    }

    const getCreated = (a: Announcement) => a.updated_at ?? a.published_at ?? a.date_posted ?? "";
    const getPinnedAt = (a: Announcement) => a.pinned_at ?? "";
    const getExpiry = (a: Announcement) => a.expiry_date ?? "";

    list.sort((a, b) => {
      if (sortMode === "Oldest") return getCreated(a).localeCompare(getCreated(b));
      if (sortMode === "Newest") return getCreated(b).localeCompare(getCreated(a));
      if (sortMode === "Expiring Soon") {
        const ea = getExpiry(a) || "9999-12-31T00:00:00Z";
        const eb = getExpiry(b) || "9999-12-31T00:00:00Z";
        const cmp = ea.localeCompare(eb);
        if (cmp !== 0) return cmp;
        return getCreated(b).localeCompare(getCreated(a));
      }
      // Pinned+Newest
      const pa = a.pinned ? 1 : 0;
      const pb = b.pinned ? 1 : 0;
      if (pa !== pb) return pb - pa;
      const pcmp = getPinnedAt(b).localeCompare(getPinnedAt(a));
      if (pcmp !== 0) return pcmp;
      return getCreated(b).localeCompare(getCreated(a));
    });

    return list;
  }, [items, query, typeFilter, statusFilter, pinnedFilter, expiryFilter, sortMode]);

  // ---------- create
  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError(t("Title and content are required."));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let expiryIso: string | undefined;
      if (expiry.trim().length > 0) {
        const d = new Date(expiry);
        if (!Number.isNaN(d.getTime())) expiryIso = d.toISOString();
      }

      await api.adminCreateAnnouncement({
        title: title.trim(),
        content: content.trim(),
        type,
        status: statusVal,
        pinned,
        target_audience: targetAudience.trim() || "All",
        ...(expiryIso ? { expiry_date: expiryIso } : { expiry_date: null }),
      });

      setTitle("");
      setContent("");
      setType("General");
      setStatusVal("draft");
      setPinned(false);
      setTargetAudience("All");
      setExpiry("");

      await load();
      showToast("success", t("Announcement created"));
    } catch (e: any) {
      setError(e?.message || t("Failed to create announcement"));
      showToast("error", e?.message || t("Failed to create announcement"));
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- edit
  function openEdit(a: Announcement) {
    setEditing(a);
    setEditTitle(a.title ?? "");
    setEditContent(a.content ?? "");
    setEditType((a.type ?? "General") as AnnouncementType);
    setEditStatus((a.status ?? "draft") as AnnouncementStatus);
    setEditPinned(!!a.pinned);
    setEditTargetAudience(a.target_audience ?? "All");
    setEditExpiry(toDatetimeLocalValue(a.expiry_date ?? null));
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;

    if (!editTitle.trim() || !editContent.trim()) {
      setError(t("Title and content are required."));
      return;
    }

    setSavingEdit(true);
    setError(null);

    try {
      let expiryIso: string | null | undefined = undefined;

      if (editExpiry.trim().length === 0) {
        expiryIso = null;
      } else {
        const d = new Date(editExpiry);
        if (!Number.isNaN(d.getTime())) expiryIso = d.toISOString();
      }

      await api.adminUpdateAnnouncement(editing._id, {
        title: editTitle.trim(),
        content: editContent.trim(),
        type: editType,
        status: editStatus,
        pinned: editPinned,
        target_audience: editTargetAudience.trim() || "All",
        expiry_date: expiryIso,
      });

      setEditing(null);
      await load();
      showToast("success", t("Announcement updated"));
    } catch (err: any) {
      setError(err?.message || t("Failed to update announcement"));
      showToast("error", err?.message || t("Failed to update announcement"));
    } finally {
      setSavingEdit(false);
    }
  }

  // ---------- workflow actions
  async function doAction(fn: () => Promise<any>, successMsg: string) {
    setError(null);
    await fn();
    await load();
    showToast("success", successMsg);
  }

  function onDelete(id: string) {
    openConfirm({
      title: t("Delete announcement?"),
      description: t("This will permanently delete the announcement. This cannot be undone."),
      confirmText: t("Delete"),
      variant: "danger",
      action: async () => {
        await doAction(() => api.adminDeleteAnnouncement(id), t("Announcement deleted"));
        setSelected((prev) => {
          const { [id]: _, ...rest } = prev;
          return rest;
        });
      },
    });
  }

  function onPublish(a: Announcement) {
    openConfirm({
      title: t("Publish announcement?"),
      description: t("Publishing will mark this announcement as Published."),
      confirmText: "Publish",
      variant: "primary",
      action: async () => doAction(() => api.adminPublishAnnouncement(a._id), t("Announcement published")),
    });
  }

  function onArchive(a: Announcement) {
    openConfirm({
      title: t("Archive announcement?"),
      description: t("Archived announcements are kept in DB but treated as inactive."),
      confirmText: "Archive",
      variant: "neutral",
      action: async () => doAction(() => api.adminArchiveAnnouncement(a._id), t("Announcement archived")),
    });
  }

  async function onPinToggle(a: Announcement) {
    try {
      setError(null);
      if (a.pinned) {
        await api.adminUnpinAnnouncement(a._id);
        showToast("success", t("Announcement unpinned"));
      } else {
        await api.adminPinAnnouncement(a._id);
        showToast("success", t("Announcement pinned"));
      }
      await load();
    } catch (e: any) {
      setError(e?.message || t("Failed to update pin"));
      showToast("error", e?.message || t("Failed to update pin"));
    }
  }

  function onDuplicate(a: Announcement) {
    openConfirm({
      title: t("Duplicate announcement?"),
      description: t("This will create a new Draft copy you can edit."),
      confirmText: t("Duplicate"),
      variant: "primary",
      action: async () => doAction(() => api.adminDuplicateAnnouncement(a._id), t("Announcement duplicated")),
    });
  }

  // ---------- bulk
  function toggleSelected(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function setAllSelected(ids: string[], value: boolean) {
    const next: Record<string, boolean> = {};
    for (const id of ids) next[id] = value;
    setSelected(next);
  }

  function bulkPublish() {
    if (selectedIds.length === 0) return;
    openConfirm({
      title: `${t("Publish")} ${selectedIds.length} ${t("announcements?")}`,
      description: t("They will be marked as Published."),
      confirmText: "Publish",
      variant: "primary",
      action: async () =>
        doAction(() => api.adminBulkAnnouncements({ action: "publish", ids: selectedIds }), t("Bulk publish done")),
    });
  }

  function bulkArchive() {
    if (selectedIds.length === 0) return;
    openConfirm({
      title: `${t("Archive")} ${selectedIds.length} ${t("announcements?")}`,
      description: t("They will be marked as Archived."),
      confirmText: "Archive",
      variant: "neutral",
      action: async () =>
        doAction(() => api.adminBulkAnnouncements({ action: "archive", ids: selectedIds }), t("Bulk archive done")),
    });
  }

  function bulkDelete() {
    if (selectedIds.length === 0) return;
    openConfirm({
      title: `${t("Delete")} ${selectedIds.length} ${t("announcements?")}`,
      description: t("This will permanently delete them. This cannot be undone."),
      confirmText: t("Delete"),
      variant: "danger",
      action: async () =>
        doAction(() => api.adminBulkAnnouncements({ action: "delete", ids: selectedIds }), t("Bulk delete done")),
    });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-slate-950 font-poppins">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={t("Announcements")} user={user} />

        <main className="flex-1 overflow-y-auto p-8 animate-in fade-in duration-700 slide-in-from-bottom-4 scrollbar-hide max-w-[1600px] mx-auto w-full">
          {error && (
            <div className="mb-10 rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <span className="material-icons-outlined text-lg">error_outline</span>
              {error}
            </div>
          )}

          {/* Create */}
          <div className="bg-slate-50/30 dark:bg-slate-900/20 rounded-3xl border border-slate-100 dark:border-slate-800/50 p-6 lg:p-8 mb-8 transition-all hover:bg-white dark:hover:bg-slate-900 hover:shadow-md group">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-10 w-10 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600 dark:text-teal-400 border border-teal-100/50 dark:border-teal-800/50 group-hover:scale-110 transition-transform duration-500">
                <span className="material-icons-outlined text-2xl">campaign</span>
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{t("Dispatch Broadcast")}</h3>
                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">{t("Institutional Communication Protocol")}</p>
              </div>
            </div>

            <form onSubmit={onCreate} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-12 space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Subject Title *")}</label>
                <input
                  className="w-full rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/50 transition-all shadow-sm placeholder:text-slate-300"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("e.g., Campus Network Maintenance Schedule")}
                />
              </div>

              <div className="lg:col-span-12 space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Announcement Body *")}</label>
                <textarea
                  className="w-full min-h-[120px] rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/50 transition-all shadow-sm leading-relaxed placeholder:text-slate-300 scrollbar-hide"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t("Draft your message content here...")}
                />
              </div>

              <div className="lg:col-span-3 space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Type Vector")}</label>
                <select
                  className="w-full rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20 transition-all cursor-pointer shadow-sm appearance-none"
                  value={type}
                  onChange={(e) => setType(e.target.value as AnnouncementType)}
                >
                  {TYPES.map((typeOption) => (
                    <option key={typeOption} value={typeOption}>{t(typeOption)}</option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-3 space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Initial State")}</label>
                <select
                  className="w-full rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20 transition-all cursor-pointer shadow-sm appearance-none"
                  value={statusVal}
                  onChange={(e) => setStatusVal(e.target.value as AnnouncementStatus)}
                >
                  <option value="draft">{t("Draft (Restricted)")}</option>
                  <option value="published">{t("Published (Live)")}</option>
                  <option value="archived">{t("Archived")}</option>
                </select>
              </div>

              <div className="lg:col-span-3 space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Target Audience")}</label>
                <input
                  className="w-full rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder={t("e.g., Global Students")}
                />
              </div>

              <div className="lg:col-span-3 space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Termination Date")}</label>
                <input
                  type="datetime-local"
                  className="w-full rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                />
              </div>

              <div className="lg:col-span-12 flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-4">
                <label className="flex items-center gap-4 cursor-pointer group/toggle">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={pinned}
                      onChange={(e) => setPinned(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-14 h-7 rounded-full transition-colors duration-500 flex items-center px-1 ${pinned ? 'bg-teal-600' : 'bg-slate-200 dark:bg-slate-800'}`}>
                      <div className={`bg-white w-5 h-5 rounded-full shadow-lg transform transition-transform duration-500 ${pinned ? 'translate-x-7' : 'translate-x-0'}`} />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="block text-sm font-black text-slate-900 dark:text-white transition-colors">{t("Prioritize Placement")}</span>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Pin to global feed apex")}</span>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-10 py-3 rounded-xl bg-slate-900 dark:bg-teal-600 text-xs font-bold uppercase tracking-widest text-white hover:bg-slate-800 dark:hover:bg-teal-700 transition-all shadow-md active:scale-[0.98] disabled:opacity-40"
                >
                  {submitting ? t("Processing...") : t("Commit Broadcast")}
                </button>
              </div>
            </form>
          </div>

          {/* Controls */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 lg:p-8 space-y-6 mb-8">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
              <div className="flex flex-wrap gap-1.5 p-1 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 shadow-inner">
                {STATUSES.map((statusOption) => (
                  <button
                    key={statusOption.key}
                    type="button"
                    onClick={() => setStatusFilter(statusOption.key)}
                    className={clsx(
                      "rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all",
                      statusFilter === statusOption.key
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-100 dark:ring-slate-700"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest mr-2">
                  {t("Active Selection: ")}<span className="text-slate-900 dark:text-white ml-1">{selectedIds.length} {t('items')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={bulkPublish}
                    disabled={selectedIds.length === 0}
                    className="h-9 px-4 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-widest border border-emerald-100 dark:border-emerald-800/50 transition-all disabled:opacity-30 active:scale-95 shadow-sm"
                  >{t("Publish")}</button>
                  <button
                    type="button"
                    onClick={bulkArchive}
                    disabled={selectedIds.length === 0}
                    className="h-9 px-4 rounded-xl bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[10px] font-bold uppercase tracking-widest border border-slate-200 dark:border-slate-700 transition-all disabled:opacity-30 active:scale-95 shadow-sm"
                  >{t("Archive")}</button>
                  <button
                    type="button"
                    onClick={bulkDelete}
                    disabled={selectedIds.length === 0}
                    className="h-9 px-4 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 text-[10px] font-bold uppercase tracking-widest border border-rose-100 dark:border-rose-800/50 transition-all disabled:opacity-30 active:scale-95 shadow-sm"
                  >{t("Purge")}</button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2 relative group">
                <span className="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors text-lg">search</span>
                <input
                  className="w-full rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 pl-10 pr-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm"
                  placeholder={t("Filter broadcast logs...")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <select
                className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20 transition-all cursor-pointer shadow-sm appearance-none"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
              >
                <option value="All">{t("All Categories")}</option>
                {TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <select
                className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20 transition-all cursor-pointer shadow-sm appearance-none"
                value={pinnedFilter}
                onChange={(e) => setPinnedFilter(e.target.value as any)}
              >
                <option value="All">{t("All Tiers")}</option>
                <option value="Pinned">{t("Pinned Records")}</option>
                <option value="Unpinned">{t("Standard Records")}</option>
              </select>

              <select
                className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20 transition-all cursor-pointer shadow-sm appearance-none"
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as any)}
              >
                <option value="Pinned+Newest">{t("Priority Flow")}</option>
                <option value="Newest">{t("Newest Dispatch")}</option>
                <option value="Oldest">{t("Oldest Dispatch")}</option>
                <option value="Expiring Soon">{t("Termination Velocity")}</option>
              </select>
            </div>
          </div>

          {/* List */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:shadow-md">
            <div className="border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between bg-slate-50/30 dark:bg-slate-950/30">
              <div className="space-y-0.5">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">{t("Broadcast Repository")}</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  {t('Showing')} {filtered.length} {t('matching communications')}
                </p>
              </div>
              <button 
                onClick={load} 
                className="h-8 px-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2" 
                disabled={loading}
              >
                <span className={clsx("material-icons-outlined text-sm", loading && "animate-spin")}>sync</span>
                {t("Refresh")}
              </button>
            </div>

            {loading ? (
              <div className="p-10">
                <DetailedCardGridSkeleton count={3} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-32 text-center">
                <div className="h-24 w-24 rounded-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center mx-auto mb-8 border border-slate-100 dark:border-slate-800">
                  <span className="material-icons-outlined text-slate-200 dark:text-slate-800 text-5xl">cloud_off</span>
                </div>
                <h4 className="text-lg font-bold text-slate-400 uppercase tracking-widest">{t("No matching records")}</h4>
                <p className="mt-2 text-sm text-slate-400 font-medium">{t("Try refining your search parameters.")}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {/* Desktop Header */}
                <div className="hidden lg:flex px-6 py-3 text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 items-center gap-4 bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-5 flex justify-center">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selectedIds.length === filtered.length}
                      onChange={(e) => setAllSelected(filtered.map((x) => x._id), e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-700 accent-teal-600"
                    />
                  </div>
                  <span className="w-20">{t("Category")}</span>
                  <span className="w-24">{t("Status")}</span>
                  <span className="flex-1">{t("Announcement Details")}</span>
                  <span className="w-[280px] text-right">{t("Administrative Actions")}</span>
                </div>

                <div className="divide-y divide-slate-300 dark:divide-slate-700">
                  {filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((a) => {
                    const expired = isExpired(a);
                    const status = (a.status ?? "draft") as AnnouncementStatus;
                    const createdIso = a.updated_at ?? a.published_at ?? a.date_posted ?? null;
                    const expIso = a.expiry_date ?? null;

                    return (
                      <div key={a._id} className="group px-6 py-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all relative">
                        {a.pinned && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500" title={t("Pinned Announcement")} />
                      )}
                      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                        <div className="flex items-center gap-4 shrink-0">
                          <input
                            type="checkbox"
                            checked={!!selected[a._id]}
                            onChange={() => toggleSelected(a._id)}
                            className="h-4 w-4 rounded-md border-slate-300 dark:border-slate-700 accent-teal-600 transition-all transform group-hover:scale-110"
                          />
                          <div className="lg:hidden flex flex-wrap items-center gap-2">
                             <span className={clsx("text-[9px] font-extrabold uppercase tracking-widest px-2 py-1 rounded-md border", typeBadge(a.type))}>
                               {t(a.type ?? "General")}
                             </span>
                             <span className={clsx("text-[9px] font-extrabold uppercase tracking-widest px-2 py-1 rounded-md border", statusBadge(status))}>
                               {t(status)}
                             </span>
                             </div>
                             </div>

                             {/* Category */}
                             <div className="hidden lg:block w-20 shrink-0">
                             <span className={clsx("text-[9px] font-extrabold uppercase tracking-widest px-2 py-1 rounded-md border", typeBadge(a.type))}>
                             {t(a.type ?? "General")}
                             </span>
                             </div>

                             {/* Status */}
                             <div className="hidden lg:block w-24 shrink-0">
                             <span className={clsx("text-[9px] font-extrabold uppercase tracking-widest px-2 py-1 rounded-md border", statusBadge(status))}>
                             {t(status)}
                             </span>
                             </div>

                             {/* Details Area */}
                             <div className="min-w-0 flex-1">
                             <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2">
                             <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{t("Audience: ")}</span>
                              <span className="text-[10px] font-extrabold text-slate-900 dark:text-white uppercase tracking-widest">{t(a.target_audience ?? "Global")}</span>
                             </div>

                             {createdIso && (
                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                                <span className="material-icons-outlined text-sm opacity-60">history</span>
                                {formatLocalWithTz(createdIso)}
                              </div>
                             )}

                             {expIso && (
                              <div className={clsx(
                                "flex items-center gap-2 text-[10px] font-bold uppercase tracking-tighter",
                                expired ? "text-rose-500" : "text-slate-400 dark:text-slate-500"
                              )}>
                                <span className="material-icons-outlined text-sm opacity-60">timer_off</span>
                                {expired ? t("Lapsed") : `{t("Ends: ")}${formatLocalWithTz(expIso)}`}
                              </div>
                             )}                          </div>

                          <h4 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2 group-hover:text-teal-600 transition-colors leading-snug">{a.title}</h4>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 md:line-clamp-3 mb-6">{a.content}</p>

                          <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 py-1 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{t("UUID:")}</span>
                              <span className="text-[10px] font-bold font-mono text-slate-600 dark:text-slate-400">{shortId(a._id)}</span>
                              <button onClick={() => copy(a._id)} className="text-teal-600 hover:text-teal-700 material-icons-outlined text-sm ml-1">content_copy</button>
                            </div>
                            {a.posted_by && (
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[8px] font-bold">{t("BY")}</div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{a.posted_by}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions Area */}
                        <div className="mt-4 lg:mt-0 flex flex-wrap lg:flex-nowrap items-center gap-2 shrink-0 lg:w-[280px] lg:justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            {status === "draft" && (
                              <button
                                onClick={() => onPublish(a)}
                                className="h-8 px-4 rounded-xl bg-teal-600 text-[9px] font-bold uppercase tracking-widest text-white hover:bg-teal-700 transition-all shadow-sm active:scale-95"
                              >{t("Publish")}</button>
                            )}
                            {status === "published" && (
                              <button
                                onClick={() => onArchive(a)}
                                className="h-8 px-4 rounded-xl bg-slate-900 dark:bg-slate-800 text-[9px] font-bold uppercase tracking-widest text-white hover:bg-slate-800 transition-all shadow-sm active:scale-95"
                              >{t("Archive")}</button>
                            )}

                            <button
                              onClick={() => onPinToggle(a)}
                              className={clsx(
                                "h-8 px-3 rounded-lg border transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95",
                                a.pinned
                                  ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400"
                                  : "bg-white text-slate-400 border-slate-200 dark:bg-slate-900 dark:border-slate-700 hover:text-slate-600"
                              )}
                              title={a.pinned ? t("Unpin") : t("Pin to top")}
                            >
                              <span className="material-icons-outlined text-base">push_pin</span>
                            </button>

                            <button
                              onClick={() => openEdit(a)}
                              className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-400 hover:text-teal-600 hover:border-teal-500/50 transition-all shadow-sm active:scale-95"
                              title={t("Edit Record")}
                            >
                              <span className="material-icons-outlined text-base">edit</span>
                            </button>

                            <button
                              onClick={() => onDelete(a._id)}
                              className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:border-rose-500/50 transition-all shadow-sm active:scale-95"
                              title={t("Purge Record")}
                            >
                              <span className="material-icons-outlined text-base">delete_outline</span>
                            </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
               </div>

               {/* Pagination Controls */}
               {filtered.length > itemsPerPage && (
                 <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                     {t('Showing')} {Math.min(filtered.length, (currentPage - 1) * itemsPerPage + 1)} {t('to')} {Math.min(filtered.length, currentPage * itemsPerPage)} {t('of')} {filtered.length}
                   </p>
                   <div className="flex items-center gap-2">
                     <button
                       onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                       disabled={currentPage === 1}
                       className="h-8 px-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                     >
                       Previous
                     </button>
                     <button
                       onClick={() => setCurrentPage(p => Math.min(Math.ceil(filtered.length / itemsPerPage), p + 1))}
                       disabled={currentPage >= Math.ceil(filtered.length / itemsPerPage)}
                       className="h-8 px-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                     >
                       Next
                     </button>
                   </div>
                 </div>
               )}
              </div>
            )}
          </div>

          {/* Edit Modal */}
          {editing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
              <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{t("Edit Announcement")}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Modifying record:")} {editing._id}</p>
                  </div>
                  <button onClick={() => setEditing(null)} className="h-10 w-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-all">
                    <span className="material-icons-outlined">close</span>
                  </button>
                </div>

                <form onSubmit={saveEdit} className="p-6 lg:p-8 space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Announcement Title")}</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Content Body")}</label>
                    <textarea
                      className="w-full min-h-[120px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20 transition-all leading-relaxed"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Type")}</label>
                      <select
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-white cursor-pointer outline-none focus:ring-2 focus:ring-teal-500/20"
                        value={editType}
                        onChange={(e) => setEditType(e.target.value as AnnouncementType)}
                      >
                        {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Status")}</label>
                      <select
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-white cursor-pointer outline-none focus:ring-2 focus:ring-teal-500/20"
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as AnnouncementStatus)}
                      >
                        <option value="draft">{t("Draft")}</option>
                        <option value="published">{t("Published")}</option>
                        <option value="archived">{t("Archived")}</option>
                      </select>
                    </div>

                    <div className="lg:col-span-2">
                      <label className="flex items-center gap-2.5 cursor-pointer group">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={editPinned}
                            onChange={(e) => setEditPinned(e.target.checked)}
                            className="sr-only"
                          />
                          <div className={`w-10 h-5 rounded-full transition-colors duration-300 flex items-center px-1 ${editPinned ? 'bg-teal-600' : 'bg-slate-200 dark:bg-slate-800'}`}>
                            <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-sm transform transition-transform duration-300 ${editPinned ? 'translate-x-5' : 'translate-x-0'}`} />
                          </div>
                        </div>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{t("Pinned announcement (appears first)")}</span>
                      </label>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Target Audience")}</label>
                      <input
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20"
                        value={editTargetAudience}
                        onChange={(e) => setEditTargetAudience(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Expiry Date")}</label>
                      <input
                        type="datetime-local"
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-5 py-3 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20"
                        value={editExpiry}
                        onChange={(e) => setEditExpiry(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95"
                    >{t("Discard Changes")}</button>
                    <button
                      type="submit"
                      disabled={savingEdit}
                      className="px-6 py-2.5 rounded-lg bg-teal-600 text-xs font-bold uppercase tracking-widest text-white hover:bg-teal-700 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                    >
                      {savingEdit ? t("Updating...") : t("Commit Updates")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Confirm + Toast */}
          <ConfirmModal
            open={confirmOpen}
            title={confirmTitle}
            description={confirmDesc}
            confirmText={confirmText}
            variant={confirmVariant}
            loading={confirmLoading}
            onCancel={() => {
              if (confirmLoading) return;
              setConfirmOpen(false);
            }}
            onConfirm={runConfirm}
          />
          <Toast open={toastOpen} message={toastMsg} kind={toastKind} onClose={() => setToastOpen(false)} />
        </main>
      </div>
    </div>
  );

};

export default AdminAnnouncements;
