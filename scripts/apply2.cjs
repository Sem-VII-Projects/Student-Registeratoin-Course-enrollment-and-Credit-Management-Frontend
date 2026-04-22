const fs = require('fs');

const code = `import React, { useState } from 'react';
import AdminDashboard from './AdminDashboard';
import AdminDashboard_Friend from './AdminDashboard_Friend';

export default function IntegratedAdminPortal({ user, onLogout }: any) {
  const [activeTab, setActiveTab] = useState<'student' | 'course'>('student');

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 font-roboto text-slate-900 transition-colors duration-500 dark:bg-slate-950">
      <div className="flex flex-row items-end px-8 pt-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 z-20 relative">
        <button
          className={\`relative px-8 py-3.5 mr-2 rounded-t-2xl text-sm font-poppins font-medium transition-all duration-300 \${activeTab === 'student' ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 border border-b-0 border-slate-200 dark:border-slate-800 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)] z-10' : 'bg-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:-translate-y-0.5 active:scale-[0.98] border border-transparent border-b-0'}\`}
          onClick={() => setActiveTab('student')}
        >
          {activeTab === 'student' && (
            <span className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-white dark:bg-slate-900" />
          )}
          Student Registration
        </button>

        <button
          className={\`relative px-8 py-3.5 mr-2 rounded-t-2xl text-sm font-poppins font-medium transition-all duration-300 \${activeTab === 'course' ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 border border-b-0 border-slate-200 dark:border-slate-800 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)] z-10' : 'bg-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:-translate-y-0.5 active:scale-[0.98] border border-transparent border-b-0'}\`}
          onClick={() => setActiveTab('course')}
        >
          {activeTab === 'course' && (
            <span className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-white dark:bg-slate-900" />
          )}
          Course Enrollment and Credit Management
        </button>
      </div>

      <div className="flex-1 relative z-10 bg-white dark:bg-slate-900 flex flex-col overflow-auto animate-in fade-in duration-500">
        {activeTab === 'student' && (
          <div className="flex-1 w-full h-full animate-in fade-in duration-500 slide-in-from-bottom-2">
            <AdminDashboard_Friend user={user} onLogout={onLogout} />
          </div>
        )}
        {activeTab === 'course' && (
          <iframe
            src="/#/login"
            className="flex-1 w-full h-full border-none bg-white dark:bg-slate-900 animate-in fade-in duration-500 slide-in-from-bottom-2"
            title="Course Enrollment System"
          />
        )}
      </div>
    </div>
  );
}
`;

fs.writeFileSync('Frontend/pages/IntegratedAdminPortal.tsx', code);
console.log('Fixed TSX formatting.');