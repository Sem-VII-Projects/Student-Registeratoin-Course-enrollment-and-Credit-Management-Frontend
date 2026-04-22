import { supabase } from '../supabase/supabaseClient';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090';
const STUDENT_AUTH_TOKEN_KEY = 'authToken';
const ADMIN_AUTH_TOKEN_KEY = 'adminAuthToken';

function fallbackStatusMessage(status) {
  switch (status) {
    case 400:
      return 'Invalid request data. Please check and try again.';
    case 401:
      return 'Session expired or unauthorized. Please log in again.';
    case 403:
      return 'Access denied.';
    case 404:
      return 'Requested service was not found.';
    case 409:
      return 'Data conflict. Please refresh and try again.';
    case 422:
      return 'Unable to process your request.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Server is temporarily unavailable. Please try again later.';
    default:
      return `Request failed (${status}). Please try again.`;
  }
}

function extractBackendMessage(payload) {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  if (typeof payload === 'object') {
    const message = payload.message || payload.error || '';
    const details = payload.details || payload.detail || '';
    if (message && details) {
      return `${message}: ${details}`;
    }
    return message || details || '';
  }
  return '';
}

function sanitizeErrorMessage(rawMessage, status) {
  const cleaned = String(rawMessage || '')
    // Remove appended endpoint details such as [POST /api/...]
    .replace(/\s*\[(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s+[^\]]+\]\s*/gi, ' ')
    // Remove generic request-failed prefixes from backend strings
    .replace(/^request failed\s*\(\d{3}\)\s*[:-]?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || fallbackStatusMessage(status);
}

function normalizeStudent(student) {
  if (!student) return student;
  const latestTermEnrollmentRaw = student.latestTermEnrollment || student.latest_term_enrollment;
  const latestTermEnrollment =
    latestTermEnrollmentRaw && typeof latestTermEnrollmentRaw === 'object'
      ? {
          ...latestTermEnrollmentRaw,
          academicYear:
            latestTermEnrollmentRaw.academicYear
            || latestTermEnrollmentRaw.academic_year
            || '',
          semester:
            latestTermEnrollmentRaw.semester ?? latestTermEnrollmentRaw.termSemester ?? null,
          termStatus:
            latestTermEnrollmentRaw.termStatus
            || latestTermEnrollmentRaw.term_status
            || '',
          section: latestTermEnrollmentRaw.section || '',
          majorClassId:
            latestTermEnrollmentRaw.majorClassId
            || latestTermEnrollmentRaw.major_class_id
            || null,
          majorClassLabel:
            latestTermEnrollmentRaw.majorClassLabel
            || latestTermEnrollmentRaw.major_class_label
            || '',
          updatedAt:
            latestTermEnrollmentRaw.updatedAt
            || latestTermEnrollmentRaw.updated_at
            || null
        }
      : null;
  return {
    ...student,
    id: student.id || student.studentid,
    studentid: student.studentid || student.id,
    registrationId: student.registrationId || student.registrationid || student.registration_id || null,
    namemm: student.namemm || student.nameMm || student.name_mm || student.fullName || '',
    nameen: student.nameen || student.nameEn || student.name_en || '',
    father_name: student.father_name || student.fatherName || '',
    mother_name: student.mother_name || student.motherName || '',
    gender: student.gender || '',
    birthplace: student.birthplace || student.place_of_birth || student.placeOfBirth || '',
    date_of_birth: student.date_of_birth || student.dateOfBirth || '',
    nrc_number: student.nrc_number || student.nrcNumber || '',
    exam_roll_no: student.exam_roll_no || student.examRollNo || student.entrance_roll_no || student.entranceRollNo || '',
    student_name: student.student_name || student.studentName || student.full_name || student.fullName || '',
    phone: student.phone || student.phone_number || student.phoneNumber || '',
    user_name: student.user_name || student.username || '',
    currentyear: student.currentyear ?? student.currentYear ?? null,
    academic_semester: student.academic_semester || student.academicSemester || student.semester || '',
    major: student.major || student.major_code || student.specialization || '',
    academicyearentered: student.academicyearentered || student.academicYearEntered || '',
    matriculation_rollno: student.matriculation_rollno || student.matriculation_roll_no || student.matriculationRollNo || '',
    matriculation_passed_year: student.matriculation_passed_year || student.matriculationPassedYear || '',
    totalmarks_obtained:
      student.totalmarks_obtained
      ?? student.total_marks_obtained
      ?? student.totalMarksObtained
      ?? student.total_marks
      ?? student.totalMarks
      ?? null,
    division_or_state: student.division_or_state || student.divisionOrState || '',
    township: student.township || '',
    address: student.address || '',
    assigned_class: student.assigned_class || student.assignedClass || '',
    status: student.status || '',
    globalStatus: student.globalStatus || student.global_status || student.status || '',
    payment_status: student.payment_status || student.paymentStatus || '',
    payment_academic_year: student.payment_academic_year || student.paymentAcademicYear || '',
    paymentStatus: student.paymentStatus || student.payment_status || '',
    paymentAcademicYear: student.paymentAcademicYear || student.payment_academic_year || '',
    passportphoto: student.passportphoto || student.passportPhoto || student.passport_photo || '',
    nrcfrontimage: student.nrcfrontimage || student.nrcFrontImage || student.nrc_front_image || '',
    nrcbackimage: student.nrcbackimage || student.nrcBackImage || student.nrc_back_image || '',
    father_id: student.father_id || student.fatherId || null,
    mother_id: student.mother_id || student.motherId || null,
    rejection_reason: student.rejection_reason || student.rejectionReason || '',
    is_benefit_student: student.is_benefit_student ?? student.isBenefitStudent ?? false,
    is_hostel_student: student.is_hostel_student ?? student.isHostelStudent ?? false,
    is_on_break: student.is_on_break ?? student.isOnBreak ?? false,
    latestTermEnrollment,
    latest_term_enrollment: latestTermEnrollment
  };
}

function normalizeAdmin(admin) {
  if (!admin) return admin;
  return {
    ...admin,
    adminname: admin.adminname || admin.adminName || admin.fullName || ''
  };
}

function normalizeParent(parent) {
  if (!parent) return parent;
  return {
    ...parent,
    id: parent.id || parent.parentid,
    parentid: parent.parentid || parent.id,
    studentid: parent.studentid || parent.studentId || parent.student_id,
    full_name: parent.full_name || parent.fullName || '',
    relation: parent.relation || '',
    job_position: parent.job_position || parent.jobPosition || '',
    education: parent.education || '',
    address: parent.address || '',
    phone_number: parent.phone_number || parent.phone || parent.phoneNumber || '',
    ethnic: parent.ethnic || '',
    religion: parent.religion || '',
    birthplace: parent.birthplace || '',
    nrc_number: parent.nrc_number || parent.nrcNumber || '',
    nrc_front_image: parent.nrc_front_image || parent.nrcFrontImage || '',
    nrc_back_image: parent.nrc_back_image || parent.nrcBackImage || ''
  };
}

const decodeJwtPayload = (token) => {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  try {
    const payloadPart = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const padded = payloadPart + '='.repeat((4 - (payloadPart.length % 4)) % 4);
    const decoded = typeof window !== 'undefined' && typeof window.atob === 'function'
      ? window.atob(padded)
      : '';
    if (!decoded) return null;
    return JSON.parse(decoded);
  } catch (_) {
    return null;
  }
};

const looksLikeAdminToken = (token) => {
  const normalized = String(token || '').trim();
  if (!normalized) return false;
  if (/^dev-token-admin-/i.test(normalized)) return true;

  const payload = decodeJwtPayload(normalized);
  if (!payload || typeof payload !== 'object') return false;

  const topRole = String(payload.role || '').trim().toUpperCase();
  if (topRole === 'ADMIN' || topRole === 'ROLE_ADMIN') return true;

  const appMetaRole = String(payload?.app_metadata?.role || '').trim().toUpperCase();
  if (appMetaRole === 'ADMIN' || appMetaRole === 'ROLE_ADMIN') return true;

  const userMetaRole = String(payload?.user_metadata?.role || '').trim().toUpperCase();
  if (userMetaRole === 'ADMIN' || userMetaRole === 'ROLE_ADMIN') return true;

  const appMetaRoles = payload?.app_metadata?.roles;
  if (Array.isArray(appMetaRoles)) {
    return appMetaRoles.some((role) => {
      const normalizedRole = String(role || '').trim().toUpperCase();
      return normalizedRole === 'ADMIN' || normalizedRole === 'ROLE_ADMIN';
    });
  }

  return false;
};

const isAdminUiRoute = () => {
  if (typeof window === 'undefined') return false;
  return String(window.location?.pathname || '').startsWith('/admin');
};

async function resolveAccessToken(requestPath = '') {
  const studentToken = localStorage.getItem(STUDENT_AUTH_TOKEN_KEY);
  const adminToken = localStorage.getItem(ADMIN_AUTH_TOKEN_KEY);
  const hasAdminSession = Boolean(localStorage.getItem('adminData'));
  const isAdminApi = String(requestPath || '').startsWith('/api/admin/');
  const preferAdminToken = hasAdminSession && (isAdminUiRoute() || isAdminApi);

  if (preferAdminToken) {
    if (adminToken && adminToken.trim()) {
      return adminToken.trim();
    }
    if (studentToken && studentToken.trim() && looksLikeAdminToken(studentToken)) {
      return studentToken.trim();
    }
    return null;
  }

  if (studentToken && studentToken.trim()) {
    return studentToken.trim();
  }

  // When admin session exists, do not fall back to Supabase user session token.
  // This prevents mixing student JWT with admin APIs after navigating between admin pages.
  if (hasAdminSession) {
    return null;
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    if (!error) {
      const sessionToken = data?.session?.access_token;
      if (sessionToken) {
        return sessionToken;
      }
    }
  } catch (_) {
    // Fallback to existing local token when Supabase session is unavailable.
  }
  return null;
}

async function apiRequest(path, options = {}) {
  const token = await resolveAccessToken(path);
  const isAuthRoute = path.startsWith('/api/auth/');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (isAuthRoute && headers.Authorization) {
    delete headers.Authorization;
  }

  if (!isAuthRoute && token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch (error) {
    payload = text;
  }

  if (!response.ok) {
    const backendMessage = extractBackendMessage(payload);
    const message = sanitizeErrorMessage(backendMessage, response.status);
    const backendCode = payload && typeof payload === 'object' ? payload.code : undefined;
    if (response.status === 401 && /invalid jwt|missing or invalid jwt/i.test(message)) {
      const hasAdminSession = Boolean(localStorage.getItem('adminData'));
      const isAdminApi = path.startsWith('/api/admin/');
      if (hasAdminSession && (isAdminUiRoute() || isAdminApi)) {
        localStorage.removeItem(ADMIN_AUTH_TOKEN_KEY);
        const studentToken = localStorage.getItem(STUDENT_AUTH_TOKEN_KEY);
        if (looksLikeAdminToken(studentToken)) {
          localStorage.removeItem(STUDENT_AUTH_TOKEN_KEY);
        }
      } else {
        localStorage.removeItem(STUDENT_AUTH_TOKEN_KEY);
      }
    }
    const error = new Error(message);
    error.status = response.status;
    error.path = path;
    error.method = options.method || 'GET';
    error.apiCode = backendCode;
    error.apiMessage = backendMessage || undefined;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export const api = {
  registerStudent(body) {
    return apiRequest('/api/auth/register', { method: 'POST', body }).then((data) => {
      if (data?.student) {
        return { ...data, student: normalizeStudent(data.student) };
      }
      return normalizeStudent(data);
    });
  },
  loginStudent(body) {
    return apiRequest('/api/auth/login', { method: 'POST', body }).then((data) => {
      if (data?.student) {
        return { ...data, student: normalizeStudent(data.student) };
      }
      return normalizeStudent(data);
    });
  },
  loginAdmin(body) {
    return apiRequest('/api/auth/admin/login', { method: 'POST', body }).then((data) => {
      if (data?.admin) {
        return { ...data, admin: normalizeAdmin(data.admin) };
      }
      return normalizeAdmin(data);
    });
  },
  getStudents(email) {
    const query = email ? `?email=${encodeURIComponent(email)}` : '';
    return apiRequest(`/api/students${query}`).then((items) => {
      const list = Array.isArray(items)
        ? items
        : Array.isArray(items?.students)
          ? items.students
          : Array.isArray(items?.data)
            ? items.data
            : Array.isArray(items?.content)
              ? items.content
              : Array.isArray(items?.results)
                ? items.results
                : [];
      return list.map(normalizeStudent);
    });
  },
  getStudentById(studentId) {
    return apiRequest(`/api/students/${studentId}`).then(normalizeStudent);
  },
  updateStudent(studentId, body) {
    return apiRequest(`/api/students/${studentId}`, { method: 'PATCH', body }).then(normalizeStudent);
  },
  getClassSections(paramsOrYear, semesterArg, yearLevelArg) {
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
      // Backward compatibility: existing calls pass only student year.
      queryParams.set('year', String(paramsOrYear));
    }

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return apiRequest(`/api/class-sections${query}`);
  },
  getCurrentTerm() {
    return apiRequest('/api/terms/current');
  },
  getAdminTermConfig() {
    return apiRequest('/api/admin/terms/config');
  },
  updateAdminTermConfig(body) {
    return apiRequest('/api/admin/terms/config', { method: 'PATCH', body });
  },
  getEnrollmentOptions(studentId) {
    const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
    return apiRequest(`/api/enrollment/options${query}`);
  },
  getRolloverReport(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.academicYear != null && String(params.academicYear).trim() !== '') {
      queryParams.set('academicYear', String(params.academicYear));
    }
    if (params.semester != null && String(params.semester).trim() !== '') {
      queryParams.set('semester', String(params.semester));
    }
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return apiRequest(`/api/admin/rollover/report${query}`);
  },
  adminPrepareRollover(body) {
    return apiRequest('/api/admin/rollover/prepare', { method: 'POST', body });
  },
  adminListTermEnrollments(params = {}) {
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
    return apiRequest(`/api/admin/term-enrollments${query}`);
  },
  adminSetTermResult(enrollmentId, result) {
    return apiRequest(`/api/admin/term-enrollments/${enrollmentId}/set-result`, {
      method: 'PATCH',
      body: { result }
    }).then((data) => data?.enrollment || data);
  },
  adminSetTermReexamResult(enrollmentId, result) {
    return apiRequest(`/api/admin/term-enrollments/${enrollmentId}/set-reexam-result`, {
      method: 'PATCH',
      body: { result }
    }).then((data) => data?.enrollment || data);
  },
  adminBulkSetTermResult(enrollmentIds, result) {
    return apiRequest('/api/admin/term-enrollments/bulk-set-result', {
      method: 'POST',
      body: { enrollmentIds, result }
    });
  },
  adminBulkSetTermReexamResult(enrollmentIds, result) {
    return apiRequest('/api/admin/term-enrollments/bulk-set-reexam-result', {
      method: 'POST',
      body: { enrollmentIds, result }
    });
  },
  registerTermEnrollment(body) {
    return apiRequest('/api/term-enrollments/register', { method: 'POST', body }).then((data) => data?.enrollment || data);
  },
  selectTermEnrollmentSection(enrollmentId, section) {
    return apiRequest(`/api/term-enrollments/${enrollmentId}/select-section`, {
      method: 'PATCH',
      body: { section }
    }).then((data) => data?.enrollment || data);
  },
  adminListClassSections() {
    return apiRequest('/api/admin/class-sections');
  },
  adminUpdateClassSection(payload) {
    return apiRequest('/api/admin/class-sections', { method: 'PUT', body: payload });
  },
  adminListMajorClasses(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.academicYear != null && String(params.academicYear).trim() !== '') {
      queryParams.set('academicYear', String(params.academicYear).trim());
    }
    if (params.semester != null && String(params.semester).trim() !== '') {
      queryParams.set('semester', String(params.semester).trim());
    }
    if (params.yearLevel != null && String(params.yearLevel).trim() !== '') {
      queryParams.set('yearLevel', String(params.yearLevel).trim());
    }
    if (params.departmentId != null && String(params.departmentId).trim() !== '') {
      queryParams.set('departmentId', String(params.departmentId).trim());
    }
    if (params.includeInactive != null) {
      queryParams.set('includeInactive', params.includeInactive ? 'true' : 'false');
    }
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return apiRequest(`/api/admin/major-classes${query}`);
  },
  adminUpdateMajorClass(payload) {
    return apiRequest('/api/admin/major-classes', { method: 'PUT', body: payload });
  },
  adminGenerateMajorClasses(payload) {
    return apiRequest('/api/admin/major-classes/generate', { method: 'POST', body: payload });
  },
  adminMoveStudentSection(payload) {
    return apiRequest('/api/admin/class-sections/move-student', { method: 'POST', body: payload });
  },
  updateStudentStatus(studentId, status) {
    return apiRequest(`/api/students/${studentId}/status`, {
      method: 'PATCH',
      body: { status }
    }).then(normalizeStudent);
  },
  approveStudent(studentId, body) {
    return apiRequest(`/api/students/${studentId}/approve`, { method: 'POST', body }).then((data) => {
      if (data?.student) {
        return { ...data, student: normalizeStudent(data.student) };
      }
      return data;
    });
  },
  rejectStudent(studentId, body) {
    return apiRequest(`/api/students/${studentId}/reject`, { method: 'POST', body }).then((data) => {
      if (data?.student) {
        return { ...data, student: normalizeStudent(data.student) };
      }
      return data;
    });
  },
  changeStudentPassword(studentId, body) {
    return apiRequest(`/api/students/${studentId}/change-password`, { method: 'POST', body });
  },
  createParent(body) {
    return apiRequest('/api/parents', { method: 'POST', body });
  },
  listParents(studentId) {
    const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
    return apiRequest(`/api/parents${query}`).then((items) => {
      const list = Array.isArray(items)
        ? items
        : Array.isArray(items?.parents)
          ? items.parents
          : Array.isArray(items?.data)
            ? items.data
            : [];
      return list.map(normalizeParent);
    });
  },
  upsertSection(registrationId, section, data) {
    return apiRequest(`/v1/registration/${registrationId}/sections/${section}`, {
      method: 'PUT',
      body: { data }
    });
  },
  upsertStudentDocument(body) {
    return apiRequest('/v1/student/documents', { method: 'POST', body });
  },
  createRegistration(body) {
    return apiRequest('/api/registrations', { method: 'POST', body });
  },
  adminListRegistrations(status) {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return apiRequest(`/v1/admin/registrations${query}`);
  },
  adminApproveRegistration(registrationId) {
    return apiRequest(`/v1/admin/registrations/${registrationId}/approve`, { method: 'PATCH' });
  },
  adminRejectRegistration(registrationId, reason) {
    const query = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    return apiRequest(`/v1/admin/registrations/${registrationId}/reject${query}`, { method: 'PATCH' });
  },
  listRegistrations(studentId) {
    const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
    return apiRequest(`/api/registrations${query}`).then((items) => {
      if (Array.isArray(items)) return items;
      if (Array.isArray(items?.registrations)) return items.registrations;
      if (Array.isArray(items?.data)) return items.data;
      if (Array.isArray(items?.content)) return items.content;
      if (Array.isArray(items?.results)) return items.results;
      return [];
    });
  },
  getRegistrationSections(registrationId) {
    return apiRequest(`/v1/registration/${registrationId}/sections`).then((data) => {
      if (!data || typeof data !== 'object') return {};
      return data;
    });
  },
  clearRegistrationSections(registrationId) {
    return apiRequest(`/v1/registration/${registrationId}/sections`, { method: 'DELETE' });
  },
  getRegistrationWindowSettings() {
    return apiRequest('/api/registration-window');
  },
  getStudentStartRoute() {
    return apiRequest('/api/student/start-route');
  },
  updateRegistrationWindowSettings(body) {
    return apiRequest('/api/admin/registration-window', { method: 'PUT', body });
  },
  getLatestStudentDocument(studentId, docType) {
    const query = `?studentId=${encodeURIComponent(studentId)}&docType=${encodeURIComponent(docType)}`;
    return apiRequest(`/v1/student/documents${query}`);
  },
  deleteStudentDocuments(studentId, docType) {
    const query = docType
      ? `?studentId=${encodeURIComponent(studentId)}&docType=${encodeURIComponent(docType)}`
      : `?studentId=${encodeURIComponent(studentId)}`;
    return apiRequest(`/v1/student/documents${query}`, { method: 'DELETE' });
  }
};

export { API_BASE_URL };
