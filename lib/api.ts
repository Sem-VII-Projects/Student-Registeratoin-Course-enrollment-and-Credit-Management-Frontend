/// <reference types="vite/client" />

import {
  DropRecommendationResponse,
  EnrollmentAssistanceRequest,
  EnrollmentAssistanceResponse,
  EnrollmentSetting,
  EnrollmentSettingStatusPayload,
  EnrollmentSettingUpsertPayload,
  StudentEnrollmentSettingCurrent,
} from '../types';
import {
  StudentChatRequest,
  StudentChatResponse,
  StudentChatHistoryItem
} from "../types/studentChat";

import { AdminChatRequest, AdminChatResponse } from '../types/adminChat';
import type { CurrentCoursesResponse } from "../types";
import { API_BASE_URL, SPRING_API_BASE_URL } from "./apiBase";

// Use relative path so requests go through Vite proxy (same-origin = cookies work)

type RequestOptions = {
  method?: string;
  body?: any;
  backend?: "fastapi" | "spring";
};

type BlobResponse = {
  blob: Blob;
  filename: string | null;
};

export class HttpStatusError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function normalizeStudent(student: any) {
  if (!student || typeof student !== "object") return student;

  const latestTermEnrollmentRaw = student.latestTermEnrollment || student.latest_term_enrollment;
  const latestTermEnrollment =
    latestTermEnrollmentRaw && typeof latestTermEnrollmentRaw === "object"
      ? {
          ...latestTermEnrollmentRaw,
          academicYear:
            latestTermEnrollmentRaw.academicYear ||
            latestTermEnrollmentRaw.academic_year ||
            "",
          semester:
            latestTermEnrollmentRaw.semester ?? latestTermEnrollmentRaw.termSemester ?? null,
          termStatus:
            latestTermEnrollmentRaw.termStatus ||
            latestTermEnrollmentRaw.term_status ||
            "",
          section: latestTermEnrollmentRaw.section || "",
          majorClassId:
            latestTermEnrollmentRaw.majorClassId ||
            latestTermEnrollmentRaw.major_class_id ||
            null,
          majorClassLabel:
            latestTermEnrollmentRaw.majorClassLabel ||
            latestTermEnrollmentRaw.major_class_label ||
            "",
          updatedAt:
            latestTermEnrollmentRaw.updatedAt ||
            latestTermEnrollmentRaw.updated_at ||
            null,
        }
      : null;

  return {
    ...student,
    id: student.id || student.studentid,
    studentid: student.studentid || student.id,
    registrationId:
      student.registrationId || student.registrationid || student.registration_id || null,
    namemm: student.namemm || student.nameMm || student.name_mm || student.fullName || "",
    nameen: student.nameen || student.nameEn || student.name_en || "",
    father_name: student.father_name || student.fatherName || "",
    mother_name: student.mother_name || student.motherName || "",
    gender: student.gender || "",
    birthplace: student.birthplace || student.place_of_birth || student.placeOfBirth || "",
    date_of_birth: student.date_of_birth || student.dateOfBirth || "",
    nrc_number: student.nrc_number || student.nrcNumber || "",
    exam_roll_no:
      student.exam_roll_no ||
      student.examRollNo ||
      student.entrance_roll_no ||
      student.entranceRollNo ||
      "",
    student_name:
      student.student_name || student.studentName || student.full_name || student.fullName || "",
    phone: student.phone || student.phone_number || student.phoneNumber || "",
    user_name: student.user_name || student.username || "",
    currentyear: student.currentyear ?? student.currentYear ?? null,
    academic_semester:
      student.academic_semester || student.academicSemester || student.semester || "",
    major: student.major || student.major_code || student.specialization || "",
    academicyearentered: student.academicyearentered || student.academicYearEntered || "",
    matriculation_rollno:
      student.matriculation_rollno ||
      student.matriculation_roll_no ||
      student.matriculationRollNo ||
      "",
    matriculation_passed_year:
      student.matriculation_passed_year || student.matriculationPassedYear || "",
    totalmarks_obtained:
      student.totalmarks_obtained ??
      student.total_marks_obtained ??
      student.totalMarksObtained ??
      student.total_marks ??
      student.totalMarks ??
      null,
    division_or_state: student.division_or_state || student.divisionOrState || "",
    township: student.township || "",
    address: student.address || "",
    assigned_class: student.assigned_class || student.assignedClass || "",
    status: student.status || student.globalStatus || student.global_status || "",
    globalStatus: student.globalStatus || student.global_status || student.status || "",
    payment_status: student.payment_status || student.paymentStatus || "",
    payment_academic_year:
      student.payment_academic_year || student.paymentAcademicYear || "",
    paymentStatus: student.paymentStatus || student.payment_status || "",
    paymentAcademicYear:
      student.paymentAcademicYear || student.payment_academic_year || "",
    passportphoto: student.passportphoto || student.passportPhoto || student.passport_photo || "",
    nrcfrontimage:
      student.nrcfrontimage || student.nrcFrontImage || student.nrc_front_image || "",
    nrcbackimage:
      student.nrcbackimage || student.nrcBackImage || student.nrc_back_image || "",
    father_id: student.father_id || student.fatherId || null,
    mother_id: student.mother_id || student.motherId || null,
    rejection_reason: student.rejection_reason || student.rejectionReason || "",
    is_benefit_student: student.is_benefit_student ?? student.isBenefitStudent ?? false,
    is_hostel_student: student.is_hostel_student ?? student.isHostelStudent ?? false,
    is_on_break: student.is_on_break ?? student.isOnBreak ?? false,
    latestTermEnrollment,
    latest_term_enrollment: latestTermEnrollment,
  };
}

function normalizeAdmin(admin: any) {
  if (!admin) return admin;
  return {
    ...admin,
    adminname: admin.adminname || admin.adminName || admin.fullName || "",
  };
}

function normalizeParent(parent: any) {
  if (!parent) return parent;
  return {
    ...parent,
    id: parent.id || parent.parentid,
    parentid: parent.parentid || parent.id,
    studentid: parent.studentid || parent.studentId || parent.student_id,
    full_name: parent.full_name || parent.fullName || "",
    relation: parent.relation || "",
    job_position: parent.job_position || parent.jobPosition || "",
    education: parent.education || "",
    address: parent.address || "",
    phone_number: parent.phone_number || parent.phone || parent.phoneNumber || "",
    ethnic: parent.ethnic || "",
    religion: parent.religion || "",
    birthplace: parent.birthplace || "",
    nrc_number: parent.nrc_number || parent.nrcNumber || "",
    nrc_front_image: parent.nrc_front_image || parent.nrcFrontImage || "",
    nrc_back_image: parent.nrc_back_image || parent.nrcBackImage || "",
  };
}

// ---- Global auth-failure handling (401/403) ----
function clearAuthSession() {
  sessionStorage.removeItem("user");
  sessionStorage.removeItem("role");
  sessionStorage.removeItem("must_reset_password");
  sessionStorage.removeItem("adminAuthToken");
  localStorage.removeItem("access_token");
  localStorage.removeItem("authToken");
  localStorage.removeItem("adminAuthToken");
  localStorage.removeItem("studentData");
  localStorage.removeItem("adminData");
}

function redirectToLogin() {
  if (typeof window === "undefined") return;

  const hash = window.location.hash || "";
  const onPublicPage =
    hash === "#/login" ||
    hash === "#/admin-login" ||
    hash.startsWith("#/login?") ||
    hash.startsWith("#/admin-login?") ||
    hash === "#/forgot-password" ||
    hash.startsWith("#/forgot-password?") ||
    hash === "#/reset-password-token" ||
    hash.startsWith("#/reset-password-token?");

  if (!onPublicPage) {
    // If we were on an admin path, redirect to admin login
    if (hash.startsWith("#/admin")) {
      window.location.hash = "#/admin-login";
    } else {
      window.location.hash = "#/login";
    }
  }
}

function shouldAutoLogout(path: string) {
  if (path === "/api/v1/auth/login") return false;
  if (path === "/api/auth/admin/login") return false;
  if (path === "/api/v1/auth/me") return false;
  if (path === "/api/v1/auth/forgot-password") return false;
  if (path === "/api/v1/auth/reset-password-with-token") return false;
  
  // Spring Boot endpoints (handled by components)
  if (path.startsWith("/api/students")) return false;
  if (path.startsWith("/api/admin")) return false;
  if (path.startsWith("/v1/admin")) return false;
  if (path.startsWith("/api/registrations")) return false;

  if (path.includes("/api/v1/admin/messages/") && path.endsWith("/read")) return false;
  // Allow enrollment errors to be handled by UI instead of auto-redirecting to login
  if (path.includes("/courses/enrollment")) return false;
  // Spring Boot public endpoints (match raw path — prefix is added inside request())
  if (path === "/api/auth/register") return false;
  if (path === "/api/registration-window") return false;
  return true;
}
// -----------------------------------------------

async function request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const backend = options.backend ?? "fastapi";
  const base = backend === "spring" ? SPRING_API_BASE_URL : API_BASE_URL;

  // Use base only if provided, otherwise use relative path (for Vite proxy)
  const fetchUrl = base ? `${base}${path}` : path;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Token resolution logic inspired by Temp/client.js
  const isAdminUiRoute = typeof window !== 'undefined' && (window.location.pathname.startsWith('/admin') || window.location.hash.startsWith('#/admin'));
  const hasAdminSession = Boolean(localStorage.getItem('adminData'));
  
  // For Spring backend, only /api/admin/ or /v1/admin/ are strictly "prefer admin token"
  const isSpringAdminApi = backend === "spring" && (path.startsWith("/api/admin/") || path.startsWith("/v1/admin/"));
  const preferAdminToken = hasAdminSession && (isAdminUiRoute || isSpringAdminApi);

  let token: string | null = null;
  if (preferAdminToken) {
    token = sessionStorage.getItem("adminAuthToken") || 
            localStorage.getItem("adminAuthToken") || 
            localStorage.getItem("access_token");
  }
  
  if (!token) {
    token = localStorage.getItem("access_token") || 
            localStorage.getItem("authToken") || 
            sessionStorage.getItem("adminAuthToken") || 
            localStorage.getItem("adminAuthToken");
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(fetchUrl, {
    method: options.method ?? "GET",
    headers,
    credentials: "include",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let data: any;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if ((res.status === 401 || res.status === 403) && shouldAutoLogout(path)) {
    // If we are checking the session during boot or on a public page, don't force logout
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const isPublic = hash === "" || hash === "#/" || hash === "#/login" || hash === "#/admin-login";
    
    if (path !== "/api/v1/auth/me" && !isPublic) {
      clearAuthSession();
      redirectToLogin();
    }
    const msg = (data as any)?.detail || (data as any)?.message || `Not authorized (${res.status})`;
    throw new HttpStatusError(res.status, msg);
  }

  // If it's a 401/403 but shouldAutoLogout is FALSE (e.g. Spring Boot admin endpoints), 
  // we just throw the error and let the component handle it without clearing storage.
  if (res.status === 401 || res.status === 403) {
    const msg = (data as any)?.detail || (data as any)?.message || `Not authorized (${res.status})`;
    throw new HttpStatusError(res.status, msg);
  }

  if (!res.ok) {
    const msg = (data as any)?.detail || (data as any)?.message || `Request failed (${res.status})`;
    throw new HttpStatusError(res.status, msg);
  }

  return data;
}

async function requestBlob(path: string, options: RequestOptions = {}): Promise<BlobResponse> {
  const backend = options.backend ?? "fastapi";
  const base = backend === "spring" ? SPRING_API_BASE_URL : API_BASE_URL;
  const fullPath = path;

  const headers: Record<string, string> = options.body
    ? { "Content-Type": "application/json" }
    : {};

  const res = await fetch(`${base}${fullPath}`, {
    method: options.method ?? "GET",
    headers,
    credentials: "include",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if ((res.status === 401 || res.status === 403) && shouldAutoLogout(path)) {
    clearAuthSession();
    redirectToLogin();
    throw new HttpStatusError(res.status, `Not authorized (${res.status})`);
  }

  if (!res.ok) {
    throw new HttpStatusError(res.status, `Request failed (${res.status})`);
  }

  const blob = await res.blob();
  const contentDisposition = res.headers.get("content-disposition") || "";
  const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i);
  const filename = filenameMatch?.[1]?.trim()?.replace(/"/g, "") || null;

  return { blob, filename };
}

// ---------------------------
// Types (Announcements)
// ---------------------------
export type AnnouncementType = "General" | "Urgent" | "Event" | "Academic";
export type AnnouncementStatus = "draft" | "published" | "archived";

export type AdminAnnouncementCreate = {
  title: string;
  content: string;
  type?: AnnouncementType;

  // legacy label-only
  target_audience?: string;

  // legacy expiry
  expiry_date?: string | null;

  // optional new fields your backend supports
  status?: AnnouncementStatus;
  pinned?: boolean;
};

export type AdminAnnouncementUpdate = {
  title?: string;
  content?: string;
  type?: AnnouncementType;

  target_audience?: string;
  expiry_date?: string | null;

  status?: AnnouncementStatus;
  pinned?: boolean;
};

export type AdminAnnouncementBulkPayload = {
  action: "publish" | "archive" | "delete";
  ids: string[];
};

// ---------------------------
// API
// ---------------------------
export const api = {
  // Public student registration
  getRegistrationWindowSettings: () => request("/api/registration-window", { backend: "spring" }),
  updateRegistrationWindowSettings: (body: any) => request("/api/admin/registration-window", { method: "PUT", body, backend: "spring" }),

  // Spring Boot specific methods from client.js
  adminListRegistrations: async (status?: string, backend: "fastapi" | "spring" = "fastapi") => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    // For FastAPI, the path might be different, but we'll try to maintain compatibility
    const path = backend === "spring" ? `/v1/admin/registrations${query}` : `/api/v1/admin/registrations/${query}`;
    const items = await request<any>(path, { backend });
    if (Array.isArray(items)) return items;
    if (Array.isArray(items?.registrations)) return items.registrations;
    if (Array.isArray(items?.data)) return items.data;
    if (Array.isArray(items?.content)) return items.content;
    if (Array.isArray(items?.results)) return items.results;
    if (Array.isArray(items?._embedded?.registrations)) return items._embedded.registrations;
    if (Array.isArray(items?._embedded?.registrationList)) return items._embedded.registrationList;
    return [];
  },
  adminApproveRegistration: (registrationId: string) => 
    request(`/v1/admin/registrations/${encodeURIComponent(registrationId)}/approve`, { method: "PATCH", backend: "spring" }),
  adminRejectRegistration: (registrationId: string, reason: string) => {
    const query = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    return request(`/v1/admin/registrations/${encodeURIComponent(registrationId)}/reject${query}`, { method: "PATCH", backend: "spring" });
  },
  clearRegistrationSections: (registrationId: string) =>
    request(`/v1/registration/${encodeURIComponent(registrationId)}/sections`, { method: "DELETE", backend: "spring" }),
  deleteStudentDocuments: (studentId: string, docType?: string) => {
    const query = docType
      ? `?studentId=${encodeURIComponent(studentId)}&docType=${encodeURIComponent(docType)}`
      : `?studentId=${encodeURIComponent(studentId)}`;
    return request(`/v1/student/documents${query}`, { method: "DELETE", backend: "spring" });
  },
  createParent: (body: any) => request('/api/parents', { method: 'POST', body, backend: "spring" }),
  listParents: (studentId: string) => {
    const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
    return request<any[]>(`/api/parents${query}`, { backend: "spring" }).then((items: any) => {
      const list = Array.isArray(items)
        ? items
        : Array.isArray(items?.parents)
          ? items.parents
          : Array.isArray(items?.data)
            ? items.data
            : Array.isArray(items?._embedded?.parents)
              ? items._embedded.parents
              : [];
      return list;
    });
  },
  adminUpdateMajorClass: (payload: any) => request('/api/admin/major-classes', { method: 'PUT', body: payload, backend: "spring" }),
  adminListMajorClasses: async (params: any = {}) => {
    const queryParams = new URLSearchParams();
    if (params.academicYear) queryParams.set('academicYear', String(params.academicYear));
    if (params.semester) queryParams.set('semester', String(params.semester));
    if (params.yearLevel) queryParams.set('yearLevel', String(params.yearLevel));
    if (params.includeInactive !== undefined) queryParams.set('includeInactive', String(params.includeInactive));
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const items = await request<any>(`/api/admin/major-classes${query}`, { backend: "spring" });
    if (Array.isArray(items)) return items;
    if (Array.isArray(items?.majorClasses)) return items.majorClasses;
    if (Array.isArray(items?.data)) return items.data;
    if (Array.isArray(items?.content)) return items.content;
    if (Array.isArray(items?._embedded?.majorClasses)) return items._embedded.majorClasses;
    if (Array.isArray(items?._embedded?.majorClassList)) return items._embedded.majorClassList;
    return [];
  },
  adminListClassSections: async () => {
    const items = await request<any>('/api/admin/class-sections', { backend: "spring" });
    if (Array.isArray(items)) return items;
    if (Array.isArray(items?.classSections)) return items.classSections;
    if (Array.isArray(items?.data)) return items.data;
    if (Array.isArray(items?.content)) return items.content;
    if (Array.isArray(items?._embedded?.classSections)) return items._embedded.classSections;
    if (Array.isArray(items?._embedded?.classSectionList)) return items._embedded.classSectionList;
    return [];
  },
  adminUpdateClassSection: (payload: any) => request('/api/admin/class-sections', { method: 'PUT', body: payload, backend: "spring" }),
  adminMoveStudentSection: (payload: any) => request('/api/admin/class-sections/move-student', { method: 'POST', body: payload, backend: "spring" }),
  approveStudent: (studentId: string, body: any) => request(`/api/students/${encodeURIComponent(studentId)}/approve`, { method: 'POST', body, backend: "spring" }),
  rejectStudent: (studentId: string, body: any) => request(`/api/students/${encodeURIComponent(studentId)}/reject`, { method: 'POST', body, backend: "spring" }),
  updateStudentStatus: (studentId: string, status: string) => request(`/api/students/${encodeURIComponent(studentId)}/status`, { method: 'PATCH', body: { status }, backend: "spring" }),
  getClassSections: async (paramsOrYear: any, semesterArg?: any, yearLevelArg?: any) => {
    const queryParams = new URLSearchParams();
    if (paramsOrYear && typeof paramsOrYear === 'object') {
      const { academicYear, semester, yearLevel, year } = paramsOrYear;
      if (academicYear != null) queryParams.set('academicYear', String(academicYear));
      if (semester != null) queryParams.set('semester', String(semester));
      if (yearLevel != null) queryParams.set('yearLevel', String(yearLevel));
      if (year != null) queryParams.set('year', String(year));
    } else if (semesterArg != null || yearLevelArg != null) {
      if (paramsOrYear != null) queryParams.set('academicYear', String(paramsOrYear));
      if (semesterArg != null) queryParams.set('semester', String(semesterArg));
      if (yearLevelArg != null) queryParams.set('yearLevel', String(yearLevelArg));
    } else if (paramsOrYear != null) {
      queryParams.set('year', String(paramsOrYear));
    }
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const items = await request<any>(`/api/class-sections${query}`, { backend: "spring" });
    if (Array.isArray(items)) return items;
    if (Array.isArray(items?.classSections)) return items.classSections;
    if (Array.isArray(items?.data)) return items.data;
    if (Array.isArray(items?.content)) return items.content;
    if (Array.isArray(items?._embedded?.classSections)) return items._embedded.classSections;
    if (Array.isArray(items?._embedded?.classSectionList)) return items._embedded.classSectionList;
    return [];
  },

  // Legacy Spring auth endpoints kept for compatibility with src/pages login flows.
  getStudents: async (email?: string, backend: "fastapi" | "spring" = "fastapi") => {
    const query = email ? `?email=${encodeURIComponent(email)}` : '';
    const items = await request<any>(`/api/students${query}`, { backend });
    
    let list: any[] = [];
    if (Array.isArray(items)) {
      list = items;
    } else if (items && typeof items === 'object') {
      const keys = ['students', 'studentList', 'student', 'content', 'data', 'results', 'student_list', 'allStudents'];
      const foundKey = keys.find(k => Array.isArray(items[k]));
      if (foundKey) {
        list = items[foundKey];
      } else if (items._embedded && typeof items._embedded === 'object') {
        const firstKey = Object.keys(items._embedded).find(k => Array.isArray(items._embedded[k]));
        if (firstKey) list = items._embedded[firstKey];
      } else {
        // Find ANY key that looks like a student list or contains an array
        const likelyKey = Object.keys(items).find(k => k.toLowerCase().includes('student') && Array.isArray(items[k]));
        if (likelyKey) {
          list = items[likelyKey];
        } else {
          const anyArrayKey = Object.keys(items).find(k => Array.isArray(items[k]));
          if (anyArrayKey) list = items[anyArrayKey];
        }
      }
    }
    
    return (list || []).map(normalizeStudent);
  },
  getCurrentTerm: (backend: "fastapi" | "spring" = "fastapi") => 
    request('/api/terms/current', { backend }),
  getAdminTermConfig: () => request('/api/admin/terms/config', { backend: "spring" }),
  updateAdminTermConfig: (body: any) => request('/api/admin/terms/config', { method: 'PATCH', body, backend: "spring" }),
  getRolloverReport: (params: any = {}) => {
    const queryParams = new URLSearchParams();
    if (params.academicYear) queryParams.set('academicYear', String(params.academicYear));
    if (params.semester) queryParams.set('semester', String(params.semester));
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return request(`/api/admin/rollover/report${query}`, { backend: "spring" });
  },
  adminPrepareRollover: (body: any) => request('/api/admin/rollover/prepare', { method: 'POST', body, backend: "spring" }),
  adminSetTermResult: (enrollmentId: string | number, result: string) => 
    request(`/api/admin/term-enrollments/${enrollmentId}/set-result`, { method: 'PATCH', body: { result }, backend: "spring" }),
  adminSetTermReexamResult: (enrollmentId: string | number, result: string) => 
    request(`/api/admin/term-enrollments/${enrollmentId}/set-reexam-result`, { method: 'PATCH', body: { result }, backend: "spring" }),
  adminBulkSetTermResult: (enrollmentIds: (string | number)[], result: string) => 
    request('/api/admin/term-enrollments/bulk-set-result', { method: 'POST', body: { enrollmentIds, result }, backend: "spring" }),
  adminBulkSetTermReexamResult: (enrollmentIds: (string | number)[], result: string) => 
    request('/api/admin/term-enrollments/bulk-set-reexam-result', { method: 'POST', body: { enrollmentIds, result }, backend: "spring" }),
  adminListTermEnrollments: async (params: any = {}, backend: "fastapi" | "spring" = "fastapi") => {
    const queryParams = new URLSearchParams();
    const { academicYear, semester, yearLevel, section, status } = params || {};
    if (academicYear != null && String(academicYear).trim() !== '') {
      queryParams.set('academicYear', String(academicYear));
    }
    if (semester != null && String(semester).trim() !== '') {
      queryParams.set('semester', String(semester));
    }
    if (yearLevel != null && String(yearLevel).trim() !== '') {
      queryParams.set('yearLevel', String(yearLevel));
    }
    if (section != null && String(section).trim() !== '') {
      queryParams.set('section', String(section));
    }
    if (status != null && String(status).trim() !== '') {
      queryParams.set('status', String(status));
    }
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const items = await request<any>(`/api/admin/term-enrollments${query}`, { backend });
    
    let list: any[] = [];
    if (Array.isArray(items)) {
      list = items;
    } else if (items && typeof items === 'object') {
      const keys = ['enrollments', 'termEnrollments', 'termEnrollmentList', 'data', 'content'];
      const foundKey = keys.find(k => Array.isArray(items[k]));
      if (foundKey) {
        list = items[foundKey];
      } else if (items._embedded && typeof items._embedded === 'object') {
        const firstKey = Object.keys(items._embedded).find(k => Array.isArray(items._embedded[k]));
        if (firstKey) list = items._embedded[firstKey];
      } else {
        const anyArrayKey = Object.keys(items).find(k => Array.isArray(items[k]));
        if (anyArrayKey) list = items[anyArrayKey];
      }
    }
    return list;
  },
  listRegistrations: async (studentId?: string) => {
    const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
    const items = await request<any>(`/api/registrations${query}`, { backend: "spring" });
    if (Array.isArray(items)) return items;
    if (Array.isArray(items?.registrations)) return items.registrations;
    if (Array.isArray(items?.data)) return items.data;
    if (Array.isArray(items?.content)) return items.content;
    if (Array.isArray(items?.results)) return items.results;
    if (Array.isArray(items?._embedded?.registrations)) return items._embedded.registrations;
    if (Array.isArray(items?._embedded?.registrationList)) return items._embedded.registrationList;
    return [];
  },

  loginAdmin: (body: any) => request('/api/auth/admin/login', { method: 'POST', body, backend: "spring" }).then((data) => {
    if (data?.admin) {
      return { ...data, admin: normalizeAdmin(data.admin) };
    }
    return normalizeAdmin(data);
  }),
  login: (payload: { username: string; password: string; role: "admin" | "student" }) =>
    request("/api/v1/auth/login", { method: "POST", body: payload }),

  me: () => request("/api/v1/auth/me"),

  logout: () => request("/api/v1/auth/logout", { method: "POST" }),

  resetPassword: (payload: { old_password: string; new_password: string }) =>
    request("/api/v1/auth/reset-password", { method: "POST", body: payload }),

  forgotPassword: (payload: { email: string }) =>
    request("/api/v1/auth/forgot-password", { method: "POST", body: payload }),

  resetPasswordWithToken: (payload: { token: string; new_password: string }) =>
    request("/api/v1/auth/reset-password-with-token", { method: "POST", body: payload }),

  adminStatistics: (backend: "fastapi" | "spring" = "fastapi") => request("/api/v1/admin/statistics", { backend }),
  adminMajorDistribution: (backend: "fastapi" | "spring" = "fastapi") => request("/api/v1/admin/major-distribution", { backend }),
  adminPendingActions: (backend: "fastapi" | "spring" = "fastapi") => request("/api/v1/admin/pending-actions", { backend }),

  // --- Admin Courses ---
  adminCourses: () => request("/api/v1/admin/courses"),
  adminCourseByCode: (course_code: string) =>
  request(`/api/v1/admin/courses/${encodeURIComponent(course_code)}`),
  adminCreateCourse: (payload: any) => request("/api/v1/admin/courses", { method: "POST", body: payload }),
  adminUpdateCourse: (courseCode: string, payload: any) =>
    request(`/api/v1/admin/courses/${encodeURIComponent(courseCode)}`, { method: "PUT", body: payload }),

  // --- Admin Announcements ---
  adminAnnouncements: () => request("/api/v1/admin/announcements"),

  adminCreateAnnouncement: (payload: AdminAnnouncementCreate) =>
    request("/api/v1/admin/announcements", { method: "POST", body: payload }),

  adminDeleteAnnouncement: (announcementId: string) =>
    request(`/api/v1/admin/announcements/${encodeURIComponent(announcementId)}`, { method: "DELETE" }),

  adminUpdateAnnouncement: (announcementId: string, payload: AdminAnnouncementUpdate) =>
    request(`/api/v1/admin/announcements/${encodeURIComponent(announcementId)}`, {
      method: "PUT",
      body: payload,
    }),

  adminPublishAnnouncement: (announcementId: string) =>
    request(`/api/v1/admin/announcements/${encodeURIComponent(announcementId)}/publish`, { method: "POST" }),

  adminArchiveAnnouncement: (announcementId: string) =>
    request(`/api/v1/admin/announcements/${encodeURIComponent(announcementId)}/archive`, { method: "POST" }),

  adminPinAnnouncement: (announcementId: string) =>
    request(`/api/v1/admin/announcements/${encodeURIComponent(announcementId)}/pin`, { method: "POST" }),

  adminUnpinAnnouncement: (announcementId: string) =>
    request(`/api/v1/admin/announcements/${encodeURIComponent(announcementId)}/unpin`, { method: "POST" }),

  adminDuplicateAnnouncement: (announcementId: string) =>
    request(`/api/v1/admin/announcements/${encodeURIComponent(announcementId)}/duplicate`, { method: "POST" }),

  adminBulkAnnouncements: (payload: AdminAnnouncementBulkPayload) =>
    request("/api/v1/admin/announcements/bulk", { method: "POST", body: payload }),

  // --- Admin Enrollments ---
  adminEnrollments: () => request("/api/v1/admin/enrollments/"),
  adminUpdateEnrollmentStatus: (enrollmentId: string, payload: { status: string; reason: string }) =>
    request<{ message: string; success: boolean }>(`/api/v1/admin/enrollments/${encodeURIComponent(enrollmentId)}/status`, {
        method: "PUT",
        body: payload
  }),
  
  adminCreateEnrollment: (payload: { student_id: string; course_id: string }) => 
    request("/api/v1/admin/enrollments/", {
        method: "POST",
        body: payload
  }),

  adminAdvanceSemester: () =>
    request<{ detail: string }>("/api/v1/admin/semester/advance", {
      method: "POST",
    }),

  // --- Admin Enrollment Settings (singleton) ---
  adminEnrollmentSettingCurrent: () =>
    request<EnrollmentSetting>("/api/v1/admin/enrollment-settings"),

  adminReplaceEnrollmentSetting: (payload: EnrollmentSettingUpsertPayload) =>
    request<EnrollmentSetting>("/api/v1/admin/enrollment-settings", {
      method: "POST",
      body: payload,
    }),

  adminUpsertEnrollmentSetting: (payload: EnrollmentSettingUpsertPayload) =>
    request<EnrollmentSetting>("/api/v1/admin/enrollment-settings", {
      method: "PUT",
      body: payload,
    }),

  adminSetEnrollmentSettingStatus: (payload: EnrollmentSettingStatusPayload) =>
    request<EnrollmentSetting>("/api/v1/admin/enrollment-settings/status", {
      method: "PATCH",
      body: payload,
    }),

  // --- Admin Messages ---
  adminMessages: () => request("/api/v1/admin/messages"),
  adminStudents: async () => {
    const items = await request<any>("/api/v1/admin/students/");
    if (Array.isArray(items)) return items;
    if (Array.isArray(items?.students)) return items.students;
    if (Array.isArray(items?.data)) return items.data;
    if (Array.isArray(items?.content)) return items.content;
    return [];
  },
  adminStudentIds: () => request("/api/v1/admin/students/ids"),
  adminStudentOptions: () => request("/api/v1/admin/students/options"),

  // SubmittedDetailsReview requirements
  getStudentById: (studentId: string) => request(`/api/students/${encodeURIComponent(studentId)}`, { backend: "spring" }),
  getRegistrationSections: (registrationId: string) => request(`/v1/registration/${encodeURIComponent(registrationId)}/sections`, { backend: "spring" }),
  getLatestStudentDocument: (studentId: string, docType: string) => request(`/v1/student/documents?studentId=${encodeURIComponent(studentId)}&docType=${encodeURIComponent(docType)}`, { backend: "spring" }),







  adminCreateMessage: (payload: {
    receiver_id: string;
    subject: string;
    body: string;
    category?: string;
    attachments?: string[];
  }) => request("/api/v1/admin/messages", { method: "POST", body: payload }),

  adminMarkMessageRead: (messageId: string, is_read: boolean) =>
    request(`/api/v1/admin/messages/${encodeURIComponent(messageId)}/read`, {
      method: "PUT",
      body: { is_read },
    }),

  adminDeleteMessage: (messageId: string) =>
    request(`/api/v1/admin/messages/${encodeURIComponent(messageId)}`, { method: "DELETE" }),

  // --- Student Messages ---
  studentMessages: async () => {
    const items = await request<any[]>("/api/v1/student/messages");
    if (Array.isArray(items)) return items;
    if (Array.isArray((items as any)?.messages)) return (items as any).messages;
    if (Array.isArray((items as any)?.data)) return (items as any).data;
    return [];
  },

  studentMarkMessageRead: (messageId: string, is_read: boolean) =>
    request(`/api/v1/student/messages/${encodeURIComponent(messageId)}/read`, {
      method: "PUT",
      body: { is_read },
    }),

  studentAvailableCourses: (query?: string, sort?: string) => {
    const params = new URLSearchParams();
    if (query) params.append("search", query);
    if (sort) params.append("sort", sort);
    return request<{ data: any[]; meta: any }>(`/api/v1/student/courses?${params.toString()}`);
  },

  studentEnrollmentSettingCurrent: () =>
    request<StudentEnrollmentSettingCurrent>("/api/v1/student/enrollment/settings/current"),

  enrollStudent: (payload: { selected_code: string }) => 
    request<{ success: boolean; message: string; credit_usage: any }>("/api/v1/student/courses/enrollment", {
      method: "POST",
      body: payload
    }),

  studentEnrollmentAssistance: (payload: EnrollmentAssistanceRequest) =>
    request<EnrollmentAssistanceResponse>("/api/v1/student/courses/enrollment-assistance", {
      method: "POST",
      body: payload,
    }),
  studentDropRecommendation: () =>
    request<DropRecommendationResponse>("/api/v1/student/courses/drop-recommendation"),

  studentProgressGet: () => request("/api/v1/student/progress"),
  studentProgressSaveAcademicYear: (payload: { academic_year: string }) =>
    request("/api/v1/student/progress/academic-year", { method: "POST", body: payload }),
  studentProgressSaveCurrent: (payload: { current_year: string; current_semester: string }) =>
    request("/api/v1/student/progress/current", { method: "POST", body: payload }),

  studentMajorState: () => request("/api/v1/student/major/state"),
  studentMajorOptions: () => request("/api/v1/student/major/options"),
  studentMajorEligibility: () => request("/api/v1/student/major/eligibility"),
  studentSelectTrack: (payload: { track: "CS" | "CT" }) =>
    request("/api/v1/student/major/track", { method: "POST", body: payload }),
  studentSelectMajor: (payload: { major: string }) =>
    request("/api/v1/student/major/select", { method: "POST", body: payload }),

  // --- Special Major Access (standalone flow) ---
  specialMajorEligibility: () => request("/api/v1/student/special-major/eligibility"),
  specialMajorOptions: () => request("/api/v1/student/special-major/options"),
  specialMajorSelectTrack: async (payload: { track: "CS" | "CT" }) => {
    try {
      return await request("/api/v1/student/special-major/track", { method: "POST", body: payload });
    } catch {
      try {
        return await request("/api/v1/student/special-major/track", {
          method: "POST",
          body: { selected_track: payload.track },
        });
      } catch {
        return request("/api/v1/student/special-major/track", {
          method: "POST",
          body: { track_code: payload.track },
        });
      }
    }
  },
  specialMajorSelect: (payload: { major: string }) =>
    request("/api/v1/student/special-major/select", { method: "POST", body: payload }),
  specialMajorPopulateFromProfile: () =>
    request("/api/v1/student/special-major/populate-from-profile", { method: "POST" }),

  currentStudentCourses: () => request<CurrentCoursesResponse>("/api/v1/student/courses/current"),
  studentCurrentCoursesPdf: () =>
    requestBlob("/api/v1/student/courses/current/pdf", { method: "GET" }),

  studentCourseDetails: (code: string) =>
    request<any>(`/api/v1/student/courses/detail/${encodeURIComponent(code)}`),

  // --- Student Alerts ---
  studentAlerts: async () => {
    const items = await request<any[]>("/api/v1/student/alerts/");
    if (Array.isArray(items)) return items;
    if (Array.isArray((items as any)?.alerts)) return (items as any).alerts;
    if (Array.isArray((items as any)?.data)) return (items as any).data;
    return [];
  },
  studentDeleteAlert: (alertId: string) => request(`/api/v1/student/alerts/${encodeURIComponent(alertId)}`, { method: "DELETE" }),

  // --- Student Announcements ---
  studentAnnouncements: async () => {
    try {
      const items = await request<any[]>("/api/v1/student/announcements");
      if (Array.isArray(items)) return items;
      if (Array.isArray((items as any)?.announcements)) return (items as any).announcements;
      if (Array.isArray((items as any)?.data)) return (items as any).data;
      return [];
    } catch {
      try {
        const items = await request<any[]>("/api/v1/student/announcements/");
        if (Array.isArray(items)) return items;
        if (Array.isArray((items as any)?.announcements)) return (items as any).announcements;
        if (Array.isArray((items as any)?.data)) return (items as any).data;
        return [];
      } catch {
        return [];
      }
    }
  },
  studentAnnouncementsUnreadCount: async () => {
    try {
      return await request<{ count: number; total: number }>("/api/v1/student/announcements/unread-count");
    } catch {
      try {
        return await request<{ count: number; total: number }>("/api/v1/student/announcements/unread-count/");
      } catch {
        return { count: 0, total: 0 };
      }
    }
  },
  studentAnnouncementsMarkAllRead: async () => {
    try {
      return await request("/api/v1/student/announcements/mark-read", { method: "POST", body: { all: true } });
    } catch {
      try {
        return await request("/api/v1/student/announcements/mark-read/", { method: "POST", body: { all: true } });
      } catch {
        return { success: false };
      }
    }
  },

  dropCourse: (code: string) =>
    request<{ success: boolean }>(`/api/v1/student/courses/${encodeURIComponent(code)}`, {
      method: "DELETE",
    }),

  bulkDropCourses: (courseCodes: string[]) =>
    request<{ success: boolean }>("/api/v1/student/courses/bulk-drop", {
      method: "POST",
      body: { course_codes: courseCodes },
    }),

  studentResults: () => request("/api/v1/student/results"),

  studentResultsSummary: (user_id?: string) =>
    request(`/api/v1/student/results/summary${user_id ? `?user_id=${encodeURIComponent(user_id)}` : ""}`),
  studentResultsPdf: () =>
    request(`/api/v1/student/results/pdf`),

  studentDegreeProgress: () =>
    request("/api/v1/student/progress"),
  studentDegreeAudit: () =>
    request("/api/v1/student/degree-audit"),

  // --- Student Dashboard ---
  studentDashboardSummary: () => request("/api/v1/student/dashboard-summary"),

  studentAiChat: async (payload: StudentChatRequest): Promise<StudentChatResponse> => {
    const token = localStorage.getItem("access_token");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/ai/ai/student/chat`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      const msg = data?.detail || data?.message || `Request failed (${response.status})`;
      throw new HttpStatusError(response.status, msg);
    }

    if (!data || typeof data.answer !== "string") {
      throw new HttpStatusError(500, "Unexpected response format from AI service.");
    }

    return data as StudentChatResponse;
  },

  studentCourseChat: async (payload: {
    message: string;
    course_id: string;
    history: StudentChatHistoryItem[];
    mode: "auto";
  }): Promise<StudentChatResponse> => {
    const token = localStorage.getItem("access_token");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/ai/ai/student/course-chat`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      const msg = data?.detail || data?.message || `Request failed (${response.status})`;
      throw new HttpStatusError(response.status, msg);
    }

    return data as StudentChatResponse;
  },

  adminAiChat: async (payload: AdminChatRequest): Promise<AdminChatResponse> => {
    const token = localStorage.getItem("access_token");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/ai/ai/admin/chat`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      const msg = data?.detail || data?.message || `Request failed (${response.status})`;
      throw new HttpStatusError(response.status, msg);
    }

    if (!data || typeof data.answer !== "string") {
      throw new HttpStatusError(500, "Unexpected response format from AI service.");
    }

    return data as AdminChatResponse;
  },
};
