import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';

function AdminLogin() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      alert(t('enterEmailAndPassword'));
      return;
    }

    setLoading(true);

    try {
      // Refresh admin-only auth token while preserving any student session token.
      localStorage.removeItem('adminAuthToken');

      const result = await api.loginAdmin({
        email: formData.email,
        password: formData.password
      });
      const data = result?.admin || result;

      if (!data) {
        alert(t('invalidCredentials'));
        setLoading(false);
        return;
      }

      // Login successful
      alert(t('loginSuccess') + ' ' + (data.adminName || data.fullName || data.name || '') + '!');
      
      // Save admin token and info to localStorage
      if (result?.token) {
        localStorage.setItem('adminAuthToken', result.token);
      }
      localStorage.setItem('adminData', JSON.stringify(data));
      
      // Navigate to admin dashboard
      navigate('/admin/dashboard'); // Adjusted to match your app's actual admin dashboard route

    } catch (error) {
      console.error('Admin login error:', error);
      alert(t('loginFailedAdmin') + '\n\n' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0b1120] p-4 font-['Poppins']">
      <div className="absolute top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-md bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl group relative overflow-hidden animate-in fade-in duration-500 slide-in-from-bottom-2">
        <div className="absolute top-0 right-0 h-32 w-32 bg-teal-500/5 rounded-bl-full transform translate-x-4 -translate-y-4 transition-transform group-hover:scale-110"></div>
        
        <div className="flex flex-col items-center mb-10 relative z-10">
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-teal-100 dark:bg-teal-900/30 mb-6 border border-teal-200 dark:border-teal-800/50 shadow-sm">
            <span className="material-icons-outlined text-4xl text-teal-600 dark:text-teal-400">admin_panel_settings</span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-2">{t('adminLogin')}</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium tracking-wide">{t('adminLoginSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="relative z-10 flex flex-col gap-6">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">{t('email')}</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-icons-outlined text-slate-400 text-[18px]">email</span>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="admin@uit.edu.mm"
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-['Inter']"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">{t('password')}</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-icons-outlined text-slate-400 text-[18px]">lock</span>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-['Inter']"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="inline-flex items-center justify-center w-full gap-2 rounded-2xl bg-teal-600 px-6 py-4 text-sm font-bold text-white transition-all hover:bg-teal-500 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <span className="material-icons-outlined text-[18px] animate-spin">autorenew</span>
                  {t('loginLoading')}
                </>
              ) : (
                <>
                  {t('loginButton')}
                  <span className="material-icons-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>

            <button 
              type="button" 
              onClick={() => navigate('/')}
              className="inline-flex items-center justify-center w-full gap-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300 transition-all hover:bg-slate-50 hover:shadow-sm active:scale-[0.98]"
            >
              <span className="material-icons-outlined text-[18px]">keyboard_backspace</span>
              {t('backToHome')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;
