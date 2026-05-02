import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { DetailedCardGridSkeleton, Skeleton } from "../components/Skeleton";
import { User } from "../types";
import { api } from "../lib/api";

type Msg = {
  _id: string;
  sender_id: string;
  receiver_id: string;
  subject: string;
  body: string;
  sent_at?: string;
  is_read: boolean;
  category?: string;
  attachments?: string[];
};

interface Props {
  user: User;
  onLogout: () => void;
}

const CATEGORIES = ["General", "Warning", "Advisor Note", "Enrollment Issue"];

function safeDate(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatListDate(iso?: string) {
  const d = safeDate(iso);
  if (!d) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function formatLocal(iso?: string) {
  const d = safeDate(iso);
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

function formatUtc(iso?: string) {
  const d = safeDate(iso);
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

function previewText(s: string, max = 110) {
  const v = (s || "").replace(/\s+/g, " ").trim();
  if (v.length <= max) return v;
  return v.slice(0, max - 1) + "…";
}

function clsx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function AdminMessages({ user, onLogout }: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // compose
  const [receiverId, setReceiverId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("General");
  const [sending, setSending] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);

  // inbox UI controls
  const [tab, setTab] = useState<"All" | "Unread">("All");
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState<string>("All");
  const [sortDir, setSortDir] = useState<"Newest" | "Oldest">("Newest");

  // selection
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const listTopRef = useRef<HTMLDivElement | null>(null);

  // toast
  const [toast, setToast] = useState<{ type: "success" | "info"; text: string } | null>(null);
  const toastTimerRef = useRef<number | undefined>(undefined);
  type StudentOption = { user_id: string; name: string };
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);

  const [studentIdsLoading, setStudentIdsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [receiverOpen, setReceiverOpen] = useState(false);

  function showToast(text: string, type: "success" | "info" = "success") {
    setToast({ text, type });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2500);
  }

  async function load({ keepSelection = true }: { keepSelection?: boolean } = {}) {
    setLoading(true);
    setError(null);
    try {
      const data = await api.adminMessages();
      const next = Array.isArray(data) ? (data as Msg[]) : [];
      setItems(next);

      if (!keepSelection) {
        setSelectedId(null);
      } else {
        // if selection disappeared, clear (we’ll re-select via effect below)
        if (selectedId && !next.some((m) => m._id === selectedId)) {
          setSelectedId(null);
        }
      }
    } catch (e: any) {
      setError(e?.message || t("Failed to load messages"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      setStudentIdsLoading(true);
      try {
        const data = await api.adminStudentOptions();
        setStudentOptions(Array.isArray(data) ? data : []);
      } catch (e: any) {
        // don’t hard fail the page, just show error banner
        setError(e?.message || t("Failed to load student options"));
        setStudentOptions([]);
      } finally {
        setStudentIdsLoading(false);
      }
    })();
  }, []);

  // auto-open compose if user starts typing
  useEffect(() => {
    if ((receiverId || subject || body) && !composeOpen) {
      setComposeOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiverId, subject, body]);

  const studentMatches = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    const list = studentOptions;

    if (!q) return list.slice(0, 50);

    return list
      .filter((s) => {
        const hay = `${s.user_id} ${s.name}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 50);
  }, [studentOptions, studentSearch]);

  const unreadCount = useMemo(() => items.filter((m) => !m.is_read).length, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...items];

    // tab filter
    if (tab === "Unread") list = list.filter((m) => !m.is_read);

    // category filter
    if (catFilter !== "All") {
      list = list.filter((m) => (m.category ?? "General") === catFilter);
    }

    // search
    if (q) {
      list = list.filter((m) => {
        const hay = `${m._id} ${m.sender_id} ${m.receiver_id} ${m.subject} ${m.body} ${m.category ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
    }

    // sort
    list.sort((a, b) => {
      const da = a.sent_at ?? "";
      const db = b.sent_at ?? "";
      const cmp = db.localeCompare(da);
      return sortDir === "Newest" ? cmp : -cmp;
    });

    return list;
  }, [items, tab, query, catFilter, sortDir]);

  // keep selection valid vs filtered list
  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }

    if (!selectedId) {
      // Keep mobile/tablet in list view when user taps "Back to Inbox".
      // Auto-select only for desktop split-view.
      if (window.innerWidth >= 1280) {
        setSelectedId(filtered[0]._id);
      }
      return;
    }

    if (!filtered.some((m) => m._id === selectedId)) {
      setSelectedId(filtered[0]._id);
    }
  }, [filtered, selectedId]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return items.find((m) => m._id === selectedId) ?? null;
  }, [items, selectedId]);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!receiverId.trim() || !subject.trim() || !body.trim()) {
      setError(t("Receiver ID, subject, and body are required."));
      return;
    }

    setSending(true);
    try {
      await api.adminCreateMessage({
        receiver_id: receiverId.trim(),
        subject: subject.trim(),
        body: body.trim(),
        category: category || "General",
      });

      setReceiverId("");
      setSubject("");
      setBody("");
      setCategory("General");

      await load({ keepSelection: true });
      listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

      showToast(t("Message sent"), "success");
      setComposeOpen(false);
      setReceiverOpen(false);
      setStudentSearch("");
    } catch (e: any) {
      setError(e?.message || t("Failed to send message"));
    } finally {
      setSending(false);
    }
  }

  async function setReadState(messageId: string, nextIsRead: boolean, opts?: { silent?: boolean }) {
    const prev = items.find((m) => m._id === messageId);
    if (!prev) return;

    // optimistic
    setItems((p) => p.map((x) => (x._id === messageId ? { ...x, is_read: nextIsRead } : x)));

    try {
      await api.adminMarkMessageRead(messageId, nextIsRead);
      // don't spam toast for auto-mark-read
      if (!opts?.silent) {
        showToast(nextIsRead ? t("Marked as read") : t("Marked as unread"), "info");
      }
    } catch (e: any) {
      // rollback
      setItems((p) => p.map((x) => (x._id === messageId ? { ...x, is_read: prev.is_read } : x)));
      if (!opts?.silent) setError(e?.message || t("Failed to update read status"));
    }
  }

  async function openMessage(messageId: string) {
    setSelectedId(messageId);

    const m = items.find((x) => x._id === messageId);
    if (m && !m.is_read) {
      await setReadState(messageId, true, { silent: true });
    }
  }

  async function onDelete(messageId: string) {
    const ok = window.confirm(t("Delete this message?"));
    if (!ok) return;

    setError(null);

    const prevItems = items;

    // optimistic remove
    setItems((p) => p.filter((x) => x._id !== messageId));

    // if deleting selected, selection will re-align via filtered+effect after state updates

    try {
      await api.adminDeleteMessage(messageId);
      showToast(t("Message deleted"), "success");
    } catch (e: any) {
      setItems(prevItems);
      setError(e?.message || t("Failed to delete message"));
    }
  }

  async function markAllVisibleAsRead() {
    const toMark = filtered.filter((m) => !m.is_read);
    if (toMark.length === 0) {
      showToast(t("No unread messages in view"), "info");
      return;
    }

    const ids = new Set(toMark.map((m) => m._id));

    // optimistic
    setItems((p) => p.map((x) => (ids.has(x._id) ? { ...x, is_read: true } : x)));

    try {
      await Promise.all(toMark.map((m) => api.adminMarkMessageRead(m._id, true)));
      showToast(`${t("Marked as read")} (${toMark.length})`, "success");
    } catch (e: any) {
      // safest rollback: re-fetch
      await load({ keepSelection: true });
      setError(e?.message || t("Failed to mark all as read"));
    }
  }

  function onRefresh() {
    load({ keepSelection: true });
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 animate-in fade-in duration-700 slide-in-from-bottom-4 scrollbar-hide">
          <div className="flex flex-col gap-10 pb-10 max-w-[1600px] mx-auto">
            {/* Toast */}
            {toast && (
              <div className="fixed right-10 top-10 z-50 animate-in slide-in-from-right-10 duration-500">
                <div
                  className={[
                    "rounded-2xl border px-6 py-4 text-sm font-bold shadow-xl flex items-center gap-3",
                    toast.type === "success"
                      ? "border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300"
                      : "border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white",
                  ].join(" ")}
                >
                  <span className="material-icons-outlined text-lg">{toast.type === "success" ? "verified" : "info"}</span>
                  {toast.text}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300 animate-in fade-in slide-in-from-top-2 flex items-center gap-3">
                <span className="material-icons-outlined">error_outline</span>
                {error}
              </div>
            )}

            {/* Compose (collapsible) */}
            <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:shadow-md">
              <button
                type="button"
                onClick={() => setComposeOpen((v) => !v)}
                className="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-6">
                  <div className="h-12 w-12 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
                    <span className="material-icons-outlined text-2xl">send</span>
                  </div>
                  <div>
                    <div className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{t("New Communication")}</div>
                    <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                      Direct message to student directory
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="hidden sm:block text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    {t("Pending Inbox:")} <span className="text-slate-900 dark:text-white ml-1">{unreadCount}{t(" items")}</span>
                  </div>
                  <div className={`h-10 px-5 rounded-xl flex items-center text-xs font-extrabold uppercase tracking-widest transition-all ${composeOpen ? 'bg-slate-900 text-white' : 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'}`}>
                    {composeOpen ? t("Discard") : t("Compose")}
                  </div>
                </div>
              </button>

              {composeOpen && (
                <div className="px-8 pb-8 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-4 duration-500">
                  <form onSubmit={onSend} className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    {/* Receiver (strict searchable select) */}
                    <div className="xl:col-span-4 relative space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Recipient ID *")}</label>

                      <button
                        type="button"
                        onClick={() => setReceiverOpen((v) => !v)}
                        disabled={studentIdsLoading || studentOptions.length === 0}
                        className={[
                          "w-full rounded-2xl border px-5 py-3.5 text-sm text-left flex items-center justify-between transition-all",
                          "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-white font-bold shadow-sm",
                          (studentIdsLoading || studentOptions.length === 0)
                            ? "opacity-60 cursor-not-allowed"
                            : "hover:border-teal-500/50 focus:ring-4 focus:ring-teal-500/10",
                        ].join(" ")}
                      >
                        <span className={receiverId ? "" : "text-slate-400"}>
                          {receiverId ? (
                            receiverId
                          ) : studentIdsLoading ? (
                            "Syncing directory..."
                          ) : studentOptions.length === 0 ? (
                            "No student found"
                          ) : (
                            "Search TNT-xxxx..."
                          )}
                        </span>
                        <span className="material-icons-outlined text-sm text-slate-400">{receiverOpen ? "expand_less" : "expand_more"}</span>
                      </button>

                      {receiverOpen && (
                        <div className="absolute z-40 mt-3 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
                          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                            <input
                              autoFocus
                              value={studentSearch}
                              onChange={(e) => setStudentSearch(e.target.value)}
                              placeholder={t("Type student name or ID...")}
                              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20"
                            />
                          </div>

                          <div className="max-h-64 overflow-y-auto scrollbar-hide">
                            {studentMatches.length === 0 ? (
                              <div className="p-6 text-center text-sm text-slate-400 italic">{t("No matches in directory.")}</div>
                            ) : (
                              studentMatches.map((s) => (
                                <button
                                  key={s.user_id}
                                  type="button"
                                  onClick={() => {
                                    setReceiverId(s.user_id);
                                    setReceiverOpen(false);
                                    setStudentSearch("");
                                  }}
                                  className={[
                                    "w-full text-left px-6 py-3.5 text-sm transition-all flex items-center justify-between",
                                    s.user_id === receiverId ? "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 font-bold" : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60",
                                  ].join(" ")}
                                >
                                  <span className="font-bold">{s.user_id}</span>
                                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 truncate ml-4">{s.name}</span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="xl:col-span-3 space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Category")}</label>
                      <select
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 px-5 py-3.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-teal-500/10 transition-all cursor-pointer shadow-sm"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c} className="bg-white text-slate-800 dark:bg-slate-900 dark:text-white">
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="xl:col-span-5 space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Subject Title *")}</label>
                      <input
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 px-5 py-3.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-teal-500/10 transition-all shadow-sm placeholder:text-slate-300"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder={t("Purpose of this communication...")}
                      />
                    </div>

                    <div className="xl:col-span-12 space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Message Content *")}</label>
                      <textarea
                        className="w-full min-h-[160px] rounded-[32px] border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 px-8 py-6 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-teal-500/10 transition-all shadow-sm leading-relaxed placeholder:text-slate-300"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder={t("Draft your detailed message here...")}
                      />
                    </div>

                    <div className="xl:col-span-12 flex items-center justify-end gap-4 mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setComposeOpen(false);
                          setReceiverOpen(false);
                          setStudentSearch("");
                        }}
                        className="px-8 py-3 text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={sending}
                        className="rounded-2xl bg-slate-900 dark:bg-slate-800 px-10 py-3 text-sm font-bold text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition-all shadow-lg active:scale-[0.98] disabled:opacity-40"
                      >
                        {sending ? t("Processing...") : t("Dispatch Message")}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Inbox */}
            <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md min-h-[700px]">
              {/* Top bar */}
              <div className="border-b border-slate-100 dark:border-slate-800 px-8 py-8 flex flex-col gap-8 bg-slate-50/30 dark:bg-slate-950/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{t("Communication Logs")}</h3>
                      <div className="px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border border-slate-300 dark:border-slate-700">
                        {filtered.length}{t(" of ")}{items.length}{t(" records")}
                      </div>
                    </div>
                    <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
                      {t("Archive of all dispatched and received communications.")}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={onRefresh}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-2.5 text-xs font-bold text-slate-700 dark:text-white shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-[0.98]"
                      disabled={loading}
                    >
                      <span className={clsx("material-icons-outlined text-sm", loading && "animate-spin")}>sync</span>
                      Sync
                    </button>
                    <button
                      type="button"
                      onClick={markAllVisibleAsRead}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition-all active:scale-[0.98]"
                    >
                      Mark All as Read
                    </button>
                  </div>
                </div>

                <div className="flex flex-col xl:flex-row gap-6">
                  {/* Tabs */}
                  <div className="flex items-center gap-1.5 bg-slate-200/50 dark:bg-slate-950 p-1.5 rounded-2xl shrink-0 border border-slate-200/50 dark:border-slate-800/50">
                    <button
                      type="button"
                      onClick={() => setTab("All")}
                      className={clsx(
                        "flex-1 xl:flex-none rounded-xl px-6 py-2.5 text-xs font-bold transition-all uppercase tracking-widest",
                        tab === "All"
                          ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      )}
                    >
                      Archive
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab("Unread")}
                      className={clsx(
                        "flex-1 xl:flex-none rounded-xl px-6 py-2.5 text-xs font-bold transition-all uppercase tracking-widest flex items-center justify-center gap-3",
                        tab === "Unread"
                          ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      )}
                    >
                      Unread
                      {unreadCount > 0 && (
                        <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
                      )}
                    </button>
                  </div>

                  {/* Search + filters */}
                  <div className="flex-1 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1 group">
                      <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors text-lg">
                        search
                      </span>
                      <input
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 pl-12 pr-4 py-3 text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500/50 outline-none transition-all shadow-sm"
                        placeholder={t("Search logs...")}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>

                    <select
                      className="md:w-48 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-5 py-3 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-4 focus:ring-teal-500/10 transition-all cursor-pointer shadow-sm"
                      value={catFilter}
                      onChange={(e) => setCatFilter(e.target.value)}
                    >
                      <option value="All">{t("All Categories")}</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{t(c)}</option>
                      ))}
                    </select>

                    <select
                      className="md:w-40 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-5 py-3 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-4 focus:ring-teal-500/10 transition-all cursor-pointer shadow-sm"
                      value={sortDir}
                      onChange={(e) => setSortDir(e.target.value as any)}
                    >
                      <option value="Newest">{t("Newest First")}</option>
                      <option value="Oldest">{t("Oldest First")}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Two-panel body */}
              <div className="grid grid-cols-1 xl:grid-cols-12 flex-1 min-h-0">
                {/* LEFT: list */}
                <div
                  className={clsx(
                    "xl:col-span-5 2xl:col-span-4 border-r border-slate-100 dark:border-slate-800 min-h-0 flex flex-col bg-slate-50/10 dark:bg-slate-950/10",
                    selectedId && "hidden xl:flex"
                  )}
                >
                  <div ref={listTopRef} />

                  {loading ? (
                    <div className="p-8">
                      <DetailedCardGridSkeleton count={3} />
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="p-20 text-center">
                      <div className="h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center mx-auto mb-6">
                        <span className="material-icons-outlined text-slate-300 text-3xl">inbox</span>
                      </div>
                      <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">{t("No logs found")}</div>
                      <div className="mt-2 text-xs text-slate-400 font-medium">{t("Try clearing your filters.")}</div>
                    </div>
                  ) : (
                    <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50 scrollbar-hide">
                      {filtered.map((m) => {
                        const isSelected = m._id === selectedId;
                        const isUnread = !m.is_read;

                        return (
                          <button
                            key={m._id}
                            onClick={() => openMessage(m._id)}
                            className={clsx(
                              "w-full text-left px-8 py-6 transition-all group relative",
                              isSelected
                                ? "bg-white dark:bg-slate-800 shadow-md z-10 scale-[1.02] border-y border-slate-200 dark:border-slate-700"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                            )}
                          >
                            {isSelected && (
                              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-teal-500 rounded-r-full" />
                            )}
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center justify-between gap-3">
                                <span
                                  className={clsx(
                                    "text-[9px] font-extrabold uppercase tracking-widest px-2 py-1 rounded-md border",
                                    m.category === "Warning"
                                      ? "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-900"
                                      : "bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-900"
                                  )}
                                >
                                  {t(m.category ?? "General")}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">
                                  {formatListDate(m.sent_at)}
                                </span>
                              </div>

                              <div
                                className={clsx(
                                  "text-sm line-clamp-1 transition-colors leading-snug",
                                  isSelected
                                    ? "text-slate-900 dark:text-white font-extrabold"
                                    : isUnread
                                    ? "text-slate-900 dark:text-white font-bold"
                                    : "text-slate-600 dark:text-slate-400 font-medium"
                                )}
                              >
                                {m.subject || t("(No subject)")}
                              </div>

                              <div
                                className={clsx(
                                  "text-xs line-clamp-2 leading-relaxed",
                                  isUnread
                                    ? "text-slate-600 dark:text-slate-300 font-medium"
                                    : "text-slate-400 dark:text-slate-500"
                                )}
                              >
                                {previewText(m.body, 85)}
                              </div>

                              <div className="flex items-center gap-3 pt-1">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800" />
                                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">{t("TO: ")}{m.receiver_id}</span>
                                </div>
                                {isUnread && (
                                  <div className="ml-auto h-2 w-2 rounded-full bg-teal-500 shadow-sm" />
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* RIGHT: detail */}
                <div
                  className={clsx(
                    "xl:col-span-7 2xl:col-span-8 min-h-0 flex flex-col bg-white dark:bg-slate-950/50",
                    !selectedId && "hidden xl:flex"
                  )}
                >
                  {!selected ? (
                    <div className="h-full flex flex-col items-center justify-center p-20 text-slate-300 dark:text-slate-700">
                      <div className="text-8xl mb-8 opacity-10">{t("Mail")}</div>
                      <div className="text-lg font-bold uppercase tracking-[0.3em] mb-2">{t("Selection Required")}</div>
                      <div className="text-sm font-medium">{t("Select a communication record to expand details")}</div>
                    </div>
                  ) : (
                    <div className="h-full min-h-0 flex flex-col animate-in fade-in duration-500">
                      {/* mobile back button */}
                      <div className="xl:hidden px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                        <button onClick={() => setSelectedId(null)} className="flex items-center gap-2 text-xs font-bold text-teal-600">
                          <span className="material-icons-outlined text-sm">west</span>
                          Inbox Overview
                        </button>
                      </div>

                      {/* detail header */}
                      <div className="px-10 py-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-8 bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-6">
                            <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border border-teal-100 dark:border-teal-800">
                              {t(selected.category ?? "Institutional")}
                            </span>

                            <span
                              className={clsx(
                                "text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border",
                                selected.is_read
                                  ? "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900"
                              )}
                            >
                              {selected.is_read ? t("Archived") : t("Unread")}
                            </span>
                          </div>

                          <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight mb-8">
                            {selected.subject || t("(No subject)")}
                          </h2>

                          <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
                            <div className="space-y-1.5">
                              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Recipient")}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 text-[10px] font-bold">S</div>
                                <span className="text-sm font-bold text-slate-900 dark:text-white">{selected.receiver_id}</span>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Dispatch Timestamp")}</span>
                              <span className="block text-sm font-bold text-slate-700 dark:text-slate-300">{formatLocal(selected.sent_at)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 shrink-0">
                          <button
                            onClick={() => setReadState(selected._id, !selected.is_read)}
                            className="w-full sm:w-40 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all"
                          >
                            {selected.is_read ? t("Mark Unread") : t("Mark Read")}
                          </button>

                          <button
                            onClick={() => onDelete(selected._id)}
                            className="w-full sm:w-40 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 px-6 py-3 text-[11px] font-bold uppercase tracking-widest hover:bg-rose-100 transition-all border border-rose-100 dark:border-rose-900/40"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* body */}
                      <div className="flex-1 overflow-y-auto p-10 lg:p-16 scrollbar-hide">
                        <div className="whitespace-pre-wrap text-lg text-slate-700 dark:text-slate-200 leading-relaxed font-normal max-w-4xl">
                          {selected.body || "—"}
                        </div>

                        {/* attachments */}
                        {selected.attachments && selected.attachments.length > 0 && (
                          <div className="mt-20 pt-10 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-8">
                              <span className="material-icons-outlined text-lg">attach_file</span>
                              Attached Assets
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {selected.attachments.map((a, idx) => (
                                <button
                                  key={`${a}-${idx}`}
                                  className="group flex items-center justify-between p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm hover:border-teal-500/50 transition-all"
                                >
                                  <div className="flex items-center gap-4">
                                    <span className="material-icons-outlined text-slate-300 group-hover:text-teal-500 transition-colors">description</span>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate max-w-[200px]">{a}</span>
                                  </div>
                                  <span className="material-icons-outlined text-slate-300 group-hover:text-teal-500 transition-colors">download</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

    </div>
  );
}
