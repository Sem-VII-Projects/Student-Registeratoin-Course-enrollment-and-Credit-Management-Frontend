import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TableSkeletonRows } from '../components/Skeleton';
import { User } from '../types';
import { API_BASE_URL } from '../lib/apiBase';

interface GradingProps {
  user: User;
  onLogout: () => void;
}

interface ExamResult {
  student_id: string;
  student_name: string | null;
  course_code: string;
  year: number;
  semester: number;
  section: string | null;
  major: string | null;
  exam_score: number;
  grade: string;
  grade_point: number;
  status: string;
  is_retake: boolean; // Add the is_retake field
}

interface EditedScore {
  [key: string]: number; // key = `${student_id}-${course_code}-${year}-${semester}`
}

// Use relative /api/v1 when proxied (same as AdminStudents)
const API_BASE = API_BASE_URL
  ? `${API_BASE_URL}/api/v1`
  : "/api/v1";

function CustomSelect({ 
  value, 
  onChange, 
  options, 
  placeholder 
}: { 
  value: string, 
  onChange: (val: string) => void, 
  options: {value: string, label: string}[], 
  placeholder?: string 
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedTitle = options.find(o => o.value === value)?.label || placeholder || "Select...";

  return (
    <div className="relative group" ref={ref}>
      <button 
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between gap-2 min-w-[140px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all focus:ring-2 focus:ring-teal-500/20 outline-none"
      >
        <span className="truncate">{selectedTitle}</span>
        <span className="material-icons-outlined text-[14px] text-slate-400 group-hover:text-teal-500 transition-colors shrink-0">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      
      {open && (
        <div className="absolute top-full mt-1.5 left-0 min-w-full w-max max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50 py-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full">
          {options.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors flex items-center justify-between gap-3 ${
                  isSelected
                    ? "bg-teal-50/80 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <span className="material-icons-outlined text-[14px] shrink-0">check</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const AdminGrading: React.FC<GradingProps> = ({ user: _user, onLogout: _onLogout }) => {
  const { t } = useTranslation();
  const [year, setYear] = useState<number | ''>('');
  const [semester, setSemester] = useState<number | ''>('');
  const [section, setSection] = useState<string>('');
  const [major, setMajor] = useState<string>('');
  const [courseCode, setCourseCode] = useState<string>('');
  const [results, setResults] = useState<ExamResult[]>([]);
  const [editedScores, setEditedScores] = useState<EditedScore>({});
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingResult, setEditingResult] = useState<ExamResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state for Add/Edit modal
  const [formData, setFormData] = useState({
    student_id: '',
    course_code: '',
    exam_score: 0,
  });

  // Determine if section or major should be shown based on year
  const yearNum = typeof year === 'number' ? year : 0;
  const showSection = yearNum === 0 || (yearNum >= 1 && yearNum <= 3);
  const showMajor = yearNum === 0 || (yearNum >= 3 && yearNum <= 5);
  const majorOptions = yearNum === 3 ? ['CS', 'CT'] : ['SE', 'KE', 'HPC', 'CSec', 'CN', 'BIS', 'ES'];

  const fetchResults = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (year !== '') params.append('year', String(year));
      if (semester !== '') params.append('semester', String(semester));
      if (section) params.append('section', section);
      if (major) params.append('major', major);
      if (courseCode) params.append('course_code', courseCode);

      const res = await fetch(`${API_BASE}/admin/exam-results?${params}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        // Filter to show only Passed and Failed students
        const filteredData = data.filter((result: any) => 
          result.status === 'Passed' || result.status === 'Failed'
        );
        setResults(filteredData);
        setCurrentPage(1); // Reset page on fetch
        setEditedScores({}); // Reset edited scores when fetching new data
      }
    } catch (err) {
      console.error('Failed to fetch results:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch exam results when filters change (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchResults();
    }, 400); // Wait 400ms after last typing before fetching

    return () => clearTimeout(timer);
  }, [year, semester, section, major, courseCode]);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/admin/exam-results/import-excel`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Import successful! Inserted: ${data.inserted}, Updated: ${data.updated}${data.errors?.length ? `, Errors: ${data.errors.length}` : ''}` });
        fetchResults();
      } else {
        setMessage({ type: 'error', text: `Import failed: ${data.message}` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Import failed: Network error' });
      console.error('Import error:', err);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getResultKey = (r: ExamResult) => `${r.student_id}-${r.course_code}-${r.year}-${r.semester}`;

  const handleScoreChange = (result: ExamResult, newScore: number) => {
    const key = getResultKey(result);
    setEditedScores(prev => ({ ...prev, [key]: newScore }));
  };

  const handleSaveGrades = async () => {
    const edits = Object.entries(editedScores);
    if (edits.length === 0) {
      setMessage({ type: 'error', text: 'No changes to save' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      let successCount = 0;
      let errorCount = 0;
      let firstErrorMsg = '';

      for (const [key, newScore] of edits) {
        const result = results.find(r => getResultKey(r) === key);
        if (!result) continue;

        const payload = {
          student_id: result.student_id,
          course_code: result.course_code,
          year: result.year ?? 1,
          semester: result.semester ?? 1,
          section: result.section ?? (result.year >= 1 && result.year <= 3 ? 'A' : null),
          major: result.major ?? (result.year >= 4 ? 'SE' : null),
          exam_score: newScore,
        };

        const res = await fetch(`${API_BASE}/admin/exam-results`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include',
        });

        if (res.ok) {
          successCount++;
        } else {
          errorCount++;
          if (!firstErrorMsg) {
            try {
              const err = await res.json();
              const detail = err?.detail || res.statusText;
              firstErrorMsg = Array.isArray(detail) ? detail.map((x: { msg?: string }) => x?.msg).filter(Boolean).join('; ') : String(detail);
            } catch {
              firstErrorMsg = `HTTP ${res.status}`;
            }
          }
        }
      }

      if (errorCount === 0) {
        setMessage({ type: 'success', text: `Saved ${successCount} grade(s)` });
      } else {
        setMessage({
          type: 'error',
          text: firstErrorMsg
            ? `Save failed: ${firstErrorMsg}`
            : `Saved ${successCount} grade(s), ${errorCount} failed`,
        });
      }
      setEditedScores({});
      fetchResults();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save grades' });
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddResult = async () => {
    if (!formData.student_id || !formData.course_code) {
      setMessage({ type: 'error', text: 'Student ID and Course Code are required' });
      return;
    }
    if (year === '' || semester === '') {
      setMessage({ type: 'error', text: 'Please select a specific Year and Semester to add a result' });
      return;
    }
    if (showSection && !section) {
      setMessage({ type: 'error', text: 'Please select a Section (years 1-3)' });
      return;
    }
    if (showMajor && !major) {
      setMessage({ type: 'error', text: 'Please select a Major (years 3-5)' });
      return;
    }

    try {
      const payload = {
        student_id: formData.student_id,
        course_code: formData.course_code,
        year,
        semester,
        section: showSection && section ? section : null,
        major: showMajor && major ? major : null,
        exam_score: formData.exam_score,
      };

      const res = await fetch(`${API_BASE}/admin/exam-results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Result added successfully' });
        setShowAddModal(false);
        setFormData({ student_id: '', course_code: '', exam_score: 0 });
        fetchResults();
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: `Failed to add result: ${error.detail || 'Unknown error'}` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to add result: Network error' });
    }
  };

  const handleEditResult = async () => {
    if (!editingResult) return;

    try {
      const payload = {
        student_id: editingResult.student_id,
        course_code: editingResult.course_code,
        year: editingResult.year,
        semester: editingResult.semester,
        section: editingResult.section,
        major: editingResult.major,
        exam_score: formData.exam_score,
      };

      const res = await fetch(`${API_BASE}/admin/exam-results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Result updated successfully' });
        setEditingResult(null);
        setFormData({ student_id: '', course_code: '', exam_score: 0 });
        fetchResults();
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: `Failed to update: ${error.detail || 'Unknown error'}` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update result: Network error' });
    }
  };

  const handleDeleteResult = async (result: ExamResult) => {
    if (!confirm(`Are you sure you want to delete the result for ${result.student_id}?`)) {
      return;
    }

    try {
      const params = new URLSearchParams({
        student_id: result.student_id,
        course_code: result.course_code,
      });
      if (result.year != null && result.semester != null) {
        params.append('year', String(result.year));
        params.append('semester', String(result.semester));
      }

      const res = await fetch(`${API_BASE}/admin/exam-results?${params}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const errData = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({ type: 'success', text: 'Result deleted successfully' });
        fetchResults();
      } else {
        const detail = errData?.detail ?? (res.status === 404 ? 'Exam result not found (may already be deleted)' : `HTTP ${res.status}`);
        setMessage({ type: 'error', text: `Failed to delete: ${detail}` });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setMessage({ type: 'error', text: `Failed to delete: ${msg}. Check backend is running and CORS allows DELETE.` });
    }
  };

  const openEditModal = (result: ExamResult) => {
    setEditingResult(result);
    setFormData({
      student_id: result.student_id,
      course_code: result.course_code,
      exam_score: result.exam_score,
    });
  };

  const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const hasChanges = Object.keys(editedScores).length > 0;

  return (
    <div className="p-10 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row items-start xl:items-end justify-between gap-10 mb-12">
            <div className="flex flex-wrap items-end gap-5">
              {/* Year Selection */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{t("Academic Year")}</label>
                <CustomSelect
                  value={year.toString()}
                  onChange={(val) => {
                    const newYear = val === '' ? '' : Number(val);
                    setYear(newYear);
                    if (newYear === '') {
                      setSection('');
                      setMajor('');
                    } else if (newYear <= 2) {
                      setMajor('');
                    } else if (newYear === 3) {
                      setMajor('CS');
                    } else {
                      setSection('');
                      setMajor('SE');
                    }
                  }}
                  options={[
                    { value: "", label: "All Tiers" },
                    ...[1,2,3,4,5].map(y => ({ value: y.toString(), label: `${y} Year` }))
                  ]}
                />
              </div>

              {/* Semester Selection */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{t("Period")}</label>
                <CustomSelect
                  value={semester.toString()}
                  onChange={(val) => setSemester(val === '' ? '' : Number(val))}
                  options={[
                    { value: "", label: "Full Cycle" },
                    { value: "1", label: "1st Sem" },
                    { value: "2", label: "2nd Sem" }
                  ]}
                />
              </div>

              {/* Section Selection */}
              {showSection && (
                <div className="space-y-2.5 animate-in fade-in slide-in-from-left-4">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{t("Cohort")}</label>
                  <CustomSelect
                    value={section}
                    onChange={setSection}
                    options={[
                      { value: "", label: "All Sec" },
                      { value: "A", label: "Sec A" },
                      { value: "B", label: "Sec B" },
                      { value: "C", label: "Sec C" }
                    ]}
                  />
                </div>
              )}

              {/* Major Selection */}
              {showMajor && (
                <div className="space-y-2.5 animate-in fade-in slide-in-from-left-4">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{t("Specialization")}</label>
                  <CustomSelect
                    value={major}
                    onChange={setMajor}
                    options={[
                      { value: "", label: "All Majors" },
                      ...majorOptions.map((m) => ({ value: m, label: m }))
                    ]}
                  />
                </div>
              )}

              {/* Course Code Input */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{t("Inventory ID")}</label>
                <div className="relative group">
                  <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-base group-focus-within:text-teal-500 transition-colors">qr_code</span>
                  <input
                    type="text"
                    placeholder={t("Search Code...")}
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    className="pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-teal-500/10 transition-all w-44 shadow-inner"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx"
                onChange={handleImportExcel}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="h-12 px-6 rounded-[20px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-white hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-40"
              >
                Bulk Import
              </button>
              <button
                onClick={() => {
                  setFormData({ student_id: '', course_code: '', exam_score: 0 });
                  setShowAddModal(true);
                }}
                disabled={year === '' || semester === ''}
                className="h-12 px-8 rounded-[20px] bg-teal-600 text-[10px] font-black uppercase tracking-widest text-white hover:bg-teal-700 transition-all shadow-xl shadow-teal-500/20 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Insert Result
              </button>
              <button
                onClick={handleSaveGrades}
                disabled={saving || !hasChanges}
                className={`h-12 px-8 rounded-[20px] text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-xl active:scale-95 disabled:opacity-40 ${
                  hasChanges ? 'bg-slate-900 dark:bg-slate-800 hover:bg-slate-800' : 'bg-slate-200 dark:bg-slate-800 cursor-not-allowed'
                }`}
              >
                {saving ? 'Syncing...' : `Commit Metrics ${hasChanges ? `(${Object.keys(editedScores).length})` : ''}`}
              </button>
            </div>
          </div>

          {/* Status Message */}
          {message && (
            <div className={`mb-10 p-5 rounded-[24px] text-sm font-bold animate-in fade-in slide-in-from-top-4 flex items-center gap-4 shadow-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40' : 'bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40'}`}>
              <span className="material-icons-outlined text-2xl">{message.type === 'success' ? 'verified' : 'report_problem'}</span>
              {message.text}
            </div>
          )}

          <div className="bg-slate-50/30 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800 rounded-[32px] p-8 mb-10 flex flex-wrap items-center gap-10 shadow-sm transition-all hover:bg-white dark:hover:bg-slate-900">
            <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.4em]">{t("Evaluation Matrix")}</span>
            <div className="flex items-center gap-10">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]"></div> 
                <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">{t("90-100 (Superior)")}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.4)]"></div> 
                <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">{t("80-89 (Standard)")}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]"></div> 
                <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">{t("Sub-40 (Deficient)")}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[40px] shadow-sm overflow-hidden transition-all hover:shadow-md">
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-950/50 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-10 py-5">{t("System UID")}</th>
                    <th className="px-10 py-5 w-80">{t("Institutional Identity")}</th>
                    <th className="px-10 py-5">{t("Catalog Course")}</th>
                    <th className="px-10 py-5 text-center">{t("Semester")}</th>
                    <th className="px-10 py-5 text-center w-48">{t("Scaled Evaluation")}</th>
                    <th className="px-10 py-5 text-center w-32">{t("Grade")}</th>
                    <th className="px-10 py-5 text-center w-40">Integrity</th>
                    <th className="px-10 py-5 text-center w-32">Retake</th>
                    <th className="px-10 py-5 text-right">{t("Actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {loading ? (
                    <TableSkeletonRows rows={10} cols={9} />
                  ) : results.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-10 py-32 text-center text-slate-300 font-black uppercase tracking-[0.4em] italic">{t("Zero Records Discovered")}</td>
                    </tr>
                  ) : (
                    results.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((r, i) => (
                      <tr key={`${r.student_id}-${r.course_code}-${i}`} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-10 py-6 font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-tighter">{r.student_id}</td>
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center text-xs font-black border-2 border-white dark:border-slate-800 shadow-sm group-hover:scale-110 transition-transform">
                              {getInitials(r.student_name)}
                            </div>
                            <span className="font-black text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors tracking-tight">{r.student_name || 'Anonymous Entity'}</span>
                          </div>
                        </td>
                        <td className="px-10 py-6">
                          <span className="whitespace-nowrap inline-block w-full text-center px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 text-[10px] font-black text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800 uppercase tracking-[0.2em]">{r.course_code}</span>
                        </td>
                        <td className="px-10 py-6 text-center">
                          <span className="whitespace-nowrap inline-block w-full text-center px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-[10px] font-black text-indigo-500 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50 uppercase tracking-[0.2em]">
                            {r.year} Yr / {r.semester} Sem
                          </span>
                        </td>
                        <td className="px-10 py-6">
                          <div className="flex justify-center group/input">
                            <input 
                              className="w-24 px-4 py-2 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-base font-black text-slate-900 dark:text-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500/50 outline-none transition-all shadow-sm group-hover/input:border-teal-500/30" 
                              type="number" 
                              value={editedScores[getResultKey(r)] ?? r.exam_score}
                              onChange={(e) => handleScoreChange(r, Number(e.target.value))}
                              min={0}
                              max={100}
                            />
                          </div>
                        </td>
                        <td className="px-10 py-6 text-center">
                          <div className={`text-2xl font-black tracking-tighter ${r.grade === 'F' ? 'text-rose-500' : 'text-emerald-600'}`}>
                            {r.grade}
                          </div>
                        </td>
                        <td className="px-10 py-6 text-center">
                          <span className={`inline-flex px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                            r.status === 'Passed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400' :
                            r.status === 'Probation' ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400' : 
                            'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-10 py-6 text-center">
                          <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                            r.is_retake ? 'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-900/20 dark:text-violet-400' : 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-900/20 dark:text-slate-400'
                          }`}>
                            {r.is_retake ? 'YES' : 'NO'}
                          </span>
                        </td>
                        <td className="px-10 py-6 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                            <button
                              onClick={() => r.year != null && r.semester != null && openEditModal(r)}
                              disabled={r.year == null || r.semester == null}
                              className={`p-2.5 rounded-2xl transition-all ${r.year != null && r.semester != null ? 'text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 shadow-sm border border-transparent hover:border-teal-500/20' : 'text-slate-200 cursor-not-allowed'}`}
                              title="Tuning Interface"
                            >
                              <span className="material-icons-outlined text-xl">tune</span>
                            </button>
                            <button
                              onClick={() => handleDeleteResult(r)}
                              className="p-2.5 rounded-2xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all shadow-sm border border-transparent hover:border-rose-500/20"
                              title={t("Expunge Record")}
                            >
                              <span className="material-icons-outlined text-xl">delete_outline</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-8 py-6 bg-slate-50/30 dark:bg-slate-950/30 rounded-b-3xl">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  {t("Page")} {currentPage} - {t("Showing")} {results.length} {t("results")}
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-white dark:hover:bg-slate-900 transition-all shadow-sm" 
                    disabled={currentPage === 1}
                  >
                    <span className="material-icons-outlined text-sm">west</span> {t("Prev")}
                  </button>
                  <button 
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-white dark:hover:bg-slate-900 transition-all shadow-sm"
                    disabled={results.length <= currentPage * pageSize}
                  >
                    {t("Next")} <span className="material-icons-outlined text-sm">east</span>
                  </button>
                </div>
              </div>

      {/* Add Result Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl p-10 w-full max-w-md border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{t("Record Performance")}</h3>
              <button onClick={() => setShowAddModal(false)} className="h-10 w-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Student Identifier *")}</label>
                <input
                  type="text"
                  value={formData.student_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, student_id: e.target.value }))}
                  className="w-full px-5 py-3.5 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500/50 outline-none transition-all dark:bg-slate-950 dark:text-white font-bold text-sm"
                  placeholder="TNT-xxxx"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Catalog Course Code *")}</label>
                <input
                  type="text"
                  value={formData.course_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, course_code: e.target.value }))}
                  className="w-full px-5 py-3.5 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500/50 outline-none transition-all dark:bg-slate-950 dark:text-white font-bold text-sm"
                  placeholder="CST-xxxx"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Examination Score (0-100)")}</label>
                <input
                  type="number"
                  value={formData.exam_score}
                  onChange={(e) => setFormData(prev => ({ ...prev, exam_score: Number(e.target.value) }))}
                  min={0}
                  max={100}
                  className="w-full px-5 py-3.5 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500/50 outline-none transition-all dark:bg-slate-950 dark:text-white font-black text-lg text-center"
                />
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                <div className="flex items-start gap-3">
                  <span className="text-teal-600">{t("Context:")}</span>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed uppercase tracking-tighter">
                    Entry context: Year {year}, Sem {semester}
                    {showSection && `, Sec ${section || 'All'}`}
                    {showMajor && `, Major ${major || 'All'}`}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-4 mt-10">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddResult}
                className="px-10 py-3 rounded-2xl bg-slate-900 dark:bg-slate-800 text-sm font-extrabold text-white hover:bg-slate-800 shadow-lg transition-all active:scale-[0.98]"
              >
                Log Result
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Result Modal */}
      {editingResult && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl p-10 w-full max-w-md border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{t("Edit Metric")}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Modifying student record")}</p>
              </div>
              <button onClick={() => setEditingResult(null)} className="h-10 w-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                <span className="material-icons-outlined">close</span>
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Student ID")}</label>
                  <div className="px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-500">{formData.student_id}</div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Course Code")}</label>
                  <div className="px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-500">{formData.course_code}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Updated Exam Score")}</label>
                <input
                  type="number"
                  value={formData.exam_score}
                  onChange={(e) => setFormData(prev => ({ ...prev, exam_score: Number(e.target.value) }))}
                  min={0}
                  max={100}
                  className="w-full px-5 py-4 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500/50 outline-none transition-all dark:bg-slate-950 dark:text-white font-black text-2xl text-center"
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-12 pt-8 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setEditingResult(null)}
                className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
              >
                Discard
              </button>
              <button
                onClick={handleEditResult}
                className="px-10 py-3 rounded-2xl bg-teal-600 text-sm font-extrabold text-white hover:bg-teal-700 shadow-lg transition-all active:scale-[0.98]"
              >
                Apply Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default AdminGrading;
