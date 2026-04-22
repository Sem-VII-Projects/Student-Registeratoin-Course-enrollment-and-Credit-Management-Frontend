export type Role = 'student' | 'admin';

export interface User {
  // backend fields (MongoDB)
  _id?: string;
  user_id?: string;

  // existing field used in UI (mock)
  id?: string;

  name: string;
  role: Role;
  email: string;
  must_reset_password?: boolean;

  department?: string;
  avatar?: string;

  // backend may return these
  student_profile?: any;
  admin_profile?: any;
  major_history?: any[];
}

export interface Course {
  id: string;
  code: string; semester?: string | number; year?: string | number;
  name: string;
  department: string;
  credits: number;
  type: 'Core' | 'Elective' | 'Prerequisite';
}

export interface EnrollmentRequest {
  id: string;
  studentId?: string;
  studentName: string;
  studentInitials: string;
  studentAvatar?: string;
  courseName: string;
  semester: string;
  academicYear: string;
  year?: string;
  class?: string;
  status: 'Enrolled' | 'Pending' | 'Conflict' | 'Waitlisted';
}

export interface StudentCourse {
  tag: string;
  credits: number;
  title: string;
  code: string; semester?: string | number; year?: string | number;
  instructor: string;
  location: string;
  is_retake?: boolean;
}

export interface CurrentCoursesResponse {
  semester_name: string;
  total_credits: number;
  max_credits: number;
  courses_count: number;
  courses: StudentCourse[];
}

export interface CourseDetail {
  code: string; semester?: string | number; year?: string | number;
  title: string;
  instructor: string;
  credits: number;
  schedule: string[] | string;
  room: string;
  description: string;
  syllabus: { week: number; topic: string }[];
  prerequisites: string[];
  type?: string;
  department?: string;

  // Potential API raw fields
  course_code?: string;
  instructor_email?: string;
  email?: string;
}

export interface AvailableCourse {
  code: string; semester?: string | number; year?: string | number;
  title: string;
  type: string;
  credits: number;
  desc: string;
  color: string;
  status: string;
  error?: string;
  is_retake?: boolean;
  schedule?: string;
  message?: string;
  enrollable?: boolean;
}

export interface AvailableCoursesResponse {
  data: AvailableCourse[];
  meta: any;
}

export interface EnrollmentAssistanceRequest {
  message: string;
}

export interface EnrollmentAssistanceCourse {
  code: string; semester?: string | number; year?: string | number;
  title: string;
  type: string;
  credits: number;
  desc: string;
  color: string;
  status: string;
  error?: string;
  is_retake?: boolean;
  schedule?: string;
  message?: string;
  enrollable?: boolean;
  reason?: string;
}

export interface EnrollmentAssistanceResponse {
  data: EnrollmentAssistanceCourse[];
  meta: Record<string, unknown>;
}

export interface DropRecommendationCourse {
  course_id?: string;
  code: string; semester?: string | number; year?: string | number;
  title: string;
  type: string;
  credits: number;
  reason: string;
}

export interface DropRecommendationResponse {
  exceeds_limit: boolean;
  message: string;
  credit_limit: number;
  current_total_credits: number;
  credits_to_drop: number;
  elective: DropRecommendationCourse | null;
  others: DropRecommendationCourse[];
}

export interface StudentAlert {
  _id: string;
  student_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export type EnrollmentStatusAction = "open" | "closed";
export type EnrollmentDurationType = "minutes" | "days";

export interface EnrollmentSetting {
  _id: string;
  max_credits: number;
  max_courses: number | null;
  allow_waitlist: boolean;
  is_active: boolean;
  enrollment_open_at: string;
  enrollment_close_at: string;
  created_at: string;
  updated_at: string;
  updated_by: string;
}

export interface EnrollmentSettingUpsertPayload {
  window_minutes?: number;
  window_days?: number;
  max_credits: number;
  max_courses?: number;
  allow_waitlist: boolean;
  is_active: boolean;
}

export interface EnrollmentSettingStatusPayload {
  status: EnrollmentStatusAction;
}

export interface StudentEnrollmentSettingCurrent {
  enrollment_open_at: string;
  enrollment_close_at: string;
  max_credits: number;
  max_courses: number;
  allow_waitlist: boolean;
  is_active: boolean;
  is_fallback: boolean;
}
