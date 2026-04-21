import React from 'react';
import { useTranslation } from 'react-i18next';

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };
  
  const isMy = i18n.language.startsWith('my');

  return (
    <div className="flex items-center bg-slate-100 dark:bg-slate-900/50 rounded-xl p-1 border border-slate-200/60 dark:border-slate-800 transition-all">
      <button 
        onClick={() => changeLanguage('en')}
        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${
          !isMy
            ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-700/50' 
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
        }`}
      >
        EN
      </button>
      <button 
        onClick={() => changeLanguage('my')}
        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${
          isMy
            ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-700/50' 
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
        }`}
      >
        မြန်မာ
      </button>
    </div>
  );
};
