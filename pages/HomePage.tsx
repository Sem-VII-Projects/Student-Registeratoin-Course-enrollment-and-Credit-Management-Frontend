import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

function HomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col font-['Poppins',sans-serif] bg-white dark:bg-slate-950 transition-colors duration-500">
      {/* Header Section */}
      <header className="px-8 lg:px-12 py-6 border-b border-transparent dark:border-slate-900">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <h1 className="m-0 text-2xl font-black text-teal-600 tracking-tight flex items-center gap-2">
              {t('UniPortal')}
            </h1>
            <div className="flex flex-col border-l border-slate-200 dark:border-slate-800 pl-4">
              <h2 className="m-0 text-sm font-bold text-slate-800 dark:text-slate-200">
                {t('University of Information Technology Myanmar')}
              </h2>
              <span className="text-[10px] font-black tracking-[0.2em] text-slate-400 dark:text-slate-500 uppercase">
                {t('University of Information Technology')}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <button 
                className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors px-4 py-2"
                onClick={() => navigate('/admin-login')}
              >
                {t('Admin Access')}
              </button>
              <button 
                className="inline-flex items-center justify-center rounded-2xl bg-teal-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-teal-500 shadow-sm hover:shadow-md"
                onClick={() => navigate('/student-login')}
              >
                {t('Sign In')}
              </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-8 lg:px-12 pb-16 animate-in fade-in duration-700 slide-in-from-bottom-4 relative z-10">
        <div className="flex flex-col justify-start mb-12 gap-8 max-w-[800px] mt-8">
          <div className="space-y-4">
            <h3 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {t('homepageTitle')}
            </h3>
            <p className="text-lg font-medium text-slate-400 dark:text-slate-500">
              {t('home.description')}
            </p>
          </div>
          
          {/* Notification Badge - Dashboard alert style */}
          <div className="inline-flex items-center gap-4 p-4 pr-6 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100/50 dark:border-amber-900/20 self-start shadow-sm">
            <div className="p-2 bg-amber-100/50 dark:bg-amber-900/30 rounded-xl text-amber-500 dark:text-amber-400">
              <span className="material-icons-outlined text-xl">event_available</span>
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900 dark:text-amber-200 leading-relaxed m-0">
                {t('homepageRegPeriod')}
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600/80 dark:text-amber-500 mt-1 m-0">
                {t('homepageRegPeriodSub')}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 mt-4">
            <button 
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-8 py-4 text-sm font-bold text-white transition-all hover:bg-teal-500 hover:shadow-lg hover:-translate-y-0.5 min-w-[240px]"
              onClick={() => navigate('/register')}
            >
              {t('homepageRegister')} <span className="material-icons-outlined text-sm ml-1">arrow_forward</span>
            </button>

            <button 
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-8 py-4 text-sm font-bold text-slate-700 dark:text-slate-300 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5 min-w-[240px]"
              onClick={() => navigate('/student-login')}
            >
              {t('homepageStudentLogin')}
            </button>
          </div>
        </div>

        {/* Info Cards (Dashboard Style) */}
        <div className="grid grid-cols-1 md:grid-cols-3 items-stretch gap-6 lg:gap-8 mt-16">
          <div className="bg-white dark:bg-slate-900 p-7 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden flex flex-col justify-between min-h-[220px]">
            <div className="absolute top-0 right-0 h-24 w-24 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-bl-full transform translate-x-4 -translate-y-4 transition-transform group-hover:scale-110" />
            <div className="flex justify-between items-start mb-5 relative z-10">
              <div className="pr-4">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">{t('homepageCapacity')}</p>
                <h5 className="m-0 text-lg font-black text-slate-800 dark:text-slate-200 tracking-tight leading-tight">{t('homepageCapacityValue')}</h5>
              </div>
              <div className="shrink-0 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30 transition-colors group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 group-hover:border-indigo-200 dark:group-hover:border-indigo-900/50">
                <span className="material-icons-outlined text-2xl">people_alt</span>
              </div>
            </div>
            <div className="relative z-10 mt-auto grid grid-cols-[auto_minmax(0,1fr)] items-end gap-6">
              <div className="min-w-0">
                <p className="mt-1 text-4xl font-black text-slate-900 dark:text-white">
                  200<span className="ml-2 text-sm font-bold text-slate-400 dark:text-slate-500">{t('homeStudents')}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-7 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden flex flex-col justify-between min-h-[220px]">
            <div className="absolute top-0 right-0 h-24 w-24 bg-orange-500/5 dark:bg-orange-500/10 rounded-bl-full transform translate-x-4 -translate-y-4 transition-transform group-hover:scale-110" />
            <div className="flex justify-between items-start mb-5 relative z-10">
              <div className="pr-4">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">{t('homepageDuration')}</p>
                <h5 className="m-0 text-lg font-black text-slate-800 dark:text-slate-200 tracking-tight leading-tight">{t('homepageDurationValue')}</h5>
              </div>
              <div className="shrink-0 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl text-orange-500 dark:text-orange-400 border border-orange-100/50 dark:border-orange-900/30 transition-colors group-hover:bg-orange-100 dark:group-hover:bg-orange-900/40 group-hover:border-orange-200 dark:group-hover:border-orange-900/50">
                <span className="material-icons-outlined text-2xl">auto_awesome_mosaic</span>
              </div>
            </div>
            <div className="relative z-10 mt-auto grid grid-cols-[auto_minmax(0,1fr)] items-end gap-6">
              <div className="min-w-0">
                <p className="mt-1 text-4xl font-black text-slate-900 dark:text-white">
                  5<span className="ml-2 text-sm font-bold text-slate-400 dark:text-slate-500">{t('homeYears')}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-7 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden flex flex-col justify-between min-h-[220px]">
            <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-bl-full transform translate-x-4 -translate-y-4 transition-transform group-hover:scale-110" />
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="pr-4">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">{t('homepageCurriculum')}</p>
                <h5 className="m-0 text-lg font-black text-slate-800 dark:text-slate-200 tracking-tight leading-tight">{t('homepageCurriculumValue')}</h5>
              </div>
              <div className="shrink-0 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30 transition-colors group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 group-hover:border-emerald-200 dark:group-hover:border-emerald-900/50">
                <span className="material-icons-outlined text-2xl">library_books</span>
              </div>
            </div>
            <div className="relative z-10 mt-auto">
              <div className="inline-flex w-full items-center gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800 px-4 py-3 border border-slate-100 dark:border-slate-700">
                <p className="m-0 text-xs font-black text-slate-600 dark:text-slate-400 tracking-widest leading-relaxed">
                  {t('homeCourses')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-auto px-8 lg:px-12 py-8 border-t border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950 transition-colors text-center relative z-10">
        <p className="m-0 text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wide">{t('home.copyright')}</p>
      </footer>

      {/* Background Decorations */}
      <div className="fixed top-0 right-0 -z-0 w-[600px] h-[600px] bg-teal-500/[0.03] dark:bg-teal-500/[0.02] rounded-full blur-[120px] pointer-events-none translate-x-1/2 -translate-y-1/2" />
      <div className="fixed bottom-0 left-0 -z-0 w-[500px] h-[500px] bg-indigo-500/[0.03] dark:bg-indigo-500/[0.02] rounded-full blur-[100px] pointer-events-none -translate-x-1/2 translate-y-1/2" />
    </div>
  );
}

export default HomePage;
