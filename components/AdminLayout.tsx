import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import AdminDashboard_Friend from '../pages/AdminDashboard_Friend';
import { User } from '../types';
import { useUI } from '../context/UIContext';

interface AdminLayoutProps {
  user: User | null;
  onLogout: () => void;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ user, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useUI();
  
  // Persist the active portal tab in localStorage
  const [activeTab, setActiveTab] = useState<'student' | 'course'>(() => {
    const saved = localStorage.getItem('admin_portal_tab');
    return (saved === 'student' || saved === 'course') ? saved : 'course';
  });

  useEffect(() => {
    localStorage.setItem('admin_portal_tab', activeTab);
  }, [activeTab]);

  // If we are on a specific sub-page (like /admin/messages), we MUST be in 'course' mode
  // because the 'student' mode currently only has the dashboard view.
  useEffect(() => {
    if (location.pathname !== '/admin/dashboard' && activeTab === 'student') {
      setActiveTab('course');
    }
  }, [location.pathname]);

  if (!user) return null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 font-roboto text-slate-900 transition-colors duration-500 dark:bg-slate-950">
      {/* PERSISTENT PORTAL TOGGLE TABS */}
      <div className="flex flex-row items-end px-8 pt-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 z-20 relative">
        <button
          className={`relative px-8 py-3.5 mr-2 rounded-t-2xl text-sm font-poppins font-medium transition-all duration-300 ${
            activeTab === 'student' 
              ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 border border-b-0 border-slate-200 dark:border-slate-800 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)] z-10' 
              : 'bg-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:-translate-y-0.5 active:scale-[0.98] border border-transparent border-b-0'
          }`}
          onClick={() => {
            setActiveTab('student');
            if (location.pathname !== '/admin/dashboard') {
              navigate('/admin/dashboard');
            }
          }}
        >
          {activeTab === 'student' && (
            <span className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-white dark:bg-slate-900" />
          )}
          Student Registration
        </button>

        <button
          className={`relative px-8 py-3.5 mr-2 rounded-t-2xl text-sm font-poppins font-medium transition-all duration-300 ${
            activeTab === 'course' 
              ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 border border-b-0 border-slate-200 dark:border-slate-800 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)] z-10' 
              : 'bg-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:-translate-y-0.5 active:scale-[0.98] border border-transparent border-b-0'
          }`}
          onClick={() => setActiveTab('course')}
        >
          {activeTab === 'course' && (
            <span className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-white dark:bg-slate-900" />
          )}
          Course Enrollment and Credit Management
        </button>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 relative z-10 bg-white dark:bg-slate-900 flex flex-col overflow-hidden animate-in fade-in duration-500">
        {activeTab === 'student' ? (
          <div className="flex-1 w-full h-full overflow-auto animate-in fade-in duration-500 slide-in-from-bottom-2">
            <AdminDashboard_Friend user={user} onLogout={onLogout} />
          </div>
        ) : (
          <div className="flex h-full overflow-hidden">
            <Sidebar user={user} onLogout={onLogout} />
            <div className="flex-1 flex flex-col overflow-hidden">
              <Header user={user} onLogout={onLogout} />
              <main className="flex-1 overflow-auto bg-slate-50/30 dark:bg-slate-950/30">
                <Outlet />
              </main>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLayout;
