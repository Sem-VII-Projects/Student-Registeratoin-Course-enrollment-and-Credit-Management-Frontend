import React, { useState } from 'react';
import AdminDashboard from './AdminDashboard';
import AdminDashboard_Friend from './AdminDashboard_Friend';

export default function IntegratedAdminPortal({ user, onLogout }: any) {
  const [activeTab, setActiveTab] = useState<'student' | 'course'>('student');

  return (
    <div className="flex flex-row h-screen w-full overflow-hidden bg-white dark:bg-slate-950 font-roboto text-slate-900 transition-colors duration-500">
      {/* 
          Refined Vertical Minimalist Sidebar 
          Takes as little horizontal space as possible using vertical writing mode
      */}
      <div className="flex flex-col border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 z-20 relative w-12 hover:w-14 transition-all duration-500 ease-in-out shrink-0">
        <div className="flex flex-col items-center py-8 gap-12 h-full">
          {/* Student Registration Tab */}
          <button
            className={`
              relative flex items-center justify-center py-10 px-2 transition-all duration-500 group
              ${activeTab === 'student' 
                ? 'text-teal-600 dark:text-teal-400' 
                : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
              }
            `}
            onClick={() => setActiveTab('student')}
            title="my friend's project"
          >
            {/* Vertical Label */}
            <span className={`
              [writing-mode:vertical-lr] rotate-180 text-[10px] font-poppins font-bold uppercase tracking-[0.2em] whitespace-nowrap
              transition-transform duration-500 group-hover:scale-105
            `}>
              my friend's project
            </span>
            
            {/* Active Indicator (Perplexity Style Pill) */}
            {activeTab === 'student' && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-12 bg-teal-500 rounded-l-full shadow-[0_0_12px_rgba(20,184,166,0.4)]" />
            )}
          </button>

          {/* Course Enrollment Tab */}
          <button
            className={`
              relative flex items-center justify-center py-10 px-2 transition-all duration-500 group
              ${activeTab === 'course' 
                ? 'text-teal-600 dark:text-teal-400' 
                : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
              }
            `}
            onClick={() => setActiveTab('course')}
            title="Course Enrollment and Credit Management"
          >
            {/* Vertical Label */}
            <span className={`
              [writing-mode:vertical-lr] rotate-180 text-[10px] font-poppins font-bold uppercase tracking-[0.2em] whitespace-nowrap
              transition-transform duration-500 group-hover:scale-105
            `}>
              Course Management
            </span>
            
            {/* Active Indicator (Perplexity Style Pill) */}
            {activeTab === 'course' && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-12 bg-teal-500 rounded-l-full shadow-[0_0_12px_rgba(20,184,166,0.4)]" />
            )}
          </button>
        </div>
        
        {/* Decorative subtle logo or brand mark at bottom */}
        <div className="mt-auto pb-6 flex justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>

      {/* Main Tab Content Area */}
      <div className="flex-1 relative z-10 bg-white dark:bg-slate-900 flex flex-col overflow-hidden min-w-0">
        <div className="flex-1 w-full h-full animate-in fade-in duration-700">
            {activeTab === 'student' && (
              <AdminDashboard_Friend user={user} onLogout={onLogout} />
            )}
            {activeTab === 'course' && (
              <div className="flex-1 w-full h-full">
                <AdminDashboard user={user} onLogout={onLogout} />
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
