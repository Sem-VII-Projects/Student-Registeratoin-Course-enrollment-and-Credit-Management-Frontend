import React, { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import Login from "./pages/Login";
import StudentLoginPage from "./src/pages/LoginPage";
import SimpleLogin from "./pages/SimpleLogin";
import ResetPassword from "./pages/ResetPassword";
import AdminLogin from "./src/pages/AdminLogin";

import ForgotPassword from "./pages/ForgotPassword";
import ResetPasswordToken from "./pages/ResetPasswordToken";

// NEW: HomePage migrated
import HomePage from "./pages/HomePage";
import NewStudentRegister from "./pages/NewStudentRegister";

import IntegratedAdminPortal from "./pages/IntegratedAdminPortal";
import AdminEnrollment from "./pages/AdminEnrollment";
import AdminCourses from "./pages/AdminCourses";
import AdminStudents from "./pages/AdminStudents";
import AdminGrading from "./pages/AdminGrading";
import AdminStudentDetails from "./pages/AdminStudentDetails";
import AdminAnnouncements from "./pages/AdminAnnouncements";
//  NEW: Manual Enrollment Page
import AdminManualEnrollment from "./pages/AdminManualEnrollment";
import AdminEnrollmentSettings from "./pages/AdminEnrollmentSettings";
import AdminMessages from "./pages/AdminMessages";
import AdminChatPage from "./pages/AdminChatPage";

//  NEW: admin-only course details page (rename your file to AdminCourseDetails.tsx)
import AdminCourseDetails from "./pages/AdminCourseDetails";

import StudentDashboard from "./pages/StudentDashboard";
import StudentEnrollment from "./pages/StudentEnrollment";
import StudentResults from "./pages/StudentResults";
import StudentStatus from "./pages/StudentStatus";
import StudentCourses from "./pages/StudentCourses";
import StudentChatPage from "./pages/StudentChatPage";
import StudentChatTrigger from "./components/StudentChatTrigger";
import PublicChatTrigger from "./components/PublicChatTrigger";
import StudentProgressCurrent from "./pages/StudentProgressCurrent";
import StudentTrackSelection from "./pages/StudentTrackSelection";
import StudentMajorSelection from "./pages/StudentMajorSelection";
import StudentAnnouncements from "./pages/StudentAnnouncements";
import StudentMajorLocked from "./pages/StudentMajorLocked";
import StudentMessages from "./pages/StudentMessages";import StudentSpecialMajorAccess from "./pages/StudentSpecialMajorAccess";
import StudentSpecialMajorError from "./pages/StudentSpecialMajorError";
import StudentDegreeAudit from "./pages/StudentDegreeAudit";

//  student course details page stays as CourseDetails.tsx (student-facing)
import CourseDetails from "./pages/CourseDetails";
import StudentDetails from "./pages/StudentDetails";
import Payment from "./pages/Payment";
import RegistrationStatus from "./pages/RegistrationStatus";
import RegistrationChoice from "./pages/RegistrationChoice";
import NewStudentDraftDetail from "./pages/NewStudentDraftDetail";
import SubmittedDetailsReview from "./pages/SubmittedDetailsReview";
import IsolatedReview from "./pages/IsolatedReview";
import { DetailedCardGridSkeleton, Skeleton } from "./components/Skeleton";
import ThemeToggle from "./components/ThemeToggle";

import { User } from "./types";
import { api } from "./lib/api";
import { UIProvider } from "./context/UIContext";
import { applyTheme, getPreferredTheme } from "./lib/theme";

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);

  const syncStudentEnrollmentSettings = async () => {
    try {
      const setting = await api.studentEnrollmentSettingCurrent();
      localStorage.setItem("max_credits", String(setting.max_credits));
      localStorage.setItem("student_enrollment_setting_current", JSON.stringify(setting));
    } catch {
      // non-blocking for app bootstrap
    }
  };

  useEffect(() => {
    applyTheme(getPreferredTheme());
  }, []);

  useEffect(() => {
    const boot = async () => {
      try {
        let me = null;

        // Try local storage first for students (Spring backend)
        const studentJson = localStorage.getItem("studentData");
        if (studentJson) {
          me = JSON.parse(studentJson);
          if (me && !me.role) me.role = "student";
        } else {
          // Fallback to API if not in local storage
          try {
            me = await api.me();
          } catch (e) {
            console.warn("API me() failed, using local storage fallback.");
          }
        }
        
        if (!me) throw new Error("No user found");

        // Manual Transition Logic
        const hasEntered = sessionStorage.getItem("portal_entered") === "true";
        if (me.role === "student" && !hasEntered) {
          me.role = "register";
        }

        setUser(me);
        sessionStorage.setItem("user", JSON.stringify(me));
        sessionStorage.setItem("role", me.role);
        sessionStorage.setItem("must_reset_password", String(!!me.must_reset_password));
        
        if (me.role === "student" && !me.must_reset_password) {
          await syncStudentEnrollmentSettings();
        }
      } catch {
        setUser(null);
      } finally {
        setBooting(false);
      }
    };

    boot();
  }, []);

  const handleLogin = (userFromBackend: User) => {
    // Force register role initially on login to show the gateway dashboard
    const initialUser = userFromBackend.role === "student" 
      ? { ...userFromBackend, role: "register" as any } 
      : userFromBackend;

    setUser(initialUser);
    sessionStorage.setItem("user", JSON.stringify(initialUser));
    sessionStorage.setItem("role", initialUser.role);
    sessionStorage.setItem("must_reset_password", String(!!initialUser.must_reset_password));
    if (initialUser.role === "student" && !initialUser.must_reset_password) {
      void syncStudentEnrollmentSettings();
    }
  };

  const handlePasswordReset = (updatedUser: User) => {
    setUser(updatedUser);
    sessionStorage.setItem("user", JSON.stringify(updatedUser));
    sessionStorage.setItem("role", updatedUser.role);
    sessionStorage.setItem("must_reset_password", String(!!updatedUser.must_reset_password));
    if (updatedUser.role === "student" && !updatedUser.must_reset_password) {
      void syncStudentEnrollmentSettings();
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("role");
      sessionStorage.removeItem("must_reset_password");
      sessionStorage.removeItem("adminAuthToken");
      localStorage.removeItem("access_token");
      localStorage.removeItem("adminData");
      localStorage.removeItem("adminAuthToken");
    }
  };

  if (booting) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 p-10 flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-700">
        <div className="w-full max-w-4xl space-y-8">
          <Skeleton className="h-10 w-64 rounded-2xl" />
          <DetailedCardGridSkeleton count={2} />
        </div>
      </div>
    );
  }

  return (
    <UIProvider>
      <HashRouter>
        <Routes>
        {/*  Public routes ALWAYS available */}
        <Route path="/reset-password-token" element={<ResetPasswordToken />} />

        {/*  Existing in-app reset route (must_reset_password flow) */}
        <Route
          path="/reset-password"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : (
              <ResetPassword user={user} onPasswordReset={handlePasswordReset} />
            )
          }
        />

        {/* Public routes - accessible without login */}
        <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<NewStudentRegister />} />
        <Route path="/admin-login" element={<AdminLogin onLogin={handleLogin as any} />} />
<Route path="/student-login" element={<StudentLoginPage onLogin={handleLogin as any} />} />        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password-token" element={<ResetPasswordToken />} />
        <Route path="/simple-login" element={<SimpleLogin />} />

        {/*  If user must reset password, force all routes to reset page */}
        {user?.must_reset_password ? (
          <>
            {/* duplicate public routes inside this branch for safety */}
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password-token" element={<ResetPasswordToken />} />

            <Route path="*" element={<Navigate to="/reset-password" replace />} />
          </>
        ) : (
          <>
            <Route
              path="/login"
              element={
                user ? (
                  <Navigate
                    to={
                      user.role === "admin"
                        ? "/admin/dashboard"
                        : user.role === "register"
                        ? "/registration-details"
                        : "/student/dashboard"
                    }
                    replace
                  />
                ) : (
                  <Login onLogin={handleLogin as any} />
                )
              }
            />

            {/* duplicate public routes inside this branch for safety */}
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password-token" element={<ResetPasswordToken />} />

            {user?.role === "admin" ? (
              <>
                <Route path="/admin/dashboard" element={<IntegratedAdminPortal user={user} onLogout={handleLogout} />} />
                <Route
                  path="/admin/enrollment"
                  element={<AdminEnrollment user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/admin/courses"
                  element={<AdminCourses user={user} onLogout={handleLogout} />}
                />

                {/*  FIX: admin course details uses AdminCourseDetails (NOT CourseDetails) */}
                <Route
                  path="/admin/courses/:courseId"
                  element={<AdminCourseDetails user={user} onLogout={handleLogout} />}
                />

                {/* Manual Enrollment Route */}
                <Route
                  path="/admin/enrollment/manual"
                  element={<AdminManualEnrollment user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/admin/enrollment-settings"
                  element={<AdminEnrollmentSettings user={user} onLogout={handleLogout} />}
                />

                <Route
                  path="/admin/students"
                  element={<AdminStudents user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/admin/students/:studentId"
                  element={<AdminStudentDetails user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/admin/announcements"
                  element={<AdminAnnouncements user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/admin/messages"
                  element={<AdminMessages user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/admin/grading"
                  element={<AdminGrading user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/admin/chatbot"
                  element={<AdminChatPage user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/admin/new-student-draft-detail/:recordId"
                  element={<NewStudentDraftDetail user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/admin/submitted-details/:studentId"
                  element={<SubmittedDetailsReview user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/admin/submitted-details-review/:studentId"
                  element={<IsolatedReview user={user} onLogout={handleLogout} />}
                />

                <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
              </>
                        ) : user?.role === "student" ? (
              <>
                <Route
                  path="/student/dashboard"
                  element={<StudentDashboard user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/student/progress/current"
                  element={<StudentProgressCurrent user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/student/major/track"
                  element={<StudentTrackSelection user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/student/major/select"
                  element={<StudentMajorSelection user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/student/major/locked"
                  element={<StudentMajorLocked user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/student/special-major/access"
                  element={<StudentSpecialMajorAccess user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/student/special-major/error"
                  element={<StudentSpecialMajorError user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/student/enrollment"
                  element={<StudentEnrollment user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/student/enrollment/view/:courseId"
                  element={<CourseDetails user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/student/results"
                  element={<StudentResults user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/student/status"
                  element={<StudentStatus user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/student/courses"
                  element={<StudentCourses user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/student/chatbot"
                  element={<StudentChatPage user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/student/courses/:courseId"
                  element={<CourseDetails user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/student/announcements"
                  element={<StudentAnnouncements user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/student/messages"
                  element={<StudentMessages user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/student/degree-audit"
                  element={<StudentDegreeAudit user={user} onLogout={handleLogout} />}
                />
                <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
              </>
            ) : user?.role === "register" ? (
              <>
                {/* Registration-only area */}
                <Route
                  path="/registration-details"
                  element={<RegistrationStatus user={user} onLogout={handleLogout} />}
                />
                <Route
                  path="/payment"
                  element={<Payment />}
                />
                <Route
                  path="/student-details"
                  element={<StudentDetails user={user} onLogout={handleLogout} />}
                />
                <Route path="*" element={<Navigate to="/registration-details" replace />} />
              </>
            ) : (
              <Route path="*" element={<Navigate to="/login" replace />} />
            )}
          </>
        )}
      </Routes>
      <ThemeToggle />
      <StudentChatTrigger visible={!!user && user.role === "student" && !user.must_reset_password} />        <PublicChatTrigger />
        </HashRouter>
    </UIProvider>
  );
};

export default App;
