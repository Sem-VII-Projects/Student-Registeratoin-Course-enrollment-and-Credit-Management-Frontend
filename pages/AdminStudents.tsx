import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { TableSkeletonRows } from '../components/Skeleton';
import { User } from '../types';

function CustomSelect({ 
  value, 
  onChange, 
  options, 
  placeholder,
  className = ""
}: { 
  value: string, 
  onChange: (val: string) => void, 
  options: {value: string, label: string}[], 
  placeholder?: string,
  className?: string
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
    <div className={`relative group ${className}`} ref={ref}>
      <button 
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between gap-2 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all focus:ring-2 focus:ring-teal-500/20 outline-none"
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

interface StudentsProps {
  user: User;
  onLogout: () => void;
}

interface Student {
  id: string;
  user_id: string;
  name: string;
  email: string;
  major: string;
  year: number;
  semester: number;
  section: string | null;
  status: string;
  total_credits: number;
  required_credits: number;
}

interface StudentFormData {
  user_id: string;
  name: string;
  email: string;
  major: string;
  year: number;
  semester: number;
  section: string;
  status: string;
  total_credits: number;
}

// Always use relative /api/v1 so the browser talks to the same origin (localhost:3000),
// and Vite's dev proxy forwards to the backend. This keeps cookie-based auth working.
const API_BASE = "/api/v1";

const formatOrdinal = (num: number): string => {
  const abs = Math.abs(num);
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${num}th`;
  const mod10 = abs % 10;
  if (mod10 === 1) return `${num}st`;
  if (mod10 === 2) return `${num}nd`;
  if (mod10 === 3) return `${num}rd`;
  return `${num}th`;
};

const formatYearLabel = (year: number): string => `${formatOrdinal(year)} Year`;
const formatSemesterLabel = (semester: number): string => `${formatOrdinal(semester)} Semester`;


const AdminStudents: React.FC<StudentsProps> = ({ user, onLogout }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for students data
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [year, setYear] = useState<number | ''>('');
  const [semester, setSemester] = useState<number | ''>('');
  const [sectionFilter, setSectionFilter] = useState<string>('');
  const [major, setMajor] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState<StudentFormData>({
    user_id: '',
    name: '',
    email: '',
    major: 'CS',
    year: 1,
    semester: 1,
    section: 'A',
    status: 'Active',
    total_credits: 0,
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Majors from API (for Add/Edit dropdowns)
  const [majorsList, setMajorsList] = useState<{ id: string; major_name: string }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/majors`, { credentials: 'include' });
        const data = await res.json().catch(() => []);
        if (Array.isArray(data) && data.length > 0) {
          setMajorsList(data.map((m: { id?: string; major_name?: string }) => ({ id: m.id || m.major_name || '', major_name: m.major_name || m.id || '' })));
        } else {
          setMajorsList([{ id: 'CS', major_name: 'CS' }, { id: 'CT', major_name: 'CT' }, { id: 'SE', major_name: 'SE' }, { id: 'KE', major_name: 'KE' }, { id: 'HPC', major_name: 'HPC' }, { id: 'CSec', major_name: 'CSec' }, { id: 'CN', major_name: 'CN' }, { id: 'BIS', major_name: 'BIS' }, { id: 'ES', major_name: 'ES' }]);
        }
      } catch {
        setMajorsList([{ id: 'CS', major_name: 'CS' }, { id: 'CT', major_name: 'CT' }, { id: 'SE', major_name: 'SE' }, { id: 'KE', major_name: 'KE' }, { id: 'HPC', major_name: 'HPC' }, { id: 'CSec', major_name: 'CSec' }, { id: 'CN', major_name: 'CN' }, { id: 'BIS', major_name: 'BIS' }, { id: 'ES', major_name: 'ES' }]);
      }
    })();
  }, []);

  // Major options for forms: from API + ensure current value is included
  const getMajorOptionsForForm = (currentMajor: string) => {
    const ids = new Set(majorsList.map(m => m.id));
    
    // Always include "No Major" option for create form
    const options = [{ id: '', major_name: 'No Major' }];
    
    // Add current major if it exists and is not empty
    if (currentMajor && currentMajor !== '' && !ids.has(currentMajor)) {
      options.push({ id: currentMajor, major_name: currentMajor });
    }
    
    // Add all majors from API
    options.push(...majorsList);
    
    return options;
  };

  // Major options based on year - for filter dropdown
  const selectedYear = typeof year === 'number' ? year : 0;
  const showSection = selectedYear >= 1 && selectedYear <= 3;
  const showMajorFilter = selectedYear >= 3 && selectedYear <= 5;
  
  // For 1st and 2nd year: no major filter (can choose any major)
  // For 3rd year: show all majors (new students can choose any, old students have CS/CT)
  // For 4th and 5th year: show all majors
  const majorOptions = selectedYear === 1 || selectedYear === 2
    ? [] // No major filter - show all majors
    : getMajorOptionsForForm(''); // Use all majors for 3rd year and above
  
  // Debug logs
  console.log('Year:', selectedYear, 'ShowMajorFilter:', showMajorFilter, 'MajorOptions:', majorOptions);

  // Fetch students
  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (year !== '') params.append('year', year.toString());
      if (semester !== '') params.append('semester', semester.toString());
      if (sectionFilter) params.append('section', sectionFilter);
      if (major) params.append('major', major);
      if (statusFilter) params.append('status', statusFilter);
      params.append('skip', ((currentPage - 1) * pageSize).toString());
      params.append('limit', pageSize.toString());

      const res = await fetch(`${API_BASE}/admin/students/?${params}`, { credentials: 'include' });
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data)) {
        setStudents(data);
      } else {
        const d = data?.detail;
        const errText = Array.isArray(d) ? d.map((x: { msg?: string }) => x?.msg || JSON.stringify(x)).join('; ') : (d ? String(d) : 'Failed to load students');
        setMessage({ type: 'error', text: errText });
        setStudents([]);
      }
    } catch (err) {
      console.error('Failed to fetch students:', err);
      setMessage({ type: 'error', text: 'Failed to load students. Check if the backend is running and CORS is configured.' });
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, 400); // Wait 400ms after last typing before fetching
    return () => clearTimeout(timer);
  }, [searchQuery, year, semester, sectionFilter, major, statusFilter, currentPage]);

  // Handle import Excel
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/admin/students/import-excel`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        let msg = `Import completed! Inserted: ${data.inserted}, Skipped (already exist): ${data.skipped ?? data.updated ?? 0}`;
        if (data.error_details?.length) {
          msg += `. Errors (${data.error_details.length}): ${data.error_details.slice(0, 3).join('; ')}`;
        }
        setMessage({ 
          type: data.inserted > 0 || data.updated > 0 ? 'success' : 'error', 
          text: msg
        });
        if (data.inserted > 0 || data.updated > 0) fetchStudents();
      } else {
        const errDetail = data.detail || data.message || (res.status ? `HTTP ${res.status}` : 'Unknown error');
        const errText = Array.isArray(errDetail) ? errDetail.join('; ') : String(errDetail);
        setMessage({ type: 'error', text: `Import failed: ${errText}` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: `Import failed: ${err instanceof Error ? err.message : 'Network error'}` });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle add student
  const handleAddStudent = async () => {
    if (!formData.user_id || !formData.name || !formData.email) {
      setMessage({ type: 'error', text: 'Student ID, Name, and Email are required' });
      return;
    }

    try {
      const payload = {
        ...formData,
        section: (formData.year >= 1 && formData.year <= 3 && formData.section) ? formData.section : null,
      };

      const res = await fetch(`${API_BASE}/admin/students/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const errData = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({ type: 'success', text: 'Student added successfully' });
        setShowAddModal(false);
        resetForm();
        fetchStudents();
      } else {
        const detail = errData?.detail ?? (res.status === 405 ? 'Method not allowed' : res.status === 422 ? 'Invalid data – check all required fields' : `Server error (${res.status})`);
        const msg = Array.isArray(detail) ? detail.map((x: { msg?: string }) => x?.msg ?? JSON.stringify(x)).join('; ') : String(detail);
        setMessage({ type: 'error', text: `Failed to add student: ${msg}` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to add student: ${err instanceof Error ? err.message : 'Network error'}` });
    }
  };

  // Handle edit student
  const handleEditStudent = async () => {
    if (!editingStudent) return;

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        major: formData.year >= 3 ? formData.major : '', // Send empty string instead of null for validation
        year: formData.year,
        semester: formData.semester,
        section: formData.section || null, // Include section properly
        status: formData.status,
        total_credits: formData.total_credits,
      };

      console.log('Edit payload:', payload); // Debug log

      const res = await fetch(`${API_BASE}/admin/students/${encodeURIComponent(editingStudent.user_id)}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const errData = await res.json().catch(() => ({}));
      console.log('Update response status:', res.status);
      console.log('Update response data:', errData);
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Student updated successfully' });
        setEditingStudent(null);
        resetForm();
        fetchStudents();
      } else {
        const detail = errData?.detail ?? (res.status ? `HTTP ${res.status}` : 'Unknown error');
        const msg = Array.isArray(detail) ? detail.map((x: { msg?: string }) => x?.msg ?? JSON.stringify(x)).join('; ') : String(detail);
        console.error('Update failed with error:', msg);
        setMessage({ type: 'error', text: `Failed to update: ${msg}` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to update: ${err instanceof Error ? err.message : 'Network error'}` });
    }
  };

  // Handle delete student
  const handleDeleteStudent = async (student: Student) => {
    if (!confirm(`Are you sure you want to delete ${student.name} (${student.user_id})?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/admin/students/${encodeURIComponent(student.user_id)}/delete`, {
        method: 'POST',
        credentials: 'include',
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Student deleted successfully' });
        fetchStudents();
      } else {
        const errData = await res.json().catch(() => ({}));
        const detail = errData?.detail ?? (res.status ? `HTTP ${res.status}` : 'Unknown error');
        const errText = Array.isArray(detail) ? detail.map((x: { msg?: string }) => x?.msg ?? JSON.stringify(x)).join('; ') : String(detail);
        setMessage({ type: 'error', text: `Failed to delete: ${errText}` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to delete: ${err instanceof Error ? err.message : 'Network error'}` });
    }
  };

  // Open edit modal
  const openEditModal = (student: Student) => {
    console.log('Opening edit modal for student:', student); // Debug log
    setEditingStudent(student);
    setFormData({
      user_id: student.user_id,
      name: student.name,
      email: student.email,
      major: student.major,
      year: student.year,
      semester: student.semester,
      section: student.section || '', // Handle null/undefined properly
      status: student.status,
      total_credits: student.total_credits,
    });
    console.log('Set form data with section:', student.section); // Debug log
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      user_id: '',
      name: '',
      email: '',
      major: 'CS',
      year: 1,
      semester: 1,
      section: 'A',
      status: 'Active',
      total_credits: 0,
    });
  };

  // Get initials
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Get avatar color based on name
  const getAvatarColor = (name: string) => {
    const colors = ['bg-cyan-100 text-cyan-700', 'bg-purple-100 text-purple-700', 'bg-orange-100 text-orange-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-pink-100 text-pink-700', 'bg-indigo-100 text-indigo-700', 'bg-teal-100 text-teal-700'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const handleStudentClick = (studentId: string) => {
    navigate(`/admin/students/${studentId}`);
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 animate-in fade-in duration-700 slide-in-from-bottom-4 scrollbar-hide">
      {/* Filters Row */}
          <div className="mb-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex flex-1 flex-wrap items-end gap-4">
              {/* Search */}
              <div className="space-y-1.5 flex-1 min-w-[300px] max-w-md">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t("Search Directory")}</label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4">
                    <span className="material-icons-outlined text-slate-400 group-focus-within:text-teal-500 transition-colors">search</span>
                  </span>
                  <input 
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 py-3 pl-12 pr-4 text-sm font-medium focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500/50 outline-none transition-all dark:text-white placeholder:text-slate-400" 
                    placeholder={t("Search name, ID or email...")} 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1); // Reset pagination on search
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                {/* Year Filter */}
                <div className="space-y-1.5 w-full sm:w-32 z-50">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Year")}</label>
                  <CustomSelect
                    value={year?.toString() || ""}
                    onChange={(newVal) => {
                      const newYear = newVal ? Number(newVal) : '';
                      setYear(newYear);
                      setCurrentPage(1); // Reset pagination on filter change
                      // Reset major when year changes
                      if (typeof newYear === 'number') {
                        if (newYear <= 2) {
                          setMajor('');
                        } else if (newYear === 3) {
                          setMajor('CS');
                        } else {
                          setMajor('SE');
                        }
                      } else {
                        setMajor('');
                      }
                    }}
                    options={[
                      { value: "", label: t("All Years") },
                      { value: "1", label: "1st Year" },
                      { value: "2", label: "2nd Year" },
                      { value: "3", label: "3rd Year" },
                      { value: "4", label: "4th Year" },
                      { value: "5", label: "5th Year" }
                    ]}
                    className="w-full"
                  />
                </div>

                {/* Semester Filter */}
                <div className="space-y-1.5 w-full sm:w-24 z-40">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Sem")}</label>
                  <CustomSelect
                    value={semester?.toString() || ""}
                    onChange={(val) => {
                      setSemester(val ? Number(val) : '');
                      setCurrentPage(1); // Reset pagination
                    }}
                    options={[
                      { value: "", label: t("All") },
                      { value: "1", label: "1st" },
                      { value: "2", label: "2nd" }
                    ]}
                    className="w-full"
                  />
                </div>

                {/* Section Filter */}
                {showSection && (
                  <div className="space-y-1.5 w-full sm:w-24 z-30 animate-in fade-in slide-in-from-left-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Section")}</label>
                    <CustomSelect
                      value={sectionFilter}
                      onChange={(val) => {
                        setSectionFilter(val);
                        setCurrentPage(1); // Reset pagination
                      }}
                      options={[
                        { value: "", label: t("All") },
                        { value: "A", label: "A" },
                        { value: "B", label: "B" },
                        { value: "C", label: "C" }
                      ]}
                      className="w-full"
                    />
                  </div>
                )}

                {/* Major Filter */}
                {showMajorFilter && (
                  <div className="space-y-1.5 w-full sm:w-36 z-20 animate-in fade-in slide-in-from-left-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Major")}</label>
                    <CustomSelect
                      value={major}
                      onChange={(val) => {
                        setMajor(val);
                        setCurrentPage(1); // Reset pagination
                      }}
                      options={[
                        { value: "", label: t("All Majors") },
                        ...majorOptions.map((m: any) => ({ value: m.id, label: m.id ? `${m.id} — ${m.major_name}` : m.major_name }))
                      ]}
                      className="w-full"
                    />
                  </div>
                )}

                {/* Status Filter */}
                <div className="space-y-1.5 w-full sm:w-36 z-10">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Status")}</label>
                  <CustomSelect
                    value={statusFilter}
                    onChange={(val) => {
                      setStatusFilter(val);
                      setCurrentPage(1); // Reset pagination
                    }}
                    options={[
                      { value: "", label: t("All Status") },
                      { value: "Active", label: "Active" },
                      { value: "Probation", label: "Probation" },
                      { value: "Suspended", label: "Suspended" },
                      { value: "Graduated", label: "Graduated" }
                    ]}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
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
                className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3 text-sm font-bold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-[0.98]"
              >
                <span className="material-icons-outlined text-lg">{importing ? 'sync' : 'upload_file'}</span>
                {importing ? 'Processing...' : t('Bulk Import')}
              </button>
              <button 
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
                className="flex items-center gap-2 rounded-2xl bg-teal-600 px-6 py-3 text-sm font-bold text-white hover:bg-teal-700 transition-all shadow-md active:scale-[0.98]"
              >
                <span className="material-icons-outlined text-lg">person_add</span>
                Add Student
              </button>
            </div>
          </div>

          {/* Status Message */}
          {message && (
            <div className={`mb-8 p-4 rounded-2xl text-sm font-bold animate-in fade-in slide-in-from-top-2 flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40' : 'bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40'}`}>
              <span className="material-icons-outlined text-[20px]">{message.type === 'success' ? 'verified' : 'error_outline'}</span>
              {message.text}
            </div>
          )}

          {/* Students Table */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:shadow-md">
             <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/50 dark:bg-slate-950/50 text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-8 py-5">{t("ID")}</th>
                      <th className="px-8 py-5">{t("Student Identity")}</th>
                      <th className="px-8 py-5">{t("Major")}</th>
                      <th className="px-8 py-5 text-center">{t("Year/Sem")}</th>
                      <th className="px-8 py-5 text-center">{t("Section")}</th>
                      <th className="px-8 py-5">{t("Progress")}</th>
                      <th className="px-8 py-5">{t("Status")}</th>
                      <th className="px-8 py-5 text-right">{t("Actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {loading ? (
                      <TableSkeletonRows rows={8} cols={8} />
                    ) : students.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-8 py-20 text-center text-slate-400 italic">{t("No records found matching your filters")}</td>
                      </tr>
	                    ) : (
	                      students.map((s) => {
                          const hasMajor = Boolean(s.major && s.major.trim());
                          const majorLabel = hasMajor ? s.major : "None";
                          return (
	                        <tr
	                          key={s.id} 
	                          onClick={() => handleStudentClick(s.user_id)}
	                          className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all cursor-pointer"
	                        >
                          <td className="px-8 py-5 font-bold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-tighter">{s.user_id}</td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs border-2 border-white dark:border-slate-800 shadow-sm ${getAvatarColor(s.name)} dark:bg-opacity-20 transform group-hover:scale-110 transition-transform`}>
                                {getInitials(s.name)}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">{s.name}</div>
                                <div className="text-[11px] font-medium text-slate-400 truncate max-w-[180px]">{s.email}</div>
                              </div>
                            </div>
	                          </td>
	                          <td className="px-8 py-5">
	                            <span
                                className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${
                                  hasMajor
                                    ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                                    : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                                }`}
                              >
	                              {majorLabel}
	                            </span>
	                          </td>
	                          <td className="px-8 py-5 text-center">
	                            <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatYearLabel(s.year)}</div>
	                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{formatSemesterLabel(s.semester)}</div>
	                          </td>
                          <td className="px-8 py-5 text-center font-bold text-slate-600 dark:text-slate-400">{s.section ?? '—'}</td>
                          <td className="px-8 py-5">
                            <div className="flex flex-col gap-1.5 min-w-[100px]">
                              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tighter text-slate-400">
                                <span>Credits</span>
                                <span>{s.total_credits} / {s.required_credits}</span>
                              </div>
                              <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-teal-500 transition-all duration-1000" 
                                  style={{ width: `${Math.min(100, (s.total_credits / (s.required_credits || 1)) * 100)}%` }} 
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                             <span className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest border ${
                               s.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' : 
                               s.status === 'Probation' ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' :
                               s.status === 'Graduated' ? 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800' :
                               'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800'
                             }`}>
                              {s.status}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                  onClick={(e) => { e.stopPropagation(); handleStudentClick(s.user_id); }}
                                  className="p-2 rounded-xl text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all"
                                  title={t("View Profile")}
                              >
                                  <span className="material-icons-outlined text-lg">visibility</span>
                              </button>
                              <button 
                                  onClick={(e) => { e.stopPropagation(); openEditModal(s); }} 
                                  className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                                  title={t("Edit Records")}
                              >
                                  <span className="material-icons-outlined text-lg">edit</span>
                              </button>
                              <button 
                                  onClick={(e) => { e.stopPropagation(); handleDeleteStudent(s); }} 
                                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                                  title={t("Delete Student")}
                              >
                                  <span className="material-icons-outlined text-lg">delete</span>
                              </button>
                            </div>
	                          </td>
	                        </tr>
                          );
	                        })
		                    )}
	                  </tbody>
                </table>
             </div>
             <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-8 py-6 bg-slate-50/30 dark:bg-slate-950/30">
               <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                 Page {currentPage} — Showing {students.length} of global results
               </div>
               <div className="flex gap-3">
                 <button 
                   onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                   className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-white dark:hover:bg-slate-900 transition-all shadow-sm" 
                   disabled={currentPage === 1}
                 >
                   <span className="material-icons-outlined text-sm">west</span> Prev
                 </button>
                 <button 
                   onClick={() => setCurrentPage(p => p + 1)}
                   className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-white dark:hover:bg-slate-900 transition-all shadow-sm"
                   disabled={students.length < pageSize}
                 >
                   Next <span className="material-icons-outlined text-sm">east</span>
                 </button>
               </div>
             </div>
          </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl p-10 w-full max-w-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto scrollbar-hide animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{t("Create Student Record")}</h3>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">{t("New institutional identity")}</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="h-10 w-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Student ID *")}</label>
                  <input
                    type="text"
                    value={formData.user_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, user_id: e.target.value }))}
                    className="w-full px-5 py-3.5 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500/50 outline-none transition-all dark:bg-slate-950 dark:text-white font-bold text-sm"
                    placeholder="e.g. TNT-9001"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Full Name *")}</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-5 py-3.5 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500/50 outline-none transition-all dark:bg-slate-950 dark:text-white font-bold text-sm"
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Primary Email *")}</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-5 py-3.5 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500/50 outline-none transition-all dark:bg-slate-950 dark:text-white font-bold text-sm"
                    placeholder="john.doe@uni.edu"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 relative z-[100]">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Year</label>
                    <CustomSelect
                      value={formData.year.toString()}
                      onChange={(val) => setFormData(prev => ({ ...prev, year: Number(val) }))}
                      options={[1,2,3,4,5].map(y => ({ value: y.toString(), label: `${y} Year` }))}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2 relative z-[100]">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Semester</label>
                    <CustomSelect
                      value={formData.semester.toString()}
                      onChange={(val) => setFormData(prev => ({ ...prev, semester: Number(val) }))}
                      options={[
                        { value: "1", label: "1st Sem" },
                        { value: "2", label: "2nd Sem" }
                      ]}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="space-y-2 relative z-[90]">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Academic Major")}</label>
                  <CustomSelect
                    value={formData.major}
                    onChange={(val) => setFormData(prev => ({ ...prev, major: val }))}
                    options={getMajorOptionsForForm(formData.major).map((m) => ({ value: m.id, label: `${m.id} — ${m.major_name}` }))}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 relative z-[80]">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Status</label>
                    <CustomSelect
                      value={formData.status}
                      onChange={(val) => setFormData(prev => ({ ...prev, status: val }))}
                      options={[
                        { value: "Active", label: "Active" },
                        { value: "Probation", label: "Probation" },
                        { value: "Suspended", label: "Suspended" },
                        { value: "Graduated", label: "Graduated" }
                      ]}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Credits")}</label>
                    <input
                      type="number"
                      value={formData.total_credits}
                      onChange={(e) => setFormData(prev => ({ ...prev, total_credits: Number(e.target.value) }))}
                      className="w-full px-5 py-3.5 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500/50 outline-none transition-all dark:bg-slate-950 dark:text-white font-bold text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 p-5 rounded-2xl bg-teal-50/50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900/40">
              <p className="text-xs text-teal-700 dark:text-teal-400 leading-relaxed font-bold">
                Security Notice: <span className="font-medium">Initial credentials will be student ID plus suffix "@123". System will require mandatory reset upon first login.</span>
              </p>
            </div>

            <div className="flex justify-end gap-4 mt-10">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-8 py-3 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all"
              >
                Discard
              </button>
              <button
                onClick={handleAddStudent}
                className="px-10 py-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg active:scale-[0.98]"
              >
                Register Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl p-10 w-full max-w-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto scrollbar-hide animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{t("Edit Student Record")}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Modifying")} {formData.user_id}</p>
              </div>
              <button onClick={() => setEditingStudent(null)} className="h-10 w-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                <span className="material-icons-outlined">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Student ID (Static)")}</label>
                  <input
                    type="text"
                    value={formData.user_id}
                    disabled
                    className="w-full px-5 py-3.5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-100 dark:bg-slate-950/50 text-slate-400 font-bold text-sm cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Legal Name")}</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-5 py-3.5 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500/50 outline-none transition-all dark:bg-slate-950 dark:text-white font-bold text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Institutional Email")}</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-5 py-3.5 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500/50 outline-none transition-all dark:bg-slate-950 dark:text-white font-bold text-sm"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 relative z-[100]">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Year</label>
                    <CustomSelect
                      value={formData.year.toString()}
                      onChange={(val) => setFormData(prev => ({ ...prev, year: Number(val) }))}
                      options={[1,2,3,4,5].map(y => ({ value: y.toString(), label: `${y} Year` }))}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2 relative z-[100]">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Semester</label>
                    <CustomSelect
                      value={formData.semester.toString()}
                      onChange={(val) => setFormData(prev => ({ ...prev, semester: Number(val) }))}
                      options={[
                        { value: "1", label: "1st Sem" },
                        { value: "2", label: "2nd Sem" }
                      ]}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Current Major - Only show for 3rd year and above */}
                {formData.year >= 3 && (
                  <div className="space-y-2 relative z-[90]">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Current Major")}</label>
                    <CustomSelect
                      value={formData.major}
                      onChange={(val) => setFormData(prev => ({ ...prev, major: val }))}
                      options={getMajorOptionsForForm(formData.major).map((m) => ({ value: m.id, label: `${m.id} — ${m.major_name}` }))}
                      className="w-full"
                    />
                  </div>
                )}

                {/* Section - Show for all years */}
                <div className="space-y-2 relative z-[80]">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Section</label>
                  <CustomSelect
                    value={formData.section === "None" || formData.section === "N/A" || !formData.section ? "" : formData.section}
                    onChange={(val) => setFormData(prev => ({ ...prev, section: val }))}
                    options={[
                      { value: "", label: t("No Section") },
                      { value: "A", label: t("Section A") },
                      { value: "B", label: t("Section B") },
                      { value: "C", label: t("Section C") }
                    ]}
                    className="w-full"
                  />
                  {/* Debug display */}
                  <div className="text-xs text-slate-500 mt-1">
                    Debug: formData.section = "{formData.section}" | Type: {typeof formData.section}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 relative z-[70]">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Status</label>
                    <CustomSelect
                      value={formData.status}
                      onChange={(val) => setFormData(prev => ({ ...prev, status: val }))}
                      options={[
                        { value: "Active", label: "Active" },
                        { value: "Probation", label: "Probation" },
                        { value: "Suspended", label: "Suspended" },
                        { value: "Graduated", label: "Graduated" }
                      ]}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Credits")}</label>
                    <input
                      type="number"
                      value={formData.total_credits}
                      onChange={(e) => setFormData(prev => ({ ...prev, total_credits: Number(e.target.value) }))}
                      className="w-full px-5 py-3.5 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500/50 outline-none transition-all dark:bg-slate-950 dark:text-white font-bold text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-12 pt-8 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setEditingStudent(null)}
                className="px-8 py-3 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all"
              >
                Discard Changes
              </button>
              <button
                onClick={handleEditStudent}
                className="px-12 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg active:scale-[0.98]"
              >
                Apply Updates
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudents;
