import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { User } from "../types";
import { api } from "../lib/api";
import { API_BASE_URL } from "../lib/apiBase";

interface CoursesProps {
  user: User;
  onLogout: () => void;
}

type CourseRow = {
  id: string;
  course_code: string;
  title: string;
  department: string;
  credits: number;
  type: string;
  instructor?: string;
  schedule: string[];
  room?: string;
  description?: string;
  prerequisites: string[];
  semester: string[];

  //  NEW
  major?: string;
  track?: string;
};

const API_BASE = API_BASE_URL;

/**
 *  Semester dropdown options (edit as you like)
 */
const SEMESTER_OPTIONS: { label: string; value: string }[] = [
  // NEW system (up to 4 years)
  { label: "New • 1st Year • First Sem", value: "New • 1st Year • First Sem" },
  { label: "New • 1st Year • Second Sem", value: "New • 1st Year • Second Sem" },
  { label: "New • 2nd Year • First Sem", value: "New • 2nd Year • First Sem" },
  { label: "New • 2nd Year • Second Sem", value: "New • 2nd Year • Second Sem" },
  { label: "New • 3rd Year • First Sem", value: "New • 3rd Year • First Sem" },
  { label: "New • 3rd Year • Second Sem", value: "New • 3rd Year • Second Sem" },
  { label: "New • 4th Year • First Sem", value: "New • 4th Year • First Sem" },
  { label: "New • 4th Year • Second Sem", value: "New • 4th Year • Second Sem" },

  // OLD system (up to 5 years)
  { label: "Old • 1st Year • First Sem", value: "Old • 1st Year • First Sem" },
  { label: "Old • 1st Year • Second Sem", value: "Old • 1st Year • Second Sem" },
  { label: "Old • 2nd Year • First Sem", value: "Old • 2nd Year • First Sem" },
  { label: "Old • 2nd Year • Second Sem", value: "Old • 2nd Year • Second Sem" },
  { label: "Old • 3rd Year • First Sem", value: "Old • 3rd Year • First Sem" },
  { label: "Old • 3rd Year • Second Sem", value: "Old • 3rd Year • Second Sem" },
  { label: "Old • 4th Year • First Sem", value: "Old • 4th Year • First Sem" },
  { label: "Old • 4th Year • Second Sem", value: "Old • 4th Year • Second Sem" },
  { label: "Old • 5th Year • First Sem", value: "Old • 5th Year • First Sem" },
  { label: "Old • 5th Year • Second Sem", value: "Old • 5th Year • Second Sem" },
];

// -----------------------------
// Toast system
// -----------------------------
type ToastType = "success" | "error" | "info";
type Toast = { id: string; type: ToastType; title: string; message?: string };

function ToastHost({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="fixed z-[9999] right-4 bottom-4 space-y-3 w-[360px] max-w-[92vw]">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="rounded-xl border shadow-lg p-4 bg-white dark:bg-surface-dark dark:border-gray-700 animate-[toastIn_.18s_ease-out]"
        >
          <div className="flex items-start gap-3">
            <div
              className={[
                "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                toast.type === "success"
                  ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                  : toast.type === "error"
                  ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                  : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
              ].join(" ")}
            >
              <span className="material-icons-outlined">
                {toast.type === "success" ? "check_circle" : toast.type === "error" ? "error" : "info"}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-gray-900 dark:text-white">{toast.title}</div>
              {toast.message ? <div className="mt-1 text-xs text-gray-600 dark:text-gray-300 break-words">{toast.message}</div> : null}
            </div>

            <button onClick={() => onDismiss(toast.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" title="Dismiss">
              <span className="material-icons-outlined text-base">close</span>
            </button>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes toastIn {
          from { transform: translateY(8px); opacity: 0; }
          to { transform: translateY(0px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// -----------------------------
// Confirm modal
// -----------------------------
function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Confirm",
  danger = false,
  onCancel,
  onConfirm,
  loading,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div
              className={[
                "h-10 w-10 rounded-xl flex items-center justify-center",
                danger ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300" : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
              ].join(" ")}
            >
              <span className="material-icons-outlined">{danger ? "delete_forever" : "help"}</span>
            </div>
            <div className="min-w-0">
              <div className="font-bold text-gray-900 dark:text-white">{title}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{message}</div>
            </div>
          </div>
        </div>

        <div className="p-5 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={!!loading}
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800"
          >{t("Cancel")}</button>
          <button
            onClick={onConfirm}
            disabled={!!loading}
            className={["rounded-xl px-4 py-2 text-sm font-medium text-white", danger ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary-hover"].join(" ")}
          >
            {loading ? "Working..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------
// Multi-select dropdown + selected chips
// -----------------------------
function MultiSelectChips({
  label,
  options,
  selected,
  onChange,
  placeholder = "Select...",
  helper,
}: {
  label: string;
  options: { label: string; value: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  helper?: string;
}) {
  const { t } = useTranslation();
  const add = (val: string) => {
    if (!val) return;
    if (selected.includes(val)) return;
    onChange([...selected, val]);
  };

  const remove = (val: string) => {
    onChange(selected.filter((x) => x !== val));
  };

  return (
    <div>
      <label className="text-xs font-bold text-gray-500 dark:text-gray-400">{label}</label>

      <div className="mt-2 flex flex-col sm:flex-row gap-3">
        <select
          className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 text-gray-700 dark:text-gray-200"
          value=""
          onChange={(e) => add(e.target.value)}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {helper ? <div className="sm:self-center text-[11px] text-gray-400">{helper}</div> : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {selected.length ? (
          selected.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 px-3 py-1 text-xs text-gray-700 dark:text-gray-200"
            >
              <span className="material-icons-outlined text-[16px] text-gray-400">check</span>
              {s}
              <button onClick={() => remove(s)} className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" type="button">
                <span className="material-icons-outlined text-[16px]">close</span>
              </button>
            </span>
          ))
        ) : (
          <div className="text-xs text-gray-500 dark:text-gray-400">{t("None selected.")}</div>
        )}
      </div>
    </div>
  );
}

// -----------------------------
// NEW: Free-type tag input for schedule
// -----------------------------
function TagInput({
  label,
  values,
  onChange,
  placeholder,
  helper,
}: {
  label: string;
  values: string[];
  onChange: (vals: string[]) => void;
  placeholder?: string;
  helper?: string;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState("");

  const add = (raw: string) => {
    const v = (raw ?? "").trim();
    if (!v) return;
    if (values.includes(v)) return;
    onChange([...values, v]);
    setText("");
  };

  const remove = (v: string) => onChange(values.filter((x) => x !== v));

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      add(text);
    }
    if (e.key === "Backspace" && !text && values.length) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div>
      <label className="text-xs font-bold text-gray-500 dark:text-gray-400">{label}</label>

      <div className="mt-2 flex gap-2">
        <input
          className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 text-gray-700 dark:text-gray-200"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
        />
        <button type="button" onClick={() => add(text)} className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover">{t("Add")}</button>
      </div>

      {helper ? <div className="mt-2 text-[11px] text-gray-400">{helper}</div> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {values.length ? (
          values.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 px-3 py-1 text-xs text-gray-700 dark:text-gray-200"
            >
              <span className="material-icons-outlined text-[16px] text-gray-400">schedule</span>
              {s}
              <button onClick={() => remove(s)} className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" type="button">
                <span className="material-icons-outlined text-[16px]">close</span>
              </button>
            </span>
          ))
        ) : (
          <div className="text-xs text-gray-500 dark:text-gray-400">{t("No schedule added.")}</div>
        )}
      </div>
    </div>
  );
}

// -----------------------------
// Helpers
// -----------------------------
function normalizeSemester(raw: any): string[] {
  if (!raw) return [];
  if (typeof raw === "string") return raw.trim() ? [raw.trim()] : [];
  if (Array.isArray(raw)) {
    const out: string[] = [];
    for (const item of raw) {
      if (!item) continue;
      if (typeof item === "string") {
        const s = item.trim();
        if (s) out.push(s);
      } else if (typeof item === "object") {
        const s = String(item.semester ?? "").trim();
        if (s) out.push(s);
      } else {
        const s = String(item).trim();
        if (s) out.push(s);
      }
    }
    return out;
  }
  return [];
}

function normalizeSchedule(raw: any): string[] {
  if (!raw) return [];
  if (typeof raw === "string") return raw.trim() ? [raw.trim()] : [];
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean);
  return [];
}

function uniqSorted(xs: string[]) {
  return Array.from(new Set(xs)).sort((a, b) => a.localeCompare(b));
}

function safeStr(v: any, fallback = "—") {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
}

// FIX: normalize semester text so filtering always matches
function canonPeriod(v: any) {
    return String(v ?? "")
      .replace(/\u00A0/g, " ")        // convert invisible NBSP → normal space
      .toLowerCase()
      .replace(/[•·∙]/g, ".")         // normalize bullet variants
      .replace(/\s*\.\s*/g, ".")      // normalize dot spacing
      .replace(/\s+/g, " ")           // collapse double spaces
      .trim();
  }


function currencyId() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

// -----------------------------
// Wizard Modal (Add/Edit)
// -----------------------------
type WizardMode = "create" | "edit";

type CourseDraft = {
  course_code: string;
  title: string;
  department: string;
  credits: string;
  type: string;
  instructor: string;

  //  NEW
  major: string;
  track: string;

  room: string;
  description: string;
  prerequisites: string[];
  schedule: string[];
  semester: string[];
};

const CourseWizardModal = React.memo(function CourseWizardModal({
  open,
  mode,
  initial,
  busy,
  onClose,
  onSubmit,
  prerequisiteOptions,
}: {
  open: boolean;
  mode: WizardMode;
  initial: CourseDraft;
  busy: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => Promise<void>;
  prerequisiteOptions: { label: string; value: string }[];
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<CourseDraft>(initial);

  const titleRef = useRef<HTMLInputElement | null>(null);
  const codeRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setDraft(initial);

    setTimeout(() => {
      if (mode === "create") codeRef.current?.focus();
      else titleRef.current?.focus();
    }, 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const isCreate = mode === "create";
  const steps = ["Fundamentals", "Matrix Sync", "Dependencies", "Verification"];

  const setField = (k: keyof CourseDraft, v: any) => setDraft((p) => ({ ...p, [k]: v }));

  const canNextStep0 =
    (!isCreate || draft.course_code.trim()) &&
    draft.title.trim() &&
    draft.department.trim() &&
    draft.credits.trim() &&
    Number.isFinite(Number(draft.credits)) &&
    Number(draft.credits) > 0;

  const headerTitle = isCreate ? "Initialize Curriculum Node" : `Modify Curriculum (${draft.course_code})`;

  const submit = async () => {
    const creditsNum = Number(draft.credits);

    const payload: any = {
      title: draft.title.trim(),
      department: draft.department.trim(),
      credits: creditsNum,
      type: draft.type,
      instructor: draft.instructor.trim() ? draft.instructor.trim() : null,

      //  NEW
      major: draft.major.trim() ? draft.major.trim() : null,
      track: draft.track.trim() ? draft.track.trim() : null,

      room: draft.room.trim() ? draft.room.trim() : null,
      description: draft.description.trim() ? draft.description.trim() : null,
      prerequisites: draft.prerequisites ?? [],
      schedule: draft.schedule ?? [],
      semester: (draft.semester ?? []).map((s) => ({ semester: s })),
    };

    if (isCreate) payload.course_code = draft.course_code.trim();

    await onSubmit(payload);
  };

  const pill = (active: boolean) =>
    active 
      ? "bg-slate-900 dark:bg-teal-600 text-white shadow-lg" 
      : "bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border border-slate-100 dark:border-slate-700";

  const canOpenStep = (idx: number) => idx === 0 || canNextStep0;

  return (
    <div className="fixed inset-0 z-[9997] flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-8 animate-in fade-in duration-500">
      <div className="w-full max-w-4xl max-h-[90vh] rounded-[40px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-500">
        <div className="px-10 py-8 border-b border-slate-50 dark:border-slate-800 flex items-start justify-between gap-8 shrink-0 bg-slate-50/30 dark:bg-slate-950/20">
          <div className="min-w-0 space-y-4">
            <div className="space-y-1">
              <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{headerTitle}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{t("Curriculum Provisioning Wizard")}</div>
            </div>

            <div className="flex flex-wrap gap-3">
              {steps.map((s, idx) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => canOpenStep(idx) && setStep(idx)}
                  disabled={busy || !canOpenStep(idx)}
                  className={[
                    "h-10 px-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30",
                    pill(idx === step),
                  ].join(" ")}
                >
                  {idx + 1}. {s}
                </button>
              ))}
            </div>
          </div>

          <button onClick={onClose} disabled={busy} className="h-12 w-12 rounded-full flex items-center justify-center text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-rose-500 transition-all shadow-sm">
            <span className="material-icons-outlined text-2xl">close</span>
          </button>
        </div>

        <div className="p-10 lg:p-12 overflow-y-auto scrollbar-hide flex-1">
          {/* Step 0 */}
          {step === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {isCreate && (
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">{t("Protocol Code")}</label>
                  <input
                    ref={codeRef}
                    className="w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 px-6 py-4 font-bold text-sm focus:ring-4 focus:ring-teal-500/10 outline-none transition-all dark:text-white placeholder:text-slate-300"
                    value={draft.course_code}
                    onChange={(e) => setField("course_code", e.target.value)}
                    placeholder={t("e.g. CST-1010")}
                  />
                  <p className="px-1 text-[9px] font-bold text-slate-300 uppercase tracking-tighter italic">{t("Persistent unique identifier.")}</p>
                </div>
              )}

              <div className={isCreate ? "space-y-2" : "md:col-span-2 space-y-2"}>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">{t("Nomenclature")}</label>
                <input
                  ref={titleRef}
                  className="w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 px-6 py-4 font-bold text-sm focus:ring-4 focus:ring-teal-500/10 outline-none transition-all dark:text-white placeholder:text-slate-300"
                  value={draft.title}
                  onChange={(e) => setField("title", e.target.value)}
                  placeholder={t("Official course designation")}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">{t("Department Hub")}</label>
                <input
                  className="w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 px-6 py-4 font-bold text-sm focus:ring-4 focus:ring-teal-500/10 outline-none transition-all dark:text-white placeholder:text-slate-300"
                  value={draft.department}
                  onChange={(e) => setField("department", e.target.value)}
                  placeholder={t("e.g. Computer Science")}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">{t("Credit Weight (CU)")}</label>
                <input
                  className="w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 px-6 py-4 font-bold text-sm focus:ring-4 focus:ring-teal-500/10 outline-none transition-all dark:text-white placeholder:text-slate-300"
                  value={draft.credits}
                  onChange={(e) => setField("credits", e.target.value)}
                  placeholder={t("e.g. 3.0")}
                  inputMode="decimal"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">{t("Classification")}</label>
                <select
                  className="w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-6 py-4 font-bold text-sm outline-none transition-all dark:text-white cursor-pointer focus:ring-4 focus:ring-teal-500/10"
                  value={draft.type}
                  onChange={(e) => setField("type", e.target.value)}
                >
                  <option value="Core">{t("Core Registry")}</option>
                  <option value="Elective">{t("Elective Matrix")}</option>
                  <option value="Major">{t("Specialization")}</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">{t("Lead Academic")}</label>
                <input
                  className="w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 px-6 py-4 font-bold text-sm focus:ring-4 focus:ring-teal-500/10 outline-none transition-all dark:text-white placeholder:text-slate-300"
                  value={draft.instructor}
                  onChange={(e) => setField("instructor", e.target.value)}
                  placeholder={t("Optional")}
                />
              </div>

              {/*  NEW */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">{t("Major Alignment")}</label>
                <input
                  className="w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 px-6 py-4 font-bold text-sm focus:ring-4 focus:ring-teal-500/10 outline-none transition-all dark:text-white placeholder:text-slate-300"
                  value={draft.major}
                  onChange={(e) => setField("major", e.target.value)}
                  placeholder={t("e.g. Software Engineering")}
                />
              </div>

              {/*  NEW */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">{t("Track Vector")}</label>
                <input
                  className="w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 px-6 py-4 font-bold text-sm focus:ring-4 focus:ring-teal-500/10 outline-none transition-all dark:text-white placeholder:text-slate-300"
                  value={draft.track}
                  onChange={(e) => setField("track", e.target.value)}
                  placeholder={t("e.g. CS / CT")}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">{t("Vector Room")}</label>
                <input
                  className="w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 px-6 py-4 font-bold text-sm focus:ring-4 focus:ring-teal-500/10 outline-none transition-all dark:text-white placeholder:text-slate-300"
                  value={draft.room}
                  onChange={(e) => setField("room", e.target.value)}
                  placeholder={t("Optional")}
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">{t("Abstract Description")}</label>
                <textarea
                  className="w-full rounded-[24px] border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 px-6 py-4 font-medium text-sm focus:ring-4 focus:ring-teal-500/10 outline-none transition-all dark:text-white placeholder:text-slate-300"
                  rows={4}
                  value={draft.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder={t("Comprehensive course overview...")}
                />
              </div>
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="rounded-[32px] border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 p-8 space-y-6">
                <MultiSelectChips
                  label="Academic Periods"
                  options={SEMESTER_OPTIONS}
                  selected={draft.semester}
                  onChange={(vals) => setField("semester", vals)}
                  placeholder={t("Select valid intervals...")}
                  helper={t("Concurrent period selection supported.")}
                />
              </div>

              <div className="rounded-[32px] border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 p-8 space-y-6">
                <TagInput
                  label="Execution Schedule"
                  values={draft.schedule}
                  onChange={(vals) => setField("schedule", vals)}
                  placeholder={t('e.g. "Interval 10:00 - 11:30 (Alpha)"')}
                  helper={t("Tip: ENTER to commit node. BACKSPACE to purge.")}
                />
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="rounded-[32px] border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 p-8 space-y-6">
                <MultiSelectChips
                  label="System Prerequisites"
                  options={prerequisiteOptions}
                  selected={draft.prerequisites}
                  onChange={(vals) => setField("prerequisites", vals)}
                  placeholder={t("Audit existing curriculum...")}
                  helper={t("Map required parent nodes for this curriculum sequence.")}
                />
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="rounded-[40px] border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 p-10 space-y-10">
                <div className="space-y-2">
                  <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">{draft.title || "Untitled Node"}</div>
                  <div className="flex items-center gap-4 text-xs font-black text-slate-400 uppercase tracking-widest">
                    <span className="font-mono text-teal-600">{draft.course_code || "PENDING"}</span>
                    <span className="opacity-20">•</span>
                    <span>{draft.department || "DEPT_NULL"}</span>
                    <span className="opacity-20">•</span>
                    <span>{draft.type || "TYPE_NULL"}</span>
                    <span className="opacity-20">•</span>
                    <span className="text-slate-900 dark:text-white">{Number(draft.credits || 0).toFixed(1)} CU</span>
                  </div>
                </div>

                {(draft.major.trim() || draft.track.trim()) && (
                  <div className="flex flex-wrap gap-3">
                    {draft.major.trim() && (
                      <span className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 shadow-sm">
                        <span className="material-icons-outlined text-sm opacity-40">badge</span>
                        Major: {draft.major.trim()}
                      </span>
                    )}
                    {draft.track.trim() && (
                      <span className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 shadow-sm">
                        <span className="material-icons-outlined text-sm opacity-40">timeline</span>
                        Track: {draft.track.trim()}
                      </span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rounded-[24px] bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-6 space-y-4 shadow-sm">
                    <div className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">{t("Active Periods")}</div>
                    <div className="flex flex-wrap gap-2">
                      {draft.semester.length ? (
                        draft.semester.map((s) => (
                          <span key={s} className="px-3 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs font-bold text-slate-200 italic">{t("No periods assigned.")}</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[24px] bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-6 space-y-4 shadow-sm">
                    <div className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">{t("Matrix Schedule")}</div>
                    <div className="space-y-2">
                      {draft.schedule.length ? (
                        draft.schedule.map((s, i) => (
                          <div key={i} className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                            {s}
                          </div>
                        ))
                      ) : (
                        <span className="text-xs font-bold text-slate-200 italic">{t("Unscheduled.")}</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[24px] bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-6 space-y-4 md:col-span-2 shadow-sm">
                    <div className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">{t("Logical Dependencies")}</div>
                    <div className="flex flex-wrap gap-2">
                      {draft.prerequisites.length ? (
                        draft.prerequisites.map((p) => (
                          <span key={p} className="px-3 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-tighter">
                            {p}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs font-bold text-slate-200 italic">{t("No dependencies found.")}</span>
                      )}
                    </div>
                  </div>
                </div>

                {draft.description.trim() ? (
                  <div className="px-4 text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed italic border-l-4 border-slate-100 dark:border-slate-800">
                    "{draft.description.trim()}"
                  </div>
                ) : (
                  <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest text-center py-4 italic opacity-50">{t("Abstract Manifest Missing")}</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-10 py-8 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between gap-6 shrink-0 bg-slate-50/30 dark:bg-slate-950/20">
          <button
            onClick={onClose}
            disabled={busy}
            className="h-14 px-8 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 transition-all active:scale-95"
          >{t("Abort Wizard")}</button>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={busy || step === 0}
              className="h-14 px-8 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 dark:text-white transition-all active:scale-95 disabled:opacity-20 shadow-sm hover:bg-slate-50"
            >{t("Previous")}</button>

            {step < 3 ? (
              <button
                onClick={() => setStep((s) => Math.min(3, s + 1))}
                disabled={busy || (step === 0 && !canNextStep0)}
                className="h-14 px-10 rounded-2xl bg-slate-900 dark:bg-teal-600 font-black text-[10px] uppercase tracking-[0.2em] text-white transition-all active:scale-95 disabled:opacity-30 shadow-xl shadow-slate-200 dark:shadow-teal-900/20"
              >{t("Proceed")}</button>
            ) : (
              <button
                onClick={submit}
                disabled={busy}
                className="h-14 px-12 rounded-2xl bg-slate-900 dark:bg-teal-600 font-black text-[10px] uppercase tracking-[0.3em] text-white transition-all active:scale-95 disabled:opacity-30 shadow-xl shadow-slate-200 dark:shadow-teal-900/20 flex items-center gap-3"
              >
                {busy ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{t("Synchronizing...")}</span>
                  </>
                ) : (
                  <>
                    <span>{t("Execute Commit")}</span>
                    <span className="material-icons-outlined text-lg">verified</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// -----------------------------
// Skeleton cards
// -----------------------------
function CourseCardSkeleton() {
  return (
    <div className="rounded-[32px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm animate-pulse">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800 rounded-lg mb-4 opacity-60" />
          <div className="h-8 w-3/4 bg-slate-100 dark:bg-slate-800 rounded-lg mb-3" />
          <div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-800 rounded-lg" />
          <div className="mt-8 flex flex-wrap gap-3">
            <div className="h-8 w-20 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            <div className="h-8 w-32 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          </div>
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          <div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

// -----------------------------
// Main component
// -----------------------------
const AdminCourses: React.FC<CoursesProps> = ({ user, onLogout }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [rawCourses, setRawCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [semesterFilter, setSemesterFilter] = useState<string>("");

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = (type: ToastType, title: string, message?: string) => {
    const id = currencyId();
    setToasts((p) => [...p, { id, type, title, message }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3200);
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmCourseCode, setConfirmCourseCode] = useState<string | null>(null);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<"create" | "edit">("create");
  const [wizardInitial, setWizardInitial] = useState<CourseDraft>({
    course_code: "",
    title: "",
    department: "",
    credits: "",
    type: "Elective",
    instructor: "",

    //  NEW
    major: "",
    track: "",

    room: "",
    description: "",
    prerequisites: [],
    schedule: [],
    semester: [],
  });

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const data = await api.adminCourses();
      setRawCourses(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast("error", "Failed to load courses", e?.message || "Unknown error");
      setRawCourses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const courses: CourseRow[] = useMemo(() => {
    return (rawCourses || []).map((c) => {
      const courseCode = String(c.course_code ?? "");
      return {
        id: String(c._id ?? courseCode),
        course_code: courseCode,
        title: safeStr(c.title),
        department: safeStr(c.department),
        credits: Number(c.credits ?? 0) || 0,
        type: safeStr(c.type, "Elective"),
        instructor: c.instructor ? String(c.instructor) : "",
        schedule: normalizeSchedule(c.schedule),

        //  NEW
        major: c.major ? String(c.major) : "",
        track: c.track ? String(c.track) : "",

        room: c.room ? String(c.room) : "",
        description: c.description ? String(c.description) : "",
        prerequisites: Array.isArray(c.prerequisites) ? c.prerequisites.map((x: any) => String(x)) : [],
        semester: normalizeSemester(c.semester),
      };
    });
  }, [rawCourses]);

  const prerequisiteOptions = useMemo(() => {
    return uniqSorted(courses.map((c) => `${c.course_code} — ${c.title}`)).map((label) => {
      const code = label.split(" — ")[0];
      return { label, value: code };
    });
  }, [courses]);

  const departments = useMemo(() => uniqSorted(courses.map((c) => c.department).filter((d) => d && d !== "—")), [courses]);
  const types = useMemo(() => uniqSorted(courses.map((c) => String(c.type)).filter(Boolean)), [courses]);

  const semesterOptions = useMemo(() => {
    const all = courses.flatMap((c) => c.semester || []);
    return uniqSorted(all);
  }, [courses]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((c) => {
      const matchesSearch =
        !q || c.course_code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || (c.instructor ?? "").toLowerCase().includes(q);
      const matchesDept = !deptFilter || c.department === deptFilter;
      const matchesType = !typeFilter || String(c.type) === typeFilter;
      const matchesSemester =
        !semesterFilter ||
        (c.semester || []).some((s) => canonPeriod(s) === canonPeriod(semesterFilter));
      return matchesSearch && matchesDept && matchesType && matchesSemester;
    });
  }, [courses, search, deptFilter, typeFilter, semesterFilter]);

  const openCreate = () => {
    setWizardMode("create");
    setWizardInitial({
      course_code: "",
      title: "",
      department: "",
      credits: "",
      type: "Elective",
      instructor: "",

      //  NEW
      major: "",
      track: "",

      room: "",
      description: "",
      prerequisites: [],
      schedule: [],
      semester: [],
    });
    setWizardOpen(true);
  };

  const openEdit = (course: CourseRow) => {
    setWizardMode("edit");
    setWizardInitial({
      course_code: course.course_code,
      title: course.title ?? "",
      department: course.department ?? "",
      credits: String(course.credits ?? ""),
      type: course.type ?? "Elective",
      instructor: course.instructor ?? "",

      //  NEW
      major: course.major ?? "",
      track: course.track ?? "",

      room: course.room ?? "",
      description: course.description ?? "",
      prerequisites: Array.isArray(course.prerequisites) ? course.prerequisites : [],
      schedule: Array.isArray(course.schedule) ? course.schedule : [],
      semester: Array.isArray(course.semester) ? course.semester : [],
    });
    setWizardOpen(true);
  };

  const handleWizardSubmit = async (payload: any) => {
    try {
      setMutating(true);

      if (wizardMode === "create") {
        await api.adminCreateCourse(payload);
        toast("success", "Course created", payload.course_code);
      } else {
        const code = wizardInitial.course_code;
        await api.adminUpdateCourse(code, payload);
        toast("success", "Course updated", code);
      }

      setWizardOpen(false);
      await fetchCourses();
    } catch (e: any) {
      toast("error", "Save failed", e?.message || "Unknown error");
    } finally {
      setMutating(false);
    }
  };

  const askDelete = (courseCode: string) => {
    setConfirmCourseCode(courseCode);
    setConfirmOpen(true);
  };

  const doDelete = async () => {
    if (!confirmCourseCode) return;
    try {
      setMutating(true);

      const res = await fetch(`${API_BASE}/api/v1/admin/courses/${encodeURIComponent(confirmCourseCode)}`, {
        method: "DELETE",
        credentials: "include",
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        const msg = data?.detail || data?.message || `Request failed (${res.status})`;
        throw new Error(msg);
      }

      toast("success", "Course deleted", confirmCourseCode);
      setConfirmOpen(false);
      setConfirmCourseCode(null);
      await fetchCourses();
    } catch (e: any) {
      toast("error", "Delete failed", e?.message || "Unknown error");
    } finally {
      setMutating(false);
    }
  };

  const badge = (label: string) =>
    "inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-gray-700 dark:text-gray-200";

  const typeBadgeClass = (t: string) => {
    if (t === "Core") return "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300";
    if (t === "Prerequisite") return "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300";
    if (t === "Major") return "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300";
    return "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300";
  };

  const goDetails = (code: string) => navigate(`/admin/courses/${encodeURIComponent(code)}`);

  return (
    <div className="flex-1 overflow-y-auto p-8 animate-in fade-in duration-700 slide-in-from-bottom-4 scrollbar-hide">
      <div className="mb-10 rounded-[32px] border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 shadow-sm overflow-hidden transition-all hover:shadow-md">
            <div className="px-8 py-8 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-8">
              <div className="min-w-0 space-y-2">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
                    <span className="material-icons-outlined text-2xl">auto_stories</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{t("Curriculum Inventory")}</h2>
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-xl">{t("Global management of courses, academic prerequisites, and institutional tracks.")}</p>

                <div className="pt-4 flex flex-wrap gap-3">
                  <div className="px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 shadow-sm flex items-center gap-2">
                    <span className="material-icons-outlined text-xs">database</span>
                    {courses.length} {t("Total")}
                  </div>
                  <div className="px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 text-[10px] font-bold uppercase tracking-widest text-teal-700 dark:text-teal-400 shadow-sm flex items-center gap-2">
                    <span className="material-icons-outlined text-xs">filter_list</span>
                    {filtered.length} {t("Filtered")}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <button
                  className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3.5 text-sm font-bold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-[0.98]"
                  onClick={() => toast("info", "Excel import", "Bulk import interface will be integrated in version 2.5.")}
                  disabled={mutating}
                >
                  <span className="material-icons-outlined text-lg">publish</span>{t("Bulk Import")}</button>

                <button
                  className="flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-8 py-3.5 text-sm font-bold text-white hover:bg-teal-700 transition-all shadow-lg active:scale-[0.98]"
                  onClick={openCreate}
                  disabled={mutating}
                >
                  <span className="material-icons-outlined text-lg">add</span>{t("Create Course")}</button>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 px-8 py-6 bg-white dark:bg-slate-950/20">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-5 relative group">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4">
                    <span className="material-icons-outlined text-slate-400 group-focus-within:text-teal-500 transition-colors">search</span>
                  </span>
                  <input
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 py-3 pl-12 pr-4 text-sm font-medium focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500/50 outline-none transition-all dark:text-white"
                    placeholder={t("Filter by code, title, or academic lead...")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className="lg:col-span-2">
                  <select
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-teal-500/20 transition-all cursor-pointer"
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                  >
                    <option value="">{t("All Departments")}</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-2">
                  <select
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-teal-500/20 transition-all cursor-pointer"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <option value="">{t("All Types")}</option>
                    {types.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-3">
                  <select
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-teal-500/20 transition-all cursor-pointer"
                    value={semesterFilter}
                    onChange={(e) => setSemesterFilter(e.target.value.trim())}
                  >
                    <option value="">{t("All Periods")}</option>
                    {semesterOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <CourseCardSkeleton key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-[40px] border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-20 text-center animate-in fade-in zoom-in-95">
              <div className="mx-auto h-20 w-20 rounded-3xl bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-300 dark:text-slate-700 mb-8 border border-slate-100 dark:border-slate-800">
                <span className="material-icons-outlined text-4xl">inventory_2</span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">{t("No matching curriculum found")}</h3>
              <p className="text-sm text-slate-400 font-medium max-w-sm mx-auto mb-10 leading-relaxed">{t("Adjust your filters or initiate a new course record to expand the catalog.")}</p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => {
                    setSearch("");
                    setDeptFilter("");
                    setTypeFilter("");
                    setSemesterFilter("");
                  }}
                  className="px-8 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-600 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >{t("Reset Parameters")}</button>
                <button onClick={openCreate} className="px-10 py-3 rounded-2xl bg-teal-600 text-sm font-bold text-white hover:bg-teal-700 shadow-lg transition-all active:scale-[0.98]">{t("Initialize Course")}</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {filtered.map((course) => (
                <div
                  key={course.id}
                  className="group rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden"
                  onClick={() => goDetails(course.course_code)}
                >
                  <div className="absolute right-0 top-0 h-24 w-24 bg-teal-500/5 rounded-bl-[64px] opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="flex items-start justify-between gap-6 relative z-10">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] font-mono">{course.course_code}</span>
                        <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-widest border ${typeBadgeClass(course.type)}`}>
                          {course.type}
                        </span>
                      </div>

                      <h3 className="text-xl font-extrabold text-slate-900 dark:text-white truncate mb-2 group-hover:text-teal-600 transition-colors">
                        {course.title}
                      </h3>

                      <div className="flex flex-col gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                          <span className="material-icons-outlined text-sm opacity-60">domain</span>
                          {course.department}
                        </div>
                        {course.instructor && (
                          <div className="flex items-center gap-2">
                            <span className="material-icons-outlined text-sm opacity-60">person_search</span>
                            {course.instructor}
                          </div>
                        )}
                        {(course.major || course.track) && (
                          <div className="flex items-center gap-2 text-teal-600/80 dark:text-teal-400/80">
                            <span className="material-icons-outlined text-sm opacity-60">layers</span>
                            {course.major} {course.track && `• ${course.track}`}
                          </div>
                        )}
                      </div>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <div className="px-3 py-1 rounded-xl bg-slate-50 dark:bg-slate-950 text-[10px] font-bold uppercase tracking-tighter text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                          <span className="material-icons-outlined text-sm opacity-60">stars</span>
                          {Number(course.credits).toFixed(1)} CU
                        </div>

                        {course.semester?.slice(0, 2).map((s) => (
                          <div key={s} className="px-3 py-1 rounded-xl bg-slate-50 dark:bg-slate-950 text-[10px] font-bold uppercase tracking-tighter text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                            <span className="material-icons-outlined text-sm opacity-60">calendar_today</span>
                            {s}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(course);
                        }}
                        className="h-10 w-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-teal-600 hover:border-teal-500/50 shadow-sm transition-all"
                        title="Edit Course"
                        disabled={mutating}
                      >
                        <span className="material-icons-outlined text-lg">edit</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          askDelete(course.course_code);
                        }}
                        className="h-10 w-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:border-rose-500/50 shadow-sm transition-all"
                        title="Purge Record"
                        disabled={mutating}
                      >
                        <span className="material-icons-outlined text-lg">delete_outline</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={openCreate}
            className="fixed right-10 bottom-10 z-[50] h-16 w-16 rounded-[24px] bg-slate-900 dark:bg-teal-600 text-white shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center group overflow-hidden"
            disabled={mutating}
          >
            <span className="material-icons-outlined text-3xl group-hover:rotate-90 transition-transform duration-500">add</span>
          </button>

      <CourseWizardModal
        open={wizardOpen}
        mode={wizardMode}
        initial={wizardInitial}
        busy={mutating}
        onClose={() => setWizardOpen(false)}
        onSubmit={handleWizardSubmit}
        prerequisiteOptions={prerequisiteOptions}
      />

      <ConfirmModal
        open={confirmOpen}
        title="Destroy Record?"
        message={confirmCourseCode ? `This action will permanently purge "${confirmCourseCode}" from the institutional database.` : "This action cannot be reverted."}
        confirmText="Confirm Purge"
        danger
        loading={mutating}
        onCancel={() => {
          setConfirmOpen(false);
          setConfirmCourseCode(null);
        }}
        onConfirm={doDelete}
      />

      <ToastHost toasts={toasts} onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </div>
  );
};

export default AdminCourses;
