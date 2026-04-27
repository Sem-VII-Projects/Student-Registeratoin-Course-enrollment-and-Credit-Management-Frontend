import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { supabase } from '../supabase/supabaseClient';
import { persistStudentSession } from '../utils/studentStorage';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import {
  decidePostLoginRoute,
  detectStudentDetailsRecord,
  deriveAcademicProgress
} from '../utils/postLoginRouting';

function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
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
    const emailInput = (formData.email || '').trim();
    const usernameInput = (formData.username || '').trim();
    const passwordInput = formData.password || '';
    
    if (!emailInput || !passwordInput) {
      alert(t('enterEmailAndPassword'));
      return;
    }

    setLoading(true);

    try {
      const pendingRaw = localStorage.getItem('pendingRegistrationPayload');
      const pendingEmail = localStorage.getItem('pendingRegistrationEmail');
      const isPendingCompletion = Boolean(pendingRaw) && !usernameInput;

      if (isPendingCompletion) {
        const pendingPayload = JSON.parse(pendingRaw);

        if (pendingEmail && pendingEmail.toLowerCase() !== emailInput.toLowerCase()) {
          throw new Error('Please login with the same email used at registration.');
        }

        const { data: sbPending, error: sbPendingError } = await supabase.auth.signInWithPassword({
          email: emailInput,
          password: passwordInput
        });

        if (sbPendingError) throw sbPendingError;

        const pendingToken = sbPending?.session?.access_token;
        const pendingTokenEmail = sbPending?.user?.email || sbPending?.session?.user?.email || '';
        if (!pendingToken) throw new Error('Supabase access token not found');
        if (pendingPayload?.email && pendingTokenEmail.toLowerCase() !== pendingPayload.email.toLowerCase()) {
          throw new Error('Authenticated email does not match pending registration email.');
        }

        localStorage.setItem('authToken', pendingToken);
        await api.registerStudent(pendingPayload);
        localStorage.removeItem('pendingRegistrationPayload');
        localStorage.removeItem('pendingRegistrationEmail');

        alert('Registration completed. Admin review is pending.');
        navigate('/');
        return;
      }

      if (!usernameInput) {
        throw new Error('Username is required for admin-approved login.');
      }

      const result = await api.loginStudent({
        email: emailInput,
        username: usernameInput,
        password: passwordInput
      });

      const backendToken = result?.token;
      const data = result?.student || result;
      if (!data) {
        alert('❌ Username မတွေ့ပါ!\n\nအက်ဒမင်မှ အတည်ပြုပြီး Username ပို့ပေးပါက သာ Login ဝင်နိုင်ပါမည်။');
        setLoading(false);
        return;
      }

      // Hydrate with 'register' role as requested
      const userWithRegisterRole = { ...data, role: 'register' };

      if (backendToken) {
        localStorage.setItem('authToken', backendToken);
        localStorage.setItem('access_token', backendToken);
      }

      // Login successful!
      alert(`✅ ကြိုဆိုပါတယ် ${data.namemm || data.student_name || 'Student'}!`);
      
      // Save student info to localStorage with the register role
      persistStudentSession(userWithRegisterRole);
      
      // Update global app state
      if (onLogin) onLogin(userWithRegisterRole);

      // Navigate directly to registration details
      navigate('/registration-details', { replace: true });

    } catch (error) {
      console.error('Login error:', error);
      alert('❌ Login မအောင်မြင်ပါ။\n\n' + error.message);
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
            <span className="material-icons-outlined text-4xl text-teal-600 dark:text-teal-400">login</span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-2">{t('studentLogin')}</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium tracking-wide">{t('studentLoginSubtitle')}</p>
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
                placeholder="your-email@example.com"
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-['Inter']"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">{t('username')}</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-icons-outlined text-slate-400 text-[18px]">badge</span>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="ex. b10-paingphyothu"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-['Inter']"
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 font-['Inter'] leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="material-icons-outlined text-[14px] inline align-text-bottom mr-1 text-amber-500">info</span>
              {t('usernameHint')}
            </p>
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
                placeholder="Password ထည့်ပါ"
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-['Inter']"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <button 
              type="button" 
              onClick={() => navigate('/')}
              className="inline-flex items-center justify-center flex-1 gap-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 sm:px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300 transition-all hover:bg-slate-50 hover:shadow-md active:scale-[0.98]"
            >
              <span className="material-icons-outlined text-[18px]">arrow_back</span>
              {t('backButton')}
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="inline-flex items-center justify-center flex-1 gap-2 rounded-2xl bg-teal-600 px-2 sm:px-6 py-4 text-sm font-bold text-white transition-all hover:bg-teal-500 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <span className="material-icons-outlined text-[18px] animate-spin">autorenew</span>
                  {t('loginLoading')}
                </>
              ) : (
                <>
                  {t('loginButton')}
                  <span className="material-icons-outlined text-[18px]">login</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center relative z-10">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">{t('newAccountQuestion')}</p>
          <button 
            type="button"
            onClick={() => navigate('/register')}
            className="inline-flex items-center justify-center gap-2 text-teal-600 dark:text-teal-400 font-bold hover:text-teal-700 hover:underline transition-all"
          >
            <span className="material-icons-outlined text-[18px]">person_add</span>
            {t('registerNow')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
