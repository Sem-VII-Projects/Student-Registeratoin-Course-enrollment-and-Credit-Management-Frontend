import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User } from '../types';
import { useUI } from '../context/UIContext';

interface SidebarProps {
  user: User;
  onLogout: () => void;
}

interface SidebarLink {
  to: string;
  icon: string;
  label: string;
  section?: string;
  badge?: string;
  iconColor?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout }) => {
  const { t } = useTranslation();
  const { isSidebarOpen, closeSidebar } = useUI();
  const isAdmin = user.role === 'admin';

  const adminLinks: SidebarLink[] = [
    { to: '/admin/dashboard', icon: 'dashboard', label: t('Dashboard') },
    { to: '/admin/enrollment', icon: 'group_add', label: t('Enrollment'), section: t('Student Management') },
    { to: '/admin/students', icon: 'school', label: t('Students List') },
    { to: '/admin/messages', icon: 'mail', label: t('Messages') },
    { to: '/admin/courses', icon: 'library_books', label: t('Courses'), section: t('Academic') },
    { to: '/admin/announcements', icon: 'campaign', label: t('Announcements') },
    { to: '/admin/grading', icon: 'assessment', label: t('Exam Results') },
    { to: '/admin/chatbot', icon: 'smart_toy', label: t('AI Assistant'), section: t('System'), badge: 'AI' },
  ];

  const studentLinks: SidebarLink[] = [
    { to: '/student/dashboard', icon: 'dashboard', label: t('Dashboard') },
    { to: '/student/courses', icon: 'class', label: t('My Courses'), section: t('Academics') },
    { to: '/student/enrollment', icon: 'app_registration', label: t('Course Enrollment') },
    { to: '/student/results', icon: 'assignment_turned_in', label: t('Review Results') },
    { to: '/student/messages', icon: 'mail', label: t('Messages') },
  ];

  const links = isAdmin ? adminLinks : studentLinks;

  return (
    <>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity md:hidden"
          onClick={closeSidebar}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-72 transform overflow-y-auto border-r border-slate-100 bg-white dark:bg-slate-950 dark:border-slate-800 transition-transform duration-500 ease-in-out md:relative md:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } flex flex-col flex-shrink-0 scrollbar-hide`}>
        <div className="flex h-20 items-center justify-between px-8">
          <span className="text-2xl font-black tracking-tighter text-teal-600">
            Uni<span className="text-slate-900 dark:text-white font-black">{isAdmin ? 'Admin' : 'Portal'}</span>
          </span>
          <button 
            onClick={closeSidebar}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all md:hidden"
          >
            <span className="material-icons-outlined">close</span>
          </button>
        </div>
        
        <div className="px-4 py-8 flex-1">
          <nav className="space-y-1.5">
            {links.map((link, idx) => (
              <React.Fragment key={idx}>
                {link.section && (
                  <div className="pt-8 pb-3 px-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                      {link.section}
                    </p>
                  </div>
                )}
                <NavLink
                  to={link.to}
                  onClick={() => { if (window.innerWidth < 768) closeSidebar(); }}
                  className={({ isActive }) => 
                    `group flex items-center rounded-2xl px-4 py-3 transition-all duration-300 ${
                      isActive 
                        ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 dark:bg-teal-600 dark:shadow-teal-900/20' 
                        : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
                    }`
                  }
                >
                  <span className={`material-icons-outlined text-[22px] mr-4 transition-transform group-hover:scale-110 duration-300 ${link.iconColor || ''}`}>
                    {link.icon}
                  </span>
                  <span className="text-sm font-bold tracking-tight">{link.label}</span>
                  {link.badge && (
                    <span className="ml-auto rounded-lg bg-teal-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-teal-600 dark:bg-teal-950 dark:text-teal-400 border border-teal-100 dark:border-teal-900">
                      {link.badge}
                    </span>
                  )}
                </NavLink>
              </React.Fragment>
            ))}
          </nav>
        </div>

        <div className="p-6 mt-auto">
          <div className="rounded-[32px] bg-slate-50 dark:bg-slate-900/50 p-5 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center mb-6 px-1">
              <div className="overflow-hidden">
                <p className="text-sm font-black text-slate-900 dark:text-white truncate tracking-tight">{user.role === 'admin' ? 'Admin' : user.name}</p>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate">{user.department}</p>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-100 dark:border-slate-800 transition-all text-xs font-black uppercase tracking-widest active:scale-[0.98] shadow-sm hover:shadow-md"
            >
              <span className="material-icons-round text-sm">logout</span>
              <span>{t('Secure Sign Out')}</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
