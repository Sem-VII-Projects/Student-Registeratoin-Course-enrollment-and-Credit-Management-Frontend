import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/client';
import Composer from '../components/Composer'
import AdminTermManagement_Friend from '../components/AdminTermManagement_Friend';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import * as XLSX from 'xlsx';

// UI Components to match project style
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function Skeleton({ className }) {
  return <div className={cn("animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/50", className)} />;
}

function IconBadge({ icon, tone = "primary" }) {
  const tones = {
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

const AWAITING_APPROVAL_STATUSES = ['DRAFT', 'PENDING', 'PENDING_APPROVAL'];
const BASE_PAYMENT_STATUS = ['PAYMENT_PENDING', 'PAYMENT_DONE'];
const PAYMENT_SESSION_STATUSES = [...BASE_PAYMENT_STATUS];
const BASE_CLASS_OPTIONS = ['A', 'B', 'C', 'D'];
const DEFAULT_CONFIG_YEARS = [1, 2, 3, 4];
const BASE_STATUS_OPTIONS = [
  'REGISTERED',
  'ENROLLED',
  'PAYMENT_PENDING',
  'PAYMENT_DONE',
  'COMPLETED',
  'FAILED',
  'REEXAM_PENDING',
  'REEXAM_PASSED',
  'WITHDRAWN',
  'TERMINATED'
];

const normalizeStatusValue = (value) => String(value || '').trim().toUpperCase();

const formatDate = (raw) => {
  if (!raw) return '-';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return String(raw);
  return date.toLocaleDateString();
};

const buildStatusOptions = (students) => {
  const knownBase = new Set(BASE_STATUS_OPTIONS);
  const extras = new Set();
  (Array.isArray(students) ? students : []).forEach((student) => {
    const normalized = normalizeStatusValue(student?.status);
    if (!normalized) return;
    if (!knownBase.has(normalized)) {
      extras.add(normalized);
    }
  });
  const sortedExtras = Array.from(extras).sort((a, b) => a.localeCompare(b));
  return [...BASE_STATUS_OPTIONS, ...sortedExtras];
};

const toPositiveYear = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.trunc(numeric);
};

const toUniqueSortedYears = (values) => {
  const unique = new Set();
  (Array.isArray(values) ? values : []).forEach((value) => {
    const year = toPositiveYear(value);
    if (year) unique.add(year);
  });
  return Array.from(unique).sort((a, b) => a - b);
};

const toYearRange = (maxYear) => {
  const max = toPositiveYear(maxYear);
  if (!max) return [];
  return Array.from({ length: max }, (_, index) => index + 1);
};

const readConfigYears = (config, fallbackMajorSelectionStartYear) => {
  if (!config || typeof config !== 'object') return [];
  const directYears = toUniqueSortedYears([
    ...(Array.isArray(config.availableYears) ? config.availableYears : []),
    ...(Array.isArray(config.allowedYears) ? config.allowedYears : [])
  ]);
  if (directYears.length > 0) return directYears;
  const yearsField = Array.isArray(config.years) ? config.years.map((entry) => (typeof entry === 'object' ? (entry?.yearLevel ?? entry?.year) : entry)) : [];
  const yearsFromYearsField = toUniqueSortedYears(yearsField);
  if (yearsFromYearsField.length > 0) return yearsFromYearsField;
  const yearsFromYearlyConfig = toUniqueSortedYears(Array.isArray(config.yearlyConfig) ? config.yearlyConfig.map((entry) => entry?.yearLevel ?? entry?.year) : []);
  if (yearsFromYearlyConfig.length > 0) return yearsFromYearlyConfig;
  const configuredMaxYear = toPositiveYear(config.maxYear ?? config?.header?.maxYear ?? config?.header?.totalYears ?? config.totalYears ?? config.no_of_years);
  if (configuredMaxYear) return toYearRange(configuredMaxYear);
  const majorSelectionStartYear = toPositiveYear(config.majorSelectionStartYear ?? config.major_selection_start_year ?? fallbackMajorSelectionStartYear);
  if (majorSelectionStartYear && configuredMaxYear) return toYearRange(Math.max(majorSelectionStartYear, configuredMaxYear));
  return [];
};

const getAcademicYearSortValue = (value) => {
  const match = String(value || '').match(/\d{4}/);
  return match ? Number(match[0]) : Number.NEGATIVE_INFINITY;
};

const ROMAN_SEMESTER_ORDER = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };

const getSemesterSortValue = (value) => {
  const text = String(value || '').trim();
  if (!text) return Number.POSITIVE_INFINITY;
  const digitMatch = text.match(/\d+/);
  if (digitMatch) return Number(digitMatch[0]);
  const romanMatch = text.match(/([ivx]+)$/i);
  if (romanMatch) {
    const roman = romanMatch[1].toUpperCase();
    if (ROMAN_SEMESTER_ORDER[roman]) return ROMAN_SEMESTER_ORDER[roman];
  }
  return Number.POSITIVE_INFINITY;
};

const normalizeTermConfig = (term) => {
  if (!term || typeof term !== 'object') return null;
  const academicYear = String(term.academicYear || term.currentAcademicYear || '').trim();
  const semesterRaw = term.semester ?? term.currentSemester;
  const semester = Number(semesterRaw);
  const majorSelectionStartYearRaw = term.majorSelectionStartYear ?? term.major_selection_start_year ?? term.majorStartYear ?? 3;
  const majorSelectionStartYear = Number(majorSelectionStartYearRaw);
  return {
    academicYear,
    semester: Number.isFinite(semester) && semester > 0 ? semester : null,
    majorSelectionStartYear: Number.isFinite(majorSelectionStartYear) && majorSelectionStartYear > 0 ? majorSelectionStartYear : 3
  };
};

const normalizeAdminTermEnrollments = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.enrollments)) return payload.enrollments;
  return [];
};

const pickValue = (...values) => values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');
const toBoolean = (value) => typeof value === 'boolean' ? value : (typeof value === 'string' ? value.trim().toLowerCase() === 'true' : !!value);
const asObject = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const hasValues = (record) => Object.values(asObject(record)).some((value) => value !== null && value !== undefined && (typeof value === 'string' ? value.trim() !== '' : true));
const getRegistrationId = (record) => record?.registrationId || record?.registrationid || record?.registration_id || record?.id || null;

const normalizePaymentSessionStatus = (record) => {
  const paymentStatus = String(record?.payment_status || record?.paymentStatus || record?.status || record?.globalStatus || '').toUpperCase();
  if (['PAYMENT_PENDING', 'PENDING', 'SUBMITTED', 'PAYMENT_REQUIRED'].includes(paymentStatus)) return 'PAYMENT_PENDING';
  if (['PAYMENT_DONE', 'APPROVED', 'PAID', 'PAYMENT_SUCCESS'].includes(paymentStatus)) return 'PAYMENT_DONE';
  return '';
};

const isPaymentSessionStudentRecord = (record) => PAYMENT_SESSION_STATUSES.includes(normalizePaymentSessionStatus(record));

const isEnrolledStudentRecord = (record) => {
  if (!record) return false;
  const status = String(record.status || record.termStatus || record.globalStatus || '').toUpperCase();
  return status === 'ENROLLED' || status === 'COMPLETED' || status === 'GRADUATED';
};

const getPaymentSessionCounts = (records) => (Array.isArray(records) ? records : []).reduce((acc, record) => {
  const normalized = normalizePaymentSessionStatus(record);
  if (normalized === 'PAYMENT_PENDING') acc.paymentPending += 1;
  else if (normalized === 'PAYMENT_DONE') acc.paymentDone += 1;
  return acc;
}, { paymentPending: 0, paymentDone: 0 });

const getResolvedYearValue = (record) => {
  const value = Number(record?.currentyear ?? record?.currentYear ?? record?.yearLevel ?? record?.year_level ?? 0);
  return Number.isFinite(value) && value > 0 ? value : null;
};

const getResolvedAcademicYearValue = (record, currentTerm) => {
  const direct = String(record?.termAcademicYear || currentTerm?.academicYear || record?.academicYear || record?.academic_year || record?.academicYearEntered || record?.academic_year_entered || record?.academicyearentered || '').trim();
  return direct || String(currentTerm?.academicYear || '').trim();
};

const getResolvedSemesterValue = (record, currentTerm) => {
  const direct = String(record?.termSemester || (currentTerm?.semester ? String(currentTerm.semester) : '') || record?.academicSemester || record?.academic_semester || record?.semester || record?.semester_name || '').trim();
  return direct || (currentTerm?.semester ? String(currentTerm.semester) : '');
};

const hasOptionValue = (options, value) => {
  const target = String(value || '').trim();
  if (!target) return true;
  return (Array.isArray(options) ? options : []).some((option) => String(option || '').trim() === target);
};

const normalizeFilterValue = (options, value) => hasOptionValue(options, value) ? value : '';

const normalizeClassLabel = (value) => String(value || '').trim();
const normalizeClassLabelKey = (value) => normalizeClassLabel(value).toUpperCase();
const toFoundationClassFilterValue = (section) => `FOUNDATION:${String(section || '').trim().toUpperCase()}`;
const toMajorClassFilterValue = (majorClassId) => `MAJOR:${String(majorClassId || '').trim()}`;
const toMajorClassLabelFilterValue = (label) => `MAJOR_LABEL:${normalizeClassLabelKey(label)}`;

const normalizeLegacyClassFilterValue = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const upper = raw.toUpperCase();
  if (upper.startsWith('FOUNDATION:') || upper.startsWith('MAJOR:') || upper.startsWith('MAJOR_LABEL:')) return raw;
  if (BASE_CLASS_OPTIONS.includes(upper)) return toFoundationClassFilterValue(upper);
  return raw;
};

const resolveEnrolledClassDisplay = (student) => {
  const majorLabel = normalizeClassLabel(student?.majorClassLabel || student?.major_class_label || '');
  if (majorLabel) return majorLabel;
  const foundationSection = String(student?.foundationSection || student?.section || '').trim().toUpperCase();
  if (foundationSection) return foundationSection;
  const assigned = normalizeClassLabel(student?.assigned_class || student?.assignedClass || '');
  return assigned || '';
};

const matchesEnrolledClassFilter = (student, filterValue) => {
  const rawFilter = String(filterValue || '').trim();
  if (!rawFilter) return true;
  const normalizedFilter = normalizeLegacyClassFilterValue(rawFilter);
  const upperFilter = normalizedFilter.toUpperCase();
  const majorClassId = String(student?.majorClassId || student?.major_class_id || '').trim();
  const majorClassLabel = normalizeClassLabelKey(student?.majorClassLabel || student?.major_class_label || '');
  const foundationSection = String(student?.foundationSection || student?.section || '').trim().toUpperCase();
  if (upperFilter.startsWith('FOUNDATION:')) return foundationSection === upperFilter.slice('FOUNDATION:'.length).trim();
  if (upperFilter.startsWith('MAJOR:')) return !!majorClassId && majorClassId === normalizedFilter.slice('MAJOR:'.length).trim();
  if (upperFilter.startsWith('MAJOR_LABEL:')) return !!majorClassLabel && majorClassLabel === upperFilter.slice('MAJOR_LABEL:'.length).trim();
  if (BASE_CLASS_OPTIONS.includes(upperFilter)) return foundationSection === upperFilter;
  if (majorClassId && normalizedFilter === majorClassId) return true;
  return majorClassLabel === upperFilter;
};

const toMyanmarDigits = (num) => {
  if (num === null || num === undefined) return '-';
  const digits = {
    '0': '၀', '1': '၁', '2': '၂', '3': '၃', '4': '၄',
    '5': '၅', '6': '၆', '7': '၇', '8': '၈', '9': '၉'
  };
  return String(num).replace(/[0-9]/g, (w) => digits[w]);
};

function AdminDashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [admin, setAdmin] = useState(user || null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [rejectDialog, setRejectDialog] = useState({ open: false, student: null, reason: '' });
  const [detailsRejectDialog, setDetailsRejectDialog] = useState({ open: false, student: null, reason: '' });
  const [paymentRejectDialog, setPaymentRejectDialog] = useState({ open: false, student: null, reason: '' });

  const openRejectDialog = (student) => {
    setRejectDialog({ open: true, student, reason: '' });
  };

  const closeRejectDialog = () => {
    setRejectDialog({ open: false, student: null, reason: '' });
  };

  const handleRejectStudent = async () => {
    const student = rejectDialog.student;
    if (!student) return;

    const studentId = student.studentid || student.id;
    if (!studentId) {
      alert(t('Cannot reject: no student ID found.'));
      return;
    }

    const reason = rejectDialog.reason.trim();
    if (!reason) {
      alert(t('Rejection reason is required.'));
      return;
    }

    const confirmReject = window.confirm(t('Reject {{name}}?', { name: student.namemm }) + '\n\n' + t('This action will notify the student and remove their current draft.'));
    if (!confirmReject) return;

    setLoading(true);
    try {
      await api.rejectStudent(studentId, {
        rejectionReason: reason,
        rejection_reason: reason,
        reason,
        hardDelete: true
      });
      alert(t('Rejected {{name}}.', { name: student.namemm }));
      closeRejectDialog();
      loadData();
    } catch (error) {
      console.error('Reject error:', error);
      alert(t('Error: ') + (error.message || t('Rejection failed')));
    } finally {
      setLoading(false);
    }
  };

  // Data states
  const [students, setStudents] = useState([]);
  const [newRegistrations, setNewRegistrations] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, detailsSubmitted: 0, paymentPending: 0, paymentDone: 0, enrolled: 0, benefit: 0, hostel: 0, onBreak: 0 });

  // Filter states
  const [filters, setFilters] = useState({ search: '', year: '', batch: '', semester: '', status: '' });
  const [paymentFilters, setPaymentFilters] = useState({ search: '', year: '', batch: '', semester: '', paymentStatus: '' });
  const [enrolledFilters, setEnrolledFilters] = useState({ search: '', year: '', batch: '', semester: '', class: '' });
  
  const [currentTerm, setCurrentTerm] = useState(null);
  const [termEnrolledStudents, setTermEnrolledStudents] = useState([]);
  const [enrolledMajorClasses, setEnrolledMajorClasses] = useState([]);
  const [registrationConfig, setRegistrationConfig] = useState(null);
  const [availableYears, setAvailableYears] = useState(DEFAULT_CONFIG_YEARS);
  
  const [classSections, setClassSections] = useState([]);
  const [majorClassesByYear, setMajorClassesByYear] = useState({});
  const [sectionConfigTab, setSectionConfigTab] = useState('foundation'); // 'foundation' or 'major'
  const [selectedYear, setSelectedYear] = useState(1);
  const [editingSection, setEditingSection] = useState({});
  const [moveStudentData, setMoveStudentData] = useState({ studentId: '', toSection: '' });
  const [moveStudentSearch, setMoveStudentSearch] = useState('');

  // Derived options for filters
  const allStudentYearOptions = useMemo(() => toUniqueSortedYears(availableYears).length > 0 ? toUniqueSortedYears(availableYears) : DEFAULT_CONFIG_YEARS, [availableYears]);
  const allStudentStatusOptions = useMemo(() => buildStatusOptions(students.map(s => ({ status: s.status }))), [students]);

  const loadRegistrationConfig = useCallback(() => {
    try {
      const savedConfig = localStorage.getItem('registration_form_data');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        const latestConfig = Array.isArray(parsed) ? parsed[parsed.length - 1] : parsed;
        if (latestConfig?.header) {
          setRegistrationConfig(latestConfig);
          const configuredYears = readConfigYears(latestConfig);
          if (configuredYears.length > 0) setAvailableYears(configuredYears);
        }
      }
    } catch (e) { console.warn('Failed to load registration config:', e); }
  }, []);

  const refreshCurrentTerm = useCallback(async () => {
    try {
      const payload = await api.getCurrentTerm();
      const normalized = normalizeTermConfig(payload);
      setCurrentTerm(normalized);
      return normalized;
    } catch (e) { return null; }
  }, []);

  const handleAuthError = useCallback(() => {
    // Navigate to admin login specifically, don't trigger global logout which wipes storage
    navigate('/admin-login');
  }, [navigate]);

  const initialLoadRef = React.useRef(false);

  const loadData = useCallback(async (mode = "initial") => {
    // Only show full loading skeletons if we haven't completed the first load
    if (mode !== "refresh" && !initialLoadRef.current) setLoading(true);
    if (mode === "refresh") setRefreshing(true);
    
    try {
      const [allStudents, payloadTerm] = await Promise.all([
        api.getStudents(undefined, "spring"),
        api.getCurrentTerm("spring")
      ]);

      const normalizedTerm = normalizeTermConfig(payloadTerm);
      setCurrentTerm(prev => {
        if (JSON.stringify(prev) === JSON.stringify(normalizedTerm)) return prev;
        return normalizedTerm;
      });
      
      let termEnrollmentPayload = [];
      if (normalizedTerm?.academicYear && normalizedTerm?.semester) {
        try { 
          termEnrollmentPayload = await api.adminListTermEnrollments({ 
            academicYear: normalizedTerm.academicYear, 
            semester: normalizedTerm.semester, 
            status: 'ENROLLED' 
          }, "spring"); 
        } catch (e) { console.warn("Term sync failed"); }
      }
      
      let pendingRegistrations = [];
      try { 
        const regResponse = await api.adminListRegistrations(undefined, "spring"); 
        pendingRegistrations = Array.isArray(regResponse) ? regResponse : (regResponse?.registrations || regResponse?.data || []); 
      } catch (err) { 
        try { pendingRegistrations = await api.listRegistrations(); } catch (e) { pendingRegistrations = []; } 
      }

      const sortedStudents = [...(allStudents || [])].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      const byStudentId = new Map(sortedStudents.filter(s => s?.studentid || s?.id).map(s => [String(s.studentid || s.id), s]));

      const normalizedEnrolledStudents = normalizeAdminTermEnrollments(termEnrollmentPayload).map(row => {
        const studentId = row?.studentId || row?.student_id || null;
        const linked = studentId ? byStudentId.get(String(studentId)) : null;
        const foundationSection = String(row?.section || '').trim().toUpperCase();
        const majorClassLabel = normalizeClassLabel(row?.majorClassLabel || row?.major_class_label || '');
        const classDisplay = majorClassLabel || foundationSection || normalizeClassLabel(linked?.assigned_class || linked?.assignedClass || '');
        return { ...linked, studentid: studentId || linked?.studentid || linked?.id || null, classDisplay, termAcademicYear: String(row?.academicYear || row?.academic_year || normalizedTerm?.academicYear || '').trim(), termSemester: String(row?.semester ?? normalizedTerm?.semester ?? '') };
      }).filter(s => s.studentid);

      setTermEnrolledStudents(normalizedEnrolledStudents);
      setStudents(sortedStudents);

      const mergedNewRegs = new Map();
      [...(sortedStudents || []).filter(s => s && AWAITING_APPROVAL_STATUSES.includes(String(s.status || s.globalStatus || s.global_status || 'DRAFT').toUpperCase())), ...(pendingRegistrations || []).filter(r => r && AWAITING_APPROVAL_STATUSES.includes(String(r.status || 'PENDING').toUpperCase()))].forEach(item => {
        if (!item) return;
        const key = String(item.studentid || item.studentId || item.id || item.registrationid || item.registrationId || item.email || '').trim().toLowerCase();
        if (key) mergedNewRegs.set(key, { ...mergedNewRegs.get(key), ...item });
      });
      const newRegs = Array.from(mergedNewRegs.values());
      setNewRegistrations(newRegs);

      const paymentSessionCounts = getPaymentSessionCounts(sortedStudents);
      setStats({
        total: (sortedStudents || []).filter(s => s && String(s.status || s.globalStatus || s.global_status || '').toUpperCase() !== 'REJECTED').length,
        pending: newRegs.length,
        approved: (sortedStudents || []).filter(s => s && String(s.status || s.globalStatus || s.global_status || '').toUpperCase() === 'APPROVED').length,
        detailsSubmitted: (sortedStudents || []).filter(s => s && String(s.status || s.globalStatus || s.global_status || '').toUpperCase() === 'DETAILS_SUBMITTED').length,
        paymentPending: paymentSessionCounts?.paymentPending || 0,
        paymentDone: paymentSessionCounts?.paymentDone || 0,
        enrolled: normalizedEnrolledStudents.length || (sortedStudents || []).filter(s => s && isEnrolledStudentRecord(s)).length,
        benefit: (sortedStudents || []).filter(s => s && (s.isBenefitStudent || s.is_benefit_student)).length,
        hostel: (sortedStudents || []).filter(s => s && (s.isHostelStudent || s.is_hostel_student)).length,
        onBreak: (sortedStudents || []).filter(s => s && (s.isOnBreak || s.is_on_break)).length
      });
      loadRegistrationConfig();
      initialLoadRef.current = true; // Mark initial load as complete
    } catch (error) { 
      console.error("[CRITICAL] loadData crashed during execution:", error);
      if (error?.status === 401 || error?.status === 403) {
        handleAuthError();
      } 
    } finally { 
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadRegistrationConfig, navigate, handleAuthError]); // students.length removed to break loop

  const loadClassSectionsForYear = useCallback(async (year) => {
    try {
      const data = await api.getClassSections(year);
      setClassSections(Array.isArray(data) ? data : []);
    } catch (e) { 
      console.error('Failed to load class sections:', e);
      if (e.status === 409) {
        setClassSections([]);
      }
    }
  }, []);

  const handleInitializeSections = async () => {
    setLoading(true);
    try {
      // Backend expects PUT /api/admin/class-sections for each section
      const sectionsToCreate = ['A', 'B', 'C', 'D'];
      for (const section of sectionsToCreate) {
        await api.adminUpdateClassSection({
          yearLevel: selectedYear,
          year: selectedYear,
          section: section,
          maxCapacity: 40,
          isLocked: false
        });
      }
      alert(`Default sections (A,B,C,D) initialized for Year ${selectedYear}`);
      loadClassSectionsForYear(selectedYear);
    } catch (e) { 
      alert(t('Failed to initialize: {{message}}', { message: e.message })); 
    } finally { setLoading(false); }
  };

  const loadMajorClasses = useCallback(async () => {
    if (!currentTerm?.academicYear) return;
    try {
      const data = await api.adminListMajorClasses({
        academicYear: currentTerm.academicYear,
        semester: currentTerm.semester
      });
      const grouped = (Array.isArray(data) ? data : []).reduce((acc, mc) => {
        const year = mc.yearLevel || mc.year || 0;
        if (!acc[year]) acc[year] = [];
        acc[year].push(mc);
        return acc;
      }, {});
      setMajorClassesByYear(grouped);
    } catch (e) { 
      console.error(t('Failed to load major classes:'), e);
      setMajorClassesByYear({});
    }
  }, [currentTerm?.academicYear, currentTerm?.semester]);

  const handleUpdateSection = async (sectionData) => {
    setLoading(true);
    try {
      await api.adminUpdateClassSection(sectionData);
      alert(t('Section updated successfully'));
      setEditingSection({});
      loadClassSectionsForYear(selectedYear);
    } catch (e) { alert(t('Failed to update section: {{message}}', { message: e.message })); }
    finally { setLoading(false); }
  };

  const handleUpdateMajorClass = async (mcData) => {
    setLoading(true);
    try {
      await api.adminUpdateMajorClass(mcData);
      alert(t('Major class updated successfully'));
      setEditingSection({});
      loadMajorClasses();
    } catch (e) { alert(t('Failed to update major class: {{message}}', { message: e.message })); }
    finally { setLoading(false); }
  };

  const handleMoveStudent = async () => {
    if (!moveStudentData.studentId || !moveStudentData.toSection) {
      alert(t('Please select both student and target section'));
      return;
    }
    setLoading(true);
    try {
      await api.adminMoveStudentSection(moveStudentData);
      alert(t('Student moved successfully'));
      setMoveStudentData({ studentId: '', toSection: '' });
      setMoveStudentSearch('');
      loadClassSectionsForYear(selectedYear);
      loadData();
    } catch (e) { alert(t('Failed to move student: {{message}}', { message: e.message })); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!admin) {
      const adminData = localStorage.getItem('adminData') || sessionStorage.getItem('user');
      if (!adminData) { 
        handleAuthError();
        return; 
      }
      setAdmin(JSON.parse(adminData));
    }
    loadData();
  }, [admin, loadData, handleAuthError]);

  useEffect(() => {
    if (activeTab === 'class-sections') {
      loadClassSectionsForYear(selectedYear);
      loadMajorClasses();
    }
  }, [activeTab, selectedYear, loadClassSectionsForYear, loadMajorClasses]);

  // Tab Sidebar Layout Helpers
  const sidebarLinks = [
    { key: 'overview', label: t('Overview'), icon: 'dashboard', count: null },
    { key: 'new', label: t('New Registrations'), icon: 'group_add', count: stats.pending, section: t('Student Management') },
    { key: 'details', label: t('Details Review'), icon: 'fact_check', count: stats.detailsSubmitted },
    { key: 'payment', label: t('Payment Desk'), icon: 'payments', count: stats.paymentPending + stats.paymentDone },
    { key: 'enrolled', label: t('Enrolled List'), icon: 'school', count: stats.enrolled, section: t('Academic') },
    { key: 'all', label: t('Full Directory'), icon: 'groups', count: null },
    { key: 'composer', label: t('Form Designer'), icon: 'settings_applications', count: null, section: t('System') },
    { key: 'class-sections', label: t('Section Config'), icon: 'grid_view', count: null },
    { key: 'term-management', label: t('Term Management'), icon: 'calendar_today', count: null },
    ];
  const kpis = [
    { label: t("TOTAL REGISTRATIONS"), value: stats.total, icon: "groups", tone: "primary", hint: t("Active system records") },
    { label: t("PENDING APPROVAL"), value: stats.pending, icon: "hourglass_empty", tone: "amber", hint: t("Waiting for review") },
    { label: t("SUCCESSFULLY ENROLLED"), value: stats.enrolled, icon: "verified", tone: "emerald", hint: t("Current semester") },
    { label: t("FINANCIAL AID"), value: stats.benefit, icon: "payments", tone: "indigo", hint: t("Benefit students") },
    { label: t("HOSTEL RESIDENTS"), value: stats.hostel, icon: "home", tone: "cyan", hint: t("On-campus stay") },
    { label: t("ON ACADEMIC BREAK"), value: stats.onBreak, icon: "pause_circle", tone: "rose", hint: t("Inactive status") },
  ];

  // Generate username from English name + batch year
  const generateUsername = (student) => {
    // Determine batch year from academic year entered
    const yearEntered = parseInt(student.academicyearentered || student.academic_year_entered || 0);
    const batch = yearEntered > 2000 ? yearEntered - 2012 : 0;
    
    let englishName = student.nameen || student.nameEn || student.englishName;
    
    // If no English name, prompt admin to enter it
    if (!englishName || englishName.trim() === '') {
      englishName = prompt(
        `Enter English name for ${student.namemm}:\n\n` +
        `(Example: thantzin, aungaung, myomyo)\n\n` +
        `Please type the English name:`
      );
      if (!englishName) {
        alert('English name is required!');
        return null;
      }
    }
    
    // Clean: lowercase, remove spaces/special chars
    const cleanName = englishName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '');
    
    return batch > 0 ? `b${batch}-${cleanName}` : cleanName;
  };

  // Generate strong 16-character password
  const generateStrongPassword = (length = 16) => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const digits = '23456789';
    const symbols = ' @#$%&*!?-_';
    const all = upper + lower + digits + symbols;

    const pickRandom = (charset) => {
      if (window.crypto?.getRandomValues) {
        const arr = new Uint32Array(1);
        window.crypto.getRandomValues(arr);
        return charset[arr[0] % charset.length];
      }
      return charset[Math.floor(Math.random() * charset.length)];
    };

    // Ensure at least one of each type
    const chars = [
      pickRandom(upper),
      pickRandom(lower),
      pickRandom(digits),
      pickRandom(symbols)
    ];

    // Fill remaining with random chars
    for (let i = chars.length; i < length; i += 1) {
      chars.push(pickRandom(all));
    }

    // Fisher-Yates shuffle
    for (let i = chars.length - 1; i > 0; i -= 1) {
      const j = window.crypto?.getRandomValues
        ? (() => { const arr = new Uint32Array(1); window.crypto.getRandomValues(arr); return arr[0] % (i + 1); })()
        : Math.floor(Math.random() * (i + 1));
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join('');
  };

  const getDraftRecordId = (student) => {
    if (student.studentid || student.id) return `s_${student.studentid || student.id}`;
    if (student.registrationid || student.registrationId || student.registration_id) return `r_${student.registrationid || student.registrationId || student.registration_id}`;
    if (student.email) return `e_${encodeURIComponent(student.email)}`;
    return 'unknown';
  };

  const openDraftDetail = (student) => {
    const recordId = getDraftRecordId(student);
    navigate(`/admin/new-student-draft-detail/${recordId}`, {
      state: { draftRecord: student }
    });
  };

  const approveStudent = async (student) => {
    const studentId = student.studentid || student.id;
    if (!studentId) {
      alert('Cannot approve: no student ID found.');
      return;
    }

    // 1. Generate username (prompts for English name if needed)
    const suggestedUsername = generateUsername(student);
    if (!suggestedUsername) return;

    // 2. Allow admin to modify username
    const usernameInput = prompt('Enter username for student:', suggestedUsername);
    if (!usernameInput || !usernameInput.trim()) {
      alert('Username is required.');
      return;
    }
    const username = usernameInput.trim();

    // 3. Generate strong password
    const password = generateStrongPassword(16);

    // 4. Confirm action
    const confirmApprove = window.confirm(
      `Approve ${student.namemm}?\n\n` +
      `Username: ${username}\n` +
      `Password: ${password}\n\n` +
      `Email will be sent to: ${student.email}\n\nContinue?`
    );

    if (!confirmApprove) return;

    setLoading(true);
    try {
      // 5. Call API - updates student status, creates user account, sends email
      const result = await api.approveStudent(studentId, {
        username: username,
        password: password
      });

      // 6. Show result
      const emailStatus = result?.emailSent 
        ? 'Email sent successfully.' 
        : `Email status: ${result?.emailError || 'Process completed'}`;
      
      alert(
        `Approved ${student.namemm}!\n\n` +
        `Username: ${username}\n` +
        `Password: ${password}\n\n` +
        `${emailStatus}\n` +
        `Recipient: ${student.email || '-'}`
      );

      loadData(); // Refresh data
    } catch (error) {
      console.error('Approve error:', error);
      alert('Error: ' + (error.message || 'Verification failed'));
    } finally {
      setLoading(false);
    }
  };

  const approveDetails = async (student) => {
    const confirm = window.confirm(`Approve ${student.namemm}'s details?`);
    if (!confirm) return;
    setLoading(true);
    try { await api.updateStudent(student.studentid || student.id, { status: 'PAYMENT_REQUIRED' }); loadData(); } catch (e) { alert(e.message); } finally { setLoading(false); }
  };

  const approvePayment = async (student) => {
    const confirm = window.confirm(`Approve payment for ${student.namemm}?`);
    if (!confirm) return;
    setLoading(true);
    try { await api.updateStudent(student.studentid || student.id, { status: 'PAYMENT_DONE' }); loadData(); } catch (e) { alert(e.message); } finally { setLoading(false); }
  };

  const exportPaymentStudentsToExcel = () => {
    const filtered = getFilteredPaymentStudents();
    if (filtered.length === 0) {
      alert("No data available to export.");
      return;
    }

    // Map data to array of objects (keys = column headers)
    const exportData = filtered.map(student => ({
      "Name": student.namemm || "-",
      "Username": student.user_name || "-",
      "Email": student.email || "-",
      "Phone": student.phone || "-",
      "Year": getResolvedYearValue(student) || "-",
      "Academic Year": getResolvedAcademicYearValue(student, currentTerm),
      "Semester": getResolvedSemesterValue(student, currentTerm),
      "Payment Status": normalizePaymentSessionStatus(student),
      "Benefit Student": (student.isBenefitStudent || student.is_benefit_student) ? "Yes" : "No",
      "Hostel Student": (student.isHostelStudent || student.is_hostel_student) ? "Yes" : "No"
    }));

    // Convert to worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    // Create workbook
    const wb = XLSX.utils.book_new();
    // Append sheet
    XLSX.utils.book_append_sheet(wb, ws, "Payment Desk");
    // Trigger browser download
    XLSX.writeFile(wb, `Payment_Verification_List_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportStudentsToExcel = () => {
    const filtered = getFilteredStudents();
    if (filtered.length === 0) {
      alert("No data available to export.");
      return;
    }

    // Map data to array of objects (keys = column headers)
    const exportData = filtered.map(student => ({
      "Name": student.namemm || "-",
      "Username": student.user_name || "-",
      "Email": student.email || "-",
      "Phone": student.phone || "-",
      "Year": getResolvedYearValue(student) || "-",
      "Academic Year": getResolvedAcademicYearValue(student, currentTerm),
      "Semester": getResolvedSemesterValue(student, currentTerm),
      "Status": student.status || "-",
      "Benefit Student": (student.isBenefitStudent || student.is_benefit_student) ? "Yes" : "No",
      "Hostel Student": (student.isHostelStudent || student.is_hostel_student) ? "Yes" : "No",
      "On Break": (student.isOnBreak || student.is_on_break) ? "Yes" : "No",
      "Address": student.address || "-",
      "NRC": student.nrc || student.nrc_number || "-",
      "Date of Birth": formatDate(student.date_of_birth || student.dateOfBirth)
    }));

    // Convert to worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    // Create workbook
    const wb = XLSX.utils.book_new();
    // Append sheet
    XLSX.utils.book_append_sheet(wb, ws, "Student Directory");
    // Trigger browser download
    XLSX.writeFile(wb, `Student_Directory_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getFilteredStudents = () => {
    let filtered = [...students];
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(s => 
        (s.namemm?.toLowerCase().includes(search)) || 
        (s.user_name?.toLowerCase().includes(search)) || 
        (s.email?.toLowerCase().includes(search))
      );
    }
    if (filters.year) filtered = filtered.filter(s => String(getResolvedYearValue(s)) === filters.year);
    if (filters.batch) filtered = filtered.filter(s => getResolvedAcademicYearValue(s, currentTerm) === filters.batch);
    if (filters.semester) filtered = filtered.filter(s => String(getResolvedSemesterValue(s, currentTerm)) === filters.semester);
    if (filters.status) filtered = filtered.filter(s => normalizeStatusValue(s.status) === normalizeStatusValue(filters.status));
    return filtered;
  };

  const getFilteredPaymentStudents = () => {
    let filtered = students.filter(s => isPaymentSessionStudentRecord(s));
    if (paymentFilters.search) {
      const search = paymentFilters.search.toLowerCase();
      filtered = filtered.filter(s => 
        (s.namemm?.toLowerCase().includes(search)) || 
        (s.user_name?.toLowerCase().includes(search)) || 
        (s.email?.toLowerCase().includes(search))
      );
    }
    if (paymentFilters.year) filtered = filtered.filter(s => getResolvedYearValue(s) === parseInt(paymentFilters.year));
    if (paymentFilters.batch) filtered = filtered.filter(s => getResolvedAcademicYearValue(s, currentTerm) === paymentFilters.batch);
    if (paymentFilters.semester) filtered = filtered.filter(s => getResolvedSemesterValue(s, currentTerm) === paymentFilters.semester);
    if (paymentFilters.paymentStatus) filtered = filtered.filter(s => normalizePaymentSessionStatus(s) === paymentFilters.paymentStatus);
    return filtered;
  };

  const getFilteredEnrolledStudents = () => {
    let filtered = [...termEnrolledStudents];
    if (enrolledFilters.search) {
      const search = enrolledFilters.search.toLowerCase();
      filtered = filtered.filter(s => s.namemm?.toLowerCase().includes(search));
    }
    if (enrolledFilters.year) filtered = filtered.filter(s => String(getResolvedYearValue(s)) === enrolledFilters.year);
    if (enrolledFilters.batch) filtered = filtered.filter(s => s.termAcademicYear === enrolledFilters.batch);
    if (enrolledFilters.semester) filtered = filtered.filter(s => s.termSemester === enrolledFilters.semester);
    if (enrolledFilters.class) filtered = filtered.filter(s => s.classDisplay === enrolledFilters.class);
    return filtered;
  };

  if (!admin) return <div className="flex h-screen items-center justify-center bg-white dark:bg-slate-950 font-black text-teal-600 uppercase tracking-widest text-xs animate-pulse">Synchronizing System...</div>;

  return (
    <div className="flex h-full w-full bg-white dark:bg-slate-950 overflow-hidden font-roboto">
      {/* SIDEBAR */}
      <aside className="w-72 flex flex-col border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 transition-all shrink-0">
        <div className="h-20 flex items-center px-8">
            <span className="text-2xl font-black tracking-tighter text-teal-600">
                Uni<span className="text-slate-900 dark:text-white font-black">Admin</span>
            </span>
        </div>
        <nav className="flex-1 px-4 py-8 space-y-1.5 overflow-y-auto scrollbar-hide">
            {sidebarLinks.map((link) => (
                <React.Fragment key={link.key}>
                    {link.section && (
                        <div className="pt-8 pb-3 px-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{t(link.section)}</p>
                        </div>
                    )}
                    <button
                        onClick={() => setActiveTab(link.key)}
                        className={cn(
                            "w-full group flex items-center rounded-2xl px-4 py-3 transition-all duration-300",
                            activeTab === link.key 
                                ? "bg-slate-900 text-white shadow-xl shadow-slate-200 dark:bg-teal-600 dark:shadow-teal-900/20" 
                                : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
                        )}
                    >
                        <span className="material-icons-outlined text-[22px] mr-4 transition-transform group-hover:scale-110 duration-300">{link.icon}</span>
                        <span className="text-sm font-bold tracking-tight">{t(link.label)}</span>
                        {link.count > 0 && (
                            <span className="ml-auto rounded-lg bg-teal-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-teal-600 dark:bg-teal-950 dark:text-teal-400 border border-teal-100 dark:border-teal-900">
                                {link.count}
                            </span>
                        )}
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
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate">System Admin</p>
                    </div>
                </div>
                <button onClick={onLogout} className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-100 dark:border-slate-800 transition-all text-xs font-black uppercase tracking-widest shadow-sm active:scale-[0.98]">
                    <span className="material-icons-round text-sm">logout</span>
                    <span>Sign Out</span>
                </button>
            </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* HEADER */}
        <header className="flex h-20 items-center justify-between border-b border-slate-100 bg-white/80 px-10 dark:border-slate-800 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
            <div className="flex flex-col">
                <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase tracking-widest text-[11px] opacity-40 mb-0.5">NAVIGATION CONTEXT</h1>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 capitalize">{t("Registration Dashboard")} • {t(activeTab.replace('-', ' '))}</p>
            </div>
            <div className="flex items-center gap-6">
                <LanguageSwitcher />
                <button className="relative rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700">
                    <span className="material-icons-outlined">notifications</span>
                    <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-950"></span>
                </button>
                <div className="h-8 w-px bg-slate-100 dark:bg-slate-800" />
                <div className="flex items-center gap-4 pl-2">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-black text-slate-900 dark:text-white leading-tight tracking-tight uppercase">{admin.adminname}</p>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Protocol Admin</p>
                    </div>
                    <div className="h-10 w-10 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-white dark:border-slate-800 grid place-items-center text-teal-600 font-black uppercase shadow-sm">{admin.adminname?.charAt(0)}</div>
                </div>
            </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
            <div className="px-10 py-10 space-y-10 animate-in fade-in duration-1000 slide-in-from-bottom-4 max-w-full">
                
                {/* KPI Grid */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4 max-w-full">
                    {kpis.map((kpi, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] p-6 transition-all hover:-translate-y-2 hover:shadow-2xl group cursor-default relative overflow-hidden min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-4 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="shrink-0 transform group-hover:scale-110 transition-transform duration-500 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <IconBadge icon={kpi.icon} tone={kpi.tone} />
                                    </div>
                                    <div>
                                        <div className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{kpi.label}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-end justify-between gap-2 relative z-10">
                                <div className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">
                                    {loading ? <Skeleton className="h-10 w-20 rounded-xl" /> : kpi.value}
                                </div>
                                <div className="flex items-end gap-1 mb-2">
                                    {[6, 14, 10, 22, 18, 28, 24].map((h, i) => (
                                        <div key={i} className="w-1 rounded-full bg-teal-500/10 group-hover:bg-teal-500/40 transition-all duration-700" style={{ height: `${h}px` }} />
                                    ))}
                                </div>
                            </div>
                            <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-800/50 flex justify-between items-center relative z-10">
                                <span className="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em]">{kpi.hint}</span>
                                <div className="h-5 w-5 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                                    <span className="text-teal-500 material-icons-outlined text-[12px]">arrow_forward</span>
                                </div>
                            </div>
                            <div className={cn("absolute top-0 right-0 h-20 w-20 rounded-bl-full transform translate-x-4 -translate-y-4 transition-transform group-hover:scale-110", kpi.tone === 'primary' ? "bg-teal-500/5" : kpi.tone === 'amber' ? "bg-amber-500/5" : kpi.tone === 'rose' ? "bg-rose-500/5" : "bg-emerald-500/5")} />
                        </div>
                    ))}
                </section>

                {/* CONTENT AREA WRAPPER */}
                <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[40px] p-1 shadow-sm min-h-[600px] max-w-full overflow-hidden">
                    <div className="p-10 max-w-full overflow-hidden">
                        {activeTab === 'overview' && (
                            <div className="space-y-10 animate-in fade-in duration-700">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                                        <span className="material-icons-outlined text-teal-600 text-2xl">analytics</span>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{t("System Summary")}</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t("Real-time Registration Pulse")}</p>
                                        </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="bg-slate-50/50 dark:bg-slate-950/50 rounded-[32px] p-8 border border-slate-100 dark:border-slate-800 relative group overflow-hidden transition-all hover:shadow-lg">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 px-1">{t("Performance Metrics")}</h4>
                                        <div className="space-y-4">
                                           {[
                                               { l: t("Total Registrations"), v: stats.total, c: "teal" },
                                               { l: t("Successfully Approved"), v: stats.approved, c: "emerald" },
                                               { l: t("Successfully Enrolled"), v: stats.enrolled, c: "cyan" },
                                               { l: t("Verification Pending"), v: stats.pending + stats.detailsSubmitted, c: "rose" }
                                           ].map((row, i) => (
                                               <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:translate-x-1">
                                                   <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{row.l}</span>
                                                   <span className={cn("text-xl font-black", `text-${row.c}-600 dark:text-${row.c}-400`)}>{row.v}</span>
                                               </div>
                                           ))}
                                        </div>
                                        <div className="absolute top-0 right-0 h-32 w-32 bg-teal-500/5 rounded-bl-full transform group-hover:scale-110 transition-transform" />
                                        </div>
                                        <div className="bg-slate-50/50 dark:bg-slate-950/50 rounded-[32px] p-8 border border-slate-100 dark:border-slate-800 relative group overflow-hidden transition-all hover:shadow-lg">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 px-1">{t("Demographics")}</h4>
                                        <div className="space-y-4">
                                           {[
                                               { l: t("Financial Aid Required"), v: stats.benefit, c: "indigo" },
                                               { l: t("On-Campus Hostel"), v: stats.hostel, c: "cyan" },
                                               { l: t("Academic Leave"), v: stats.onBreak, c: "amber" }
                                           ].map((row, i) => (
                                               <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:translate-x-1">
                                                   <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{row.l}</span>
                                                   <span className={cn("text-xl font-black", `text-${row.c}-600 dark:text-${row.c}-400`)}>{row.v}</span>
                                               </div>
                                           ))}
                                        </div>
                                        <div className="absolute top-0 right-0 h-32 w-32 bg-indigo-500/5 rounded-bl-full transform group-hover:scale-110 transition-transform" />
                                        </div>
                                        </div>
                                {/* Recent Activity Section */}
                                <div className="bg-slate-50/30 dark:bg-slate-950/30 rounded-[32px] p-10 border border-slate-100 dark:border-slate-800 relative group overflow-hidden">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-teal-600 border border-slate-100 dark:border-slate-800 shadow-sm">
                                            <span className="material-icons-outlined">history</span>
                                        </div>
                                        <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase">{t("Recent Registration Activity")}</h4>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        {newRegistrations.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {newRegistrations.slice(0, 8).map((student, i) => (
                                                    <div key={i} className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2 shadow-sm hover:border-teal-500/30 transition-all cursor-default group/item">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
                                                        {student.namemm}
                                                        <span className="text-[10px] opacity-40 font-black tracking-widest">{t(student.status || 'PENDING')}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs font-black text-slate-300 uppercase tracking-widest">{t("No recent synchronization events recorded.")}</p>
                                        )}
                                    </div>
                                    <div className="absolute top-0 right-0 h-24 w-24 bg-teal-500/5 rounded-bl-full transform group-hover:scale-110 transition-transform" />
                                </div>
                            </div>
                        )}
                        {activeTab === 'new' && (
                            <div className="space-y-8 animate-in fade-in duration-700">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{t("New Student Registrations")}</h3>
                                    <span className="px-4 py-1.5 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-600 text-[10px] font-black uppercase tracking-widest border border-teal-100 dark:border-teal-800">{newRegistrations.length} {t("PENDING")}</span>

                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {newRegistrations.map((student, i) => (
                                        <div key={i} className="group bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-[32px] p-6 hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-teal-600 font-black border border-slate-100 dark:border-slate-800 shadow-sm">{student.namemm?.charAt(0)}</div>
                                                <span className="text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md border border-amber-100/50">{student.status || 'DRAFT'}</span>
                                            </div>
                                            <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-4">{student.namemm}</h4>
                                            
                                            <div className="space-y-3 mb-8">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Email</span>
                                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">{student.email || '-'}</span>
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Phone</span>
                                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{student.phone || '-'}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Matric Roll</span>
                                                        <span className="text-xs font-bold text-slate-900 dark:text-white">{student.matriculation_rollno || '-'}</span>
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Marks</span>
                                                        <span className="text-xs font-bold text-slate-900 dark:text-white">{student.totalmarks_obtained || '-'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 mb-3">
                                                <button onClick={() => approveStudent(student)} className="bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl shadow-md shadow-teal-500/10 active:scale-95 transition-all">Verify</button>
                                                <button onClick={() => openRejectDialog(student)} className="bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest py-3 rounded-xl hover:bg-slate-50 transition-all active:scale-95">Decline</button>
                                            </div>
                                            <button onClick={() => openDraftDetail(student)} className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95">Detail</button>
                                            <div className="absolute top-0 right-0 h-20 w-20 bg-teal-500/5 rounded-bl-full transform group-hover:scale-110 transition-transform" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {activeTab === 'details' && (
                            <div className="space-y-8 animate-in fade-in duration-700">
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Details Verification Queue</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    {students.filter(s => String(s.status || '').toUpperCase() === 'DETAILS_SUBMITTED').map((student, i) => (
                                        <div key={i} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl hover:shadow-lg transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-800 grid place-items-center text-teal-600 font-black border border-slate-100 dark:border-slate-800 shadow-sm">{student.namemm?.charAt(0)}</div>
                                                <div>
                                                    <div className="font-black text-slate-900 dark:text-white">{student.namemm}</div>
                                                    <div className="text-xs font-bold text-slate-400">{student.user_name} • {student.email}</div>
                                                </div>
                                            </div>
                                            <button onClick={() => approveDetails(student)} className="px-6 py-3 bg-teal-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-teal-700 active:scale-95 transition-all">Review & Approve</button>
                                        </div>
                                    ))}
                                    {students.filter(s => String(s.status || '').toUpperCase() === 'DETAILS_SUBMITTED').length === 0 && (
                                        <div className="p-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[32px]">No details pending verification</div>
                                    )}
                                </div>
                            </div>
                        )}
                        {activeTab === 'payment' && (
                            <div className="space-y-8 animate-in fade-in duration-700">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Payment Verification Desk</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                            Current Term: {currentTerm?.academicYear || '-'} | Semester {currentTerm?.semester || '-'}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => exportPaymentStudentsToExcel()} 
                                        className="inline-flex items-center gap-2 bg-slate-900 dark:bg-teal-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:shadow-xl active:scale-95 transition-all w-fit"
                                    >
                                        <span className="material-icons-outlined text-sm">download</span>
                                        Export to Excel
                                    </button>
                                </div>

                                {/* Professional Filter Bar */}
                                <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-[24px] border border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3 shadow-sm">
                                    <div className="relative group flex-1 min-w-[300px]">
                                        <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors text-sm">search</span>
                                        <input 
                                            type="text" 
                                            placeholder="Search by name, username, email..."
                                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-teal-500/5 focus:border-teal-500/30 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                            value={paymentFilters.search}
                                            onChange={(e) => setPaymentFilters({...paymentFilters, search: e.target.value})}
                                        />
                                    </div>
                                    <select 
                                        value={paymentFilters.year}
                                        onChange={(e) => setPaymentFilters({...paymentFilters, year: e.target.value})}
                                        className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-teal-500/30 transition-all cursor-pointer min-w-[140px]"
                                    >
                                        <option value="" className="dark:bg-slate-900">All Years</option>
                                        {allStudentYearOptions.map(y => <option key={y} value={y} className="dark:bg-slate-900">Year {y}</option>)}
                                    </select>
                                    <select 
                                        value={paymentFilters.batch}
                                        onChange={(e) => setPaymentFilters({...paymentFilters, batch: e.target.value})}
                                        className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-teal-500/30 transition-all cursor-pointer min-w-[140px]"
                                    >
                                        <option value="" className="dark:bg-slate-900">All Academic Years</option>
                                        {currentTerm?.academicYear && <option value={currentTerm.academicYear} className="dark:bg-slate-900">{currentTerm.academicYear}</option>}
                                    </select>
                                    <select 
                                        value={paymentFilters.semester}
                                        onChange={(e) => setPaymentFilters({...paymentFilters, semester: e.target.value})}
                                        className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-teal-500/30 transition-all cursor-pointer min-w-[100px]"
                                    >
                                        <option value="" className="dark:bg-slate-900">Semester</option>
                                        {[1,2].map(s => <option key={s} value={s} className="dark:bg-slate-900">{s}</option>)}
                                    </select>
                                    <select 
                                        value={paymentFilters.paymentStatus}
                                        onChange={(e) => setPaymentFilters({...paymentFilters, paymentStatus: e.target.value})}
                                        className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-teal-500/30 transition-all cursor-pointer min-w-[180px]"
                                    >
                                        <option value="" className="dark:bg-slate-900">All Payment Status</option>
                                        <option value="PAYMENT_PENDING" className="dark:bg-slate-900">PAYMENT_PENDING</option>
                                        <option value="PAYMENT_DONE" className="dark:bg-slate-900">PAYMENT_DONE</option>
                                    </select>
                                </div>

                                {/* Detailed Table */}
                                <div className="bg-white dark:bg-slate-950/50 rounded-[32px] border border-slate-100 dark:border-slate-800 overflow-x-auto shadow-sm scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                                    <table className="w-full border-collapse min-w-[1000px]">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Name</th>
                                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Username</th>
                                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Email</th>
                                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Year</th>
                                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Academic Year</th>
                                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Semester</th>
                                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Payment Status</th>
                                                <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {getFilteredPaymentStudents().map((student, i) => (
                                                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900 transition-colors group">
                                                    <td className="px-6 py-6 whitespace-nowrap">
                                                        <div className="font-black text-slate-900 dark:text-white text-xs">{student.namemm}</div>
                                                    </td>
                                                    <td className="px-6 py-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">{student.user_name || '-'}</td>
                                                    <td className="px-6 py-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">{student.email}</td>
                                                    <td className="px-6 py-6 text-[11px] font-black text-slate-500 uppercase text-center whitespace-nowrap">{getResolvedYearValue(student) || '-'}</td>
                                                    <td className="px-6 py-6 text-[11px] font-bold text-slate-500 uppercase text-center tabular-nums whitespace-nowrap">{getResolvedAcademicYearValue(student, currentTerm)}</td>
                                                    <td className="px-6 py-6 text-[11px] font-bold text-slate-500 text-center whitespace-nowrap">{getResolvedSemesterValue(student, currentTerm)}</td>
                                                    <td className="px-6 py-6 whitespace-nowrap">
                                                        <span className={cn(
                                                            "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                                                            normalizePaymentSessionStatus(student) === 'PAYMENT_DONE' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                                                        )}>{normalizePaymentSessionStatus(student)}</span>
                                                    </td>
                                                    <td className="px-6 py-6 text-right whitespace-nowrap">
                                                        {normalizePaymentSessionStatus(student) === 'PAYMENT_PENDING' ? (
                                                            <button 
                                                                onClick={() => approvePayment(student)}
                                                                className="px-4 py-2 bg-teal-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-teal-700 shadow-md shadow-teal-500/10 active:scale-95 transition-all"
                                                            >
                                                                Verify Payment
                                                            </button>
                                                        ) : (
                                                            <div className="flex justify-end gap-2">
                                                                <button 
                                                                                                                            onClick={() => navigate(`/admin/submitted-details-review/${student.studentid || student.id}`, { state: { studentRecord: student } })}
                                                                                                                            className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-teal-600 transition-all"><span className="material-icons-outlined text-sm">visibility</span></button>
                                                                <button className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-emerald-600 border border-emerald-100 dark:border-emerald-900/30 transition-all"><span className="material-icons-outlined text-sm">check_circle</span></button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {getFilteredPaymentStudents().length === 0 && (
                                                <tr>
                                                    <td colSpan={8} className="p-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs">No matching records found in desk</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        {activeTab === 'enrolled' && (
                            <div className="space-y-8 animate-in fade-in duration-700">
                                <div className="flex flex-col gap-6">
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Enrolled Students Archive</h3>
                                    
                                    {/* Filter Bar */}
                                    <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-[24px] border border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3 shadow-sm">
                                        <div className="relative group flex-1 min-w-[300px]">
                                            <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors text-sm">search</span>
                                            <input 
                                                type="text" 
                                                placeholder="Search by name..."
                                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-teal-500/5 focus:border-teal-500/30 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                                value={enrolledFilters.search}
                                                onChange={(e) => setEnrolledFilters({...enrolledFilters, search: e.target.value})}
                                            />
                                        </div>
                                        <select 
                                            value={enrolledFilters.year}
                                            onChange={(e) => setEnrolledFilters({...enrolledFilters, year: e.target.value})}
                                            className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-teal-500/30 transition-all cursor-pointer min-w-[120px]"
                                        >
                                            <option value="" className="dark:bg-slate-900">Year</option>
                                            {DEFAULT_CONFIG_YEARS.map(y => <option key={y} value={y} className="dark:bg-slate-900">{y}</option>)}
                                        </select>
                                        <select 
                                            value={enrolledFilters.batch}
                                            onChange={(e) => setEnrolledFilters({...enrolledFilters, batch: e.target.value})}
                                            className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-teal-500/30 transition-all cursor-pointer min-w-[140px]"
                                        >
                                            <option value="" className="dark:bg-slate-900">Academic Year</option>
                                            {currentTerm?.academicYear && <option value={currentTerm.academicYear} className="dark:bg-slate-900">{currentTerm.academicYear}</option>}
                                        </select>
                                        <select 
                                            value={enrolledFilters.semester}
                                            onChange={(e) => setEnrolledFilters({...enrolledFilters, semester: e.target.value})}
                                            className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-teal-500/30 transition-all cursor-pointer min-w-[100px]"
                                        >
                                            <option value="" className="dark:bg-slate-900">Semester</option>
                                            {[1,2].map(s => <option key={s} value={s} className="dark:bg-slate-900">{s}</option>)}
                                        </select>
                                        <select 
                                            value={enrolledFilters.class}
                                            onChange={(e) => setEnrolledFilters({...enrolledFilters, class: e.target.value})}
                                            className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-teal-500/30 transition-all cursor-pointer min-w-[100px]"
                                        >
                                            <option value="" className="dark:bg-slate-900">Class</option>
                                            {BASE_CLASS_OPTIONS.map(c => <option key={c} value={c} className="dark:bg-slate-900">{c}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-950/50 rounded-[32px] border border-slate-100 dark:border-slate-800 overflow-x-auto shadow-sm scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                                    <table className="w-full border-collapse min-w-[1000px]">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Name</th>
                                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Username</th>
                                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Email</th>
                                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Year</th>
                                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Academic Year</th>
                                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Semester</th>
                                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Class</th>
                                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Status</th>
                                                <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {getFilteredEnrolledStudents().map((student, i) => (
                                                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900 transition-colors group">
                                                    <td className="px-6 py-6 whitespace-nowrap">
                                                        <div className="font-black text-slate-900 dark:text-white text-xs">{student.namemm}</div>
                                                    </td>
                                                    <td className="px-6 py-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">{student.user_name || '-'}</td>
                                                    <td className="px-6 py-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">{student.email || '-'}</td>
                                                    <td className="px-6 py-6 text-[11px] font-black text-slate-500 uppercase text-center whitespace-nowrap">{getResolvedYearValue(student) || '-'}</td>
                                                    <td className="px-6 py-6 text-[11px] font-bold text-slate-500 uppercase text-center tabular-nums whitespace-nowrap">{student.termAcademicYear || '-'}</td>
                                                    <td className="px-6 py-6 text-[11px] font-bold text-slate-500 text-center whitespace-nowrap">{student.termSemester || '-'}</td>
                                                    <td className="px-6 py-6 text-[11px] font-black text-slate-500 text-center whitespace-nowrap">{student.classDisplay || '-'}</td>
                                                    <td className="px-6 py-6 whitespace-nowrap">
                                                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-lg border border-emerald-100">ENROLLED</span>
                                                    </td>
                                                    <td className="px-6 py-6 text-right whitespace-nowrap">
                                                        <button 
                                                            onClick={() => navigate(`/admin/submitted-details-review/${student.studentid || student.id}`, { state: { studentRecord: student } })}
                                                            className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-teal-600 transition-all"><span className="material-icons-outlined text-sm">visibility</span></button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {getFilteredEnrolledStudents().length === 0 && (
                                                <tr>
                                                    <td colSpan={9} className="p-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs">No matching records found</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        {activeTab === 'all' && (
                            <div className="space-y-8 animate-in fade-in duration-700">
                                <div className="flex flex-col gap-6">
                                    <div>
                                        <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">All Students</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                            Current Term: {currentTerm?.academicYear || '-'} | Semester {currentTerm?.semester || '-'}
                                        </p>
                                    </div>
                                    
                                    <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-[24px] border border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3 shadow-sm">
                                        <div className="relative group flex-1 min-w-[300px]">
                                            <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors text-sm">search</span>
                                            <input 
                                                type="text" 
                                                placeholder="Search by name, username, email..."
                                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-teal-500/5 focus:border-teal-500/30 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                                value={filters.search}
                                                onChange={(e) => setFilters({...filters, search: e.target.value})}
                                            />
                                        </div>
                                        <select 
                                            value={filters.year}
                                            onChange={(e) => setFilters({...filters, year: e.target.value})}
                                            className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-teal-500/30 transition-all cursor-pointer min-w-[140px]"
                                        >
                                            <option value="" className="dark:bg-slate-900">All Years</option>
                                            {allStudentYearOptions.map(y => <option key={y} value={y} className="dark:bg-slate-900">Year {y}</option>)}
                                        </select>
                                        <select 
                                            value={filters.batch}
                                            onChange={(e) => setFilters({...filters, batch: e.target.value})}
                                            className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-teal-500/30 transition-all cursor-pointer min-w-[180px]"
                                        >
                                            <option value="" className="dark:bg-slate-900">All Academic Years</option>
                                            {currentTerm?.academicYear && <option value={currentTerm.academicYear} className="dark:bg-slate-900">{currentTerm.academicYear}</option>}
                                        </select>
                                        <select 
                                            value={filters.semester}
                                            onChange={(e) => setFilters({...filters, semester: e.target.value})}
                                            className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-teal-500/30 transition-all cursor-pointer min-w-[140px]"
                                        >
                                            <option value="" className="dark:bg-slate-900">All Semesters</option>
                                            {[1,2].map(s => <option key={s} value={String(s)} className="dark:bg-slate-900">Semester {s}</option>)}
                                        </select>
                                        <select 
                                            value={filters.status}
                                            onChange={(e) => setFilters({...filters, status: e.target.value})}
                                            className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-teal-500/30 transition-all cursor-pointer min-w-[160px]"
                                        >
                                            <option value="" className="dark:bg-slate-900">All Status</option>
                                            {allStudentStatusOptions.map(s => <option key={s} value={s} className="dark:bg-slate-900">{s}</option>)}
                                        </select>
                                        <button 
                                            onClick={() => exportStudentsToExcel()} 
                                            className="inline-flex items-center gap-2 bg-slate-900 dark:bg-teal-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:shadow-xl active:scale-95 transition-all w-fit ml-auto"
                                        >
                                            <span className="material-icons-outlined text-sm">download</span>
                                            Export to Excel
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-950/50 rounded-[32px] border border-slate-100 dark:border-slate-800 overflow-x-auto shadow-sm scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                                    <table className="w-full border-collapse min-w-[1200px]">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Name</th>
                                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Username</th>
                                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Email</th>
                                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Year</th>
                                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Academic Year</th>
                                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Semester</th>
                                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Status</th>
                                                <th className="px-4 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Benefit</th>
                                                <th className="px-4 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Hostel</th>
                                                <th className="px-4 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Break</th>
                                                <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {getFilteredStudents().map((student, i) => (
                                                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900 transition-colors group">
                                                    <td className="px-6 py-6 whitespace-nowrap">
                                                        <div className="font-black text-slate-900 dark:text-white text-xs">{student.namemm}</div>
                                                    </td>
                                                    <td className="px-6 py-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">{student.user_name || '-'}</td>
                                                    <td className="px-6 py-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">{student.email}</td>
                                                    <td className="px-6 py-6 text-[11px] font-black text-slate-500 uppercase text-center whitespace-nowrap">{getResolvedYearValue(student) || '-'}</td>
                                                    <td className="px-6 py-6 text-[11px] font-bold text-slate-500 uppercase text-center tabular-nums whitespace-nowrap">{getResolvedAcademicYearValue(student, currentTerm)}</td>
                                                    <td className="px-6 py-6 text-[11px] font-bold text-slate-500 text-center whitespace-nowrap">{getResolvedSemesterValue(student, currentTerm)}</td>
                                                    <td className="px-6 py-6 whitespace-nowrap">
                                                        <span className={cn(
                                                            "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                                                            normalizeStatusValue(student.status) === 'ENROLLED' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-500 border-slate-100"
                                                        )}>{student.status || 'ACTIVE'}</span>
                                                    </td>
                                                    <td className="px-4 py-6 text-center whitespace-nowrap">
                                                        <span className={cn("material-icons-outlined text-sm", (student.isBenefitStudent || student.is_benefit_student) ? "text-teal-500" : "text-slate-300 opacity-40")}>
                                                            {(student.isBenefitStudent || student.is_benefit_student) ? "check_circle" : "cancel"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-6 text-center whitespace-nowrap">
                                                        <span className={cn("material-icons-outlined text-sm", (student.isHostelStudent || student.is_hostel_student) ? "text-indigo-500" : "text-slate-300 opacity-40")}>
                                                            {(student.isHostelStudent || student.is_hostel_student) ? "check_circle" : "cancel"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-6 text-center whitespace-nowrap">
                                                        <span className={cn("material-icons-outlined text-sm", (student.isOnBreak || student.is_on_break) ? "text-amber-500" : "text-slate-300 opacity-40")}>
                                                            {(student.isOnBreak || student.is_on_break) ? "check_circle" : "cancel"}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-6 text-right whitespace-nowrap">
                                                        <button 
                                                            onClick={() => navigate(`/admin/submitted-details-review/${student.studentid || student.id}`, { state: { studentRecord: student } })}
                                                            className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-teal-600 transition-all"><span className="material-icons-outlined text-sm">visibility</span></button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {getFilteredStudents().length === 0 && (
                                                <tr>
                                                    <td colSpan={11} className="p-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs">No records found in student directory</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        {activeTab === 'composer' && <Composer />}
                        {activeTab === 'term-management' && (
                            <AdminTermManagement_Friend 
                                admin={admin} 
                                onBack={() => setActiveTab('overview')} 
                            />
                        )}
                        {activeTab === 'class-sections' && (
                            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                    <div className="space-y-1">
                                        <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Section Management</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Configure capacities and enrollment locks</p>
                                    </div>
                                    <div className="flex items-center gap-4 p-2 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                        <button 
                                            onClick={() => setSectionConfigTab('foundation')}
                                            className={cn(
                                                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                sectionConfigTab === 'foundation' ? "bg-slate-900 text-white shadow-lg dark:bg-teal-600" : "text-slate-400 hover:text-slate-600"
                                            )}
                                        >Foundation</button>
                                        <button 
                                            onClick={() => setSectionConfigTab('major')}
                                            className={cn(
                                                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                sectionConfigTab === 'major' ? "bg-slate-900 text-white shadow-lg dark:bg-teal-600" : "text-slate-400 hover:text-slate-600"
                                            )}
                                        >Major Classes</button>
                                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2" />
                                        <div className="px-4 py-2">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Target Academic Year</p>
                                            <select 
                                                value={selectedYear} 
                                                onChange={(e) => setSelectedYear(parseInt(e.target.value))} 
                                                className="bg-transparent text-sm font-black text-teal-600 outline-none cursor-pointer"
                                            >
                                                {[1,2,3,4,5].map(y => <option key={y} value={y}>Year {y}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {sectionConfigTab === 'foundation' ? (
                                    <>
                                        {/* Foundation Sections Table */}
                                        <div className="bg-white dark:bg-slate-950/50 rounded-[40px] border border-slate-100 dark:border-slate-800 overflow-x-auto shadow-sm scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                                            <table className="w-full border-collapse min-w-[1000px]">
                                                <thead>
                                                    <tr className="bg-slate-900 dark:bg-slate-800 text-white">
                                                        <th className="px-10 py-6 text-left text-sm font-bold tracking-tight">Section</th>
                                                        <th className="px-10 py-6 text-left text-sm font-bold tracking-tight">Max Capacity</th>
                                                        <th className="px-10 py-6 text-center text-sm font-bold tracking-tight">Enrolled</th>
                                                        <th className="px-10 py-6 text-center text-sm font-bold tracking-tight">Remaining</th>
                                                        <th className="px-10 py-6 text-center text-sm font-bold tracking-tight">Locked</th>
                                                        <th className="px-10 py-6 text-right text-sm font-bold tracking-tight">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {classSections.filter(s => s.yearLevel === selectedYear || s.year === selectedYear).map((sec, idx) => {
                                                        const secYear = sec.yearLevel || sec.year;
                                                        const isEditing = !!editingSection.section && 
                                                                         editingSection.section === sec.section && 
                                                                         (editingSection.yearLevel === secYear || editingSection.year === secYear);
                                                        
                                                        const maxCap = sec.maxCapacity || sec.max_capacity || 40;
                                                        const remaining = maxCap - (sec.currentEnrolled || 0);
                                                        
                                                        const enterEdit = () => setEditingSection({...sec, yearLevel: secYear, year: secYear, maxCapacity: maxCap});

                                                        return (
                                                            <tr key={idx} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/30 transition-colors group">
                                                                <td className="px-10 py-8">
                                                                    <div className="h-10 w-10 rounded-xl bg-slate-900 dark:bg-teal-600 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-slate-200 dark:shadow-teal-900/20">{sec.section}</div>
                                                                </td>
                                                                <td className="px-10 py-8 cursor-pointer" onClick={!isEditing ? enterEdit : undefined}>
                                                                    {isEditing ? (
                                                                        <input 
                                                                            type="number" 
                                                                            className="w-24 px-4 py-2 bg-white dark:bg-slate-900 border border-teal-500 rounded-xl text-sm font-black outline-none focus:ring-4 focus:ring-teal-500/10 transition-all shadow-sm"
                                                                            value={editingSection.maxCapacity}
                                                                            autoFocus
                                                                            onChange={(e) => setEditingSection({...editingSection, maxCapacity: parseInt(e.target.value) || 0})}
                                                                        />
                                                                    ) : (
                                                                        <div className="flex items-center gap-2 group/val">
                                                                            <span className="text-lg font-black text-slate-900 dark:text-white">{maxCap}</span>
                                                                            <span className="material-icons-outlined text-[14px] text-slate-300 opacity-0 group-hover/val:opacity-100 transition-opacity">edit</span>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-10 py-8 text-center">
                                                                    <span className="text-sm font-bold text-slate-500">{sec.currentEnrolled || 0}</span>
                                                                </td>
                                                                <td className="px-10 py-8 text-center">
                                                                    <span className={cn(
                                                                        "text-sm font-black",
                                                                        remaining <= 5 ? "text-rose-500" : "text-emerald-500"
                                                                    )}>{remaining}</span>
                                                                </td>
                                                                <td className="px-10 py-8 text-center cursor-pointer" onClick={!isEditing ? enterEdit : undefined}>
                                                                    {isEditing ? (
                                                                        <label className="relative inline-flex items-center cursor-pointer group/toggle">
                                                                            <input 
                                                                                type="checkbox" 
                                                                                className="sr-only peer" 
                                                                                checked={editingSection.isLocked}
                                                                                onChange={(e) => setEditingSection({...editingSection, isLocked: e.target.checked})}
                                                                            />
                                                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600 rounded-full" />
                                                                            <span className="ml-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{editingSection.isLocked ? 'Locked' : 'Open'}</span>
                                                                        </label>
                                                                    ) : (
                                                                        <span className={cn(
                                                                            "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all hover:scale-105",
                                                                            sec.isLocked 
                                                                                ? "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:border-rose-900/50" 
                                                                                : "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900/50"
                                                                        )}>
                                                                            {sec.isLocked ? 'Locked' : 'Active'}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-10 py-8 text-right">
                                                                    {isEditing ? (
                                                                        <div className="flex justify-end gap-2">
                                                                            <button 
                                                                                onClick={() => setEditingSection({})}
                                                                                className="h-10 px-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                                                                            >Cancel</button>
                                                                            <button 
                                                                                onClick={() => handleUpdateSection(editingSection)}
                                                                                className="h-10 px-6 bg-teal-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-teal-500/20 hover:bg-teal-700 transition-all"
                                                                            >Save</button>
                                                                        </div>
                                                                    ) : (
                                                                        <button 
                                                                            onClick={enterEdit}
                                                                            className="h-10 w-10 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-teal-600 rounded-xl flex items-center justify-center transition-all shadow-sm border border-slate-100 dark:border-slate-700/50"
                                                                        >
                                                                            <span className="material-icons-outlined text-sm">edit</span>
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {classSections.filter(s => s.yearLevel === selectedYear || s.year === selectedYear).length === 0 && (
                                                        <tr>
                                                            <td colSpan={6} className="p-20 text-center border-dashed border-2 border-slate-100 dark:border-slate-800 rounded-[40px]">
                                                                <div className="flex flex-col items-center gap-4">
                                                                    <p className="text-slate-300 font-black uppercase tracking-widest text-xs">No sections found for Year {selectedYear}</p>
                                                                    <button 
                                                                        onClick={handleInitializeSections}
                                                                        className="px-8 py-3 bg-teal-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-teal-500/20 hover:bg-teal-700 transition-all active:scale-95"
                                                                    >Initialize Default Sections (A,B,C,D)</button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Student Movement Console */}
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                            <div className="bg-slate-900 dark:bg-slate-950 rounded-[40px] p-10 text-white relative overflow-hidden group">
                                                <div className="relative z-10">
                                                    <div className="flex items-center gap-4 mb-8">
                                                        <div className="h-12 w-12 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-400 border border-teal-500/20">
                                                            <span className="material-icons-outlined text-2xl">sync_alt</span>
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xl font-black tracking-tight uppercase">Student Relocation</h4>
                                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Move student between academic sections</p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-6">
                                                        <div className="grid gap-2">
                                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Find Student</label>
                                                            <div className="relative">
                                                                <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 text-sm">search</span>
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="Search by ID, Name or Email..."
                                                                    className="w-full pl-12 pr-4 py-4 bg-white/5 dark:bg-slate-900 border border-white/10 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-teal-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700"
                                                                    value={moveStudentSearch}
                                                                    onChange={(e) => setMoveStudentSearch(e.target.value)}
                                                                />
                                                                {moveStudentSearch.length > 2 && (
                                                                    <div className="absolute top-full left-0 right-0 mt-4 bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl z-50 overflow-hidden max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-300">
                                                                        {students.filter(s => 
                                                                            s.namemm?.toLowerCase().includes(moveStudentSearch.toLowerCase()) || 
                                                                            s.user_name?.toLowerCase().includes(moveStudentSearch.toLowerCase()) ||
                                                                            String(s.studentid || s.id).includes(moveStudentSearch)
                                                                        ).map((s, idx) => (
                                                                            <button 
                                                                                key={idx}
                                                                                onClick={() => {
                                                                                    setMoveStudentData({...moveStudentData, studentId: s.studentid || s.id});
                                                                                    setMoveStudentSearch('');
                                                                                }}
                                                                                className="w-full px-8 py-5 text-left hover:bg-slate-700/50 transition-all border-b border-slate-700/50 flex items-center justify-between group/result cursor-pointer"
                                                                            >
                                                                                <div>
                                                                                    <p className="text-sm font-black text-white group-hover/result:text-teal-400 transition-colors">{s.namemm}</p>
                                                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{s.user_name || s.id}</p>
                                                                                </div>
                                                                                <span className="text-[10px] font-black text-teal-500 bg-teal-500/10 px-2 py-1 rounded-lg uppercase tracking-widest">{s.section || 'NO SEC'}</span>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                </div>
                                                                </div>

                                                                {moveStudentData.studentId && (
                                                                <div className="flex items-center justify-between p-4 bg-teal-500/10 border border-teal-500/20 rounded-2xl animate-in zoom-in-95 duration-300">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
                                                                    <p className="text-xs font-black uppercase tracking-widest text-teal-400">
                                                                        Target: {students.find(s => (s.studentid || s.id) === moveStudentData.studentId)?.namemm || 'Selected Student'}
                                                                    </p>
                                                                </div>
                                                                <button onClick={() => {setMoveStudentData({...moveStudentData, studentId: ''}); setMoveStudentSearch('');}} className="text-[10px] font-black text-slate-500 hover:text-white uppercase">Clear</button>
                                                                </div>
                                                                )}
                                                                <div className="grid gap-2">                                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Target Section</label>
                                                            <div className="grid grid-cols-4 gap-3">
                                                                {['A','B','C','D'].map(sec => (
                                                                    <button 
                                                                        key={sec}
                                                                        onClick={() => setMoveStudentData({...moveStudentData, toSection: sec})}
                                                                        className={cn(
                                                                            "py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border",
                                                                            moveStudentData.toSection === sec 
                                                                                ? "bg-teal-600 border-teal-500 text-white shadow-lg shadow-teal-900/40" 
                                                                                : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                                                                        )}
                                                                    >Section {sec}</button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <button 
                                                            onClick={handleMoveStudent}
                                                            className="w-full py-5 bg-white text-slate-900 rounded-[24px] text-[10px] font-black uppercase tracking-widest hover:bg-teal-50 hover:text-teal-600 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                                                            disabled={!moveStudentData.studentId || !moveStudentData.toSection}
                                                        >Initiate Relocation Protocol</button>
                                                    </div>
                                                </div>
                                                <div className="absolute top-0 right-0 h-40 w-40 bg-teal-500/5 rounded-bl-full transform group-hover:scale-110 transition-transform" />
                                            </div>

                                            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[40px] p-10 flex flex-col justify-center text-center relative group overflow-hidden">
                                                <div className="relative z-10">
                                                    <div className="h-16 w-16 rounded-3xl bg-white dark:bg-slate-800 mx-auto flex items-center justify-center text-slate-300 dark:text-slate-600 mb-6 border border-slate-100 dark:border-slate-700/50">
                                                        <span className="material-icons-outlined text-3xl">info</span>
                                                    </div>
                                                    <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">{t("Management Protocol")}</h4>
                                                    <p className="text-xs font-medium text-slate-400 max-w-xs mx-auto leading-relaxed">{t("Changes to section capacity or lock status will take effect immediately for all new student registrations.")}</p>
                                                </div>
                                                <div className="absolute -bottom-10 -right-10 h-40 w-40 bg-slate-900/5 rounded-full transform group-hover:scale-110 transition-transform" />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Major Classes Table */}
                                        <div className="bg-white dark:bg-slate-950/50 rounded-[40px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                                                        <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Major Class</th>
                                                        <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Max Capacity</th>
                                                        <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Enrolled</th>
                                                        <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Remaining</th>
                                                        <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                                        <th className="px-10 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {(majorClassesByYear[selectedYear] || []).map((mc, idx) => {
                                                        const isEditing = editingSection.id === mc.id;
                                                        const remaining = (mc.maxCapacity || 0) - (mc.currentEnrolled || 0);
                                                        
                                                        return (
                                                            <tr key={idx} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/30 transition-colors group">
                                                                <td className="px-10 py-8">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20">{mc.majorCode || 'M'}</div>
                                                                        <div>
                                                                            <p className="text-sm font-black text-slate-900 dark:text-white">{mc.label || mc.name}</p>
                                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Major Specialization</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-10 py-8">
                                                                    {isEditing ? (
                                                                        <input 
                                                                            type="number" 
                                                                            className="w-24 px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-teal-500/30 rounded-xl text-sm font-black outline-none focus:ring-4 focus:ring-teal-500/5 transition-all"
                                                                            value={editingSection.maxCapacity}
                                                                            onChange={(e) => setEditingSection({...editingSection, maxCapacity: parseInt(e.target.value)})}
                                                                        />
                                                                    ) : (
                                                                        <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{mc.maxCapacity}</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-10 py-8 text-center">
                                                                    <span className="text-sm font-bold text-slate-500 tabular-nums">{mc.currentEnrolled || 0}</span>
                                                                </td>
                                                                <td className="px-10 py-8 text-center">
                                                                    <span className={cn(
                                                                        "text-sm font-black tabular-nums",
                                                                        remaining <= 5 ? "text-rose-500" : "text-emerald-500"
                                                                    )}>{remaining}</span>
                                                                </td>
                                                                <td className="px-10 py-8 text-center">
                                                                    {isEditing ? (
                                                                        <label className="relative inline-flex items-center cursor-pointer group/toggle">
                                                                            <input 
                                                                                type="checkbox" 
                                                                                className="sr-only peer" 
                                                                                checked={editingSection.isLocked}
                                                                                onChange={(e) => setEditingSection({...editingSection, isLocked: e.target.checked})}
                                                                            />
                                                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600 rounded-full" />
                                                                            <span className="ml-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{editingSection.isLocked ? 'Locked' : 'Open'}</span>
                                                                        </label>
                                                                    ) : (
                                                                        <span className={cn(
                                                                            "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                                                                            mc.isLocked 
                                                                                ? "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:border-rose-900/50" 
                                                                                : "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900/50"
                                                                        )}>
                                                                            {mc.isLocked ? 'Locked' : 'Active'}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-10 py-8 text-right">
                                                                    {isEditing ? (
                                                                        <div className="flex justify-end gap-2">
                                                                            <button 
                                                                                onClick={() => setEditingSection({})}
                                                                                className="h-10 px-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                                                                            >Cancel</button>
                                                                            <button 
                                                                                onClick={() => handleUpdateMajorClass(editingSection)}
                                                                                className="h-10 px-6 bg-teal-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-teal-500/20 hover:bg-teal-700 transition-all"
                                                                            >Save</button>
                                                                        </div>
                                                                    ) : (
                                                                        <button 
                                                                            onClick={() => setEditingSection({...mc})}
                                                                            className="h-10 w-10 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-teal-600 rounded-xl flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                                                                        >
                                                                            <span className="material-icons-outlined text-sm">edit</span>
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {(majorClassesByYear[selectedYear] || []).length === 0 && (
                                                        <tr>
                                                            <td colSpan={6} className="p-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs border-dashed border-2 border-slate-50 rounded-[40px] m-4">No major classes configured for this level</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </main>
      </div>

      {/* REJECTION MODAL */}
      {rejectDialog.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={closeRejectDialog} />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
                <div className="p-10">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-12 w-12 rounded-2xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 border border-rose-100 dark:border-rose-800/50">
                            <span className="material-icons-outlined text-2xl">cancel</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">Reject Registration</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{rejectDialog.student?.namemm}</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex flex-col gap-2">
                            <label htmlFor="reject-reason" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Rejection Protocol Reason</label>
                            <textarea
                                id="reject-reason"
                                className="w-full p-6 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-3xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500/30 transition-all placeholder:text-slate-300 min-h-[160px] resize-none"
                                value={rejectDialog.reason}
                                onChange={(e) => setRejectDialog((prev) => ({ ...prev, reason: e.target.value }))}
                                placeholder="State the reason for declining this registration. This will be visible to the student..."
                            />
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button 
                                onClick={closeRejectDialog}
                                disabled={loading}
                                className="flex-1 h-14 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleRejectStudent}
                                disabled={loading || !rejectDialog.reason.trim()}
                                className="flex-[2] h-14 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
                            >
                                {loading ? 'Processing...' : 'Confirm Rejection'}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="absolute top-0 right-0 h-32 w-32 bg-rose-500/5 rounded-bl-full transform translate-x-4 -translate-y-4" />
            </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
