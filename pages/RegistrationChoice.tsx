import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { 
  detectStudentDetailsRecord, 
  deriveAcademicProgress, 
  decidePostLoginRoute 
} from '../src/utils/postLoginRouting';
import { DetailedCardGridSkeleton, Skeleton } from '../components/Skeleton';

interface RegistrationChoiceProps {
  user: any;
  onLogout: () => void;
}

const RegistrationChoice: React.FC<RegistrationChoiceProps> = ({ user, onLogout }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState<any>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        let startRoutePayload = null;
        try {
          startRoutePayload = await api.getStudentStartRoute();
        } catch (e) {
          console.warn("Could not fetch start route", e);
        }

        const studentDetails = await detectStudentDetailsRecord(api, user);
        const academicProgress = deriveAcademicProgress(startRoutePayload);
        const postLoginDecision = decidePostLoginRoute(user, studentDetails, academicProgress);

        if (postLoginDecision.type === 'REDIRECT') {
          navigate(postLoginDecision.path, { replace: true });
        } else {
          setDecision(postLoginDecision);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error in registration choice:", error);
        setLoading(false);
      }
    };

    checkStatus();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <Skeleton className="h-12 w-3/4 mx-auto rounded-2xl" />
          <DetailedCardGridSkeleton count={2} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] p-4 flex items-center justify-center font-['Poppins']">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-40 bg-teal-500/5 rounded-bl-full transform translate-x-8 -translate-y-8"></div>
        
        <div className="relative z-10 text-center mb-12">
          <div className="w-20 h-20 rounded-full flex items-center justify-center bg-teal-100 dark:bg-teal-900/30 mb-6 mx-auto border border-teal-200 dark:border-teal-800/50 shadow-sm">
            <span className="material-icons-outlined text-5xl text-teal-600 dark:text-teal-400">how_to_reg</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-4">
            Welcome, {user.namemm || user.student_name}!
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg font-medium max-w-lg mx-auto">
            Please choose your next step to continue with the university process.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
          {decision?.options?.map((option: any, idx: number) => (
            <button
              key={idx}
              disabled={option.disabled}
              onClick={() => navigate(option.path)}
              className={`group flex flex-col items-center p-8 rounded-[24px] border-2 transition-all duration-300 text-center relative
                ${option.disabled 
                  ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 opacity-60 cursor-not-allowed'
                  : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-teal-500 hover:shadow-2xl hover:-translate-y-2'
                }`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors
                ${option.disabled ? 'bg-slate-200 dark:bg-slate-700' : 'bg-teal-50 dark:bg-teal-900/20 group-hover:bg-teal-500 group-hover:text-white'}
              `}>
                <span className={`material-icons-outlined text-3xl ${option.disabled ? 'text-slate-400' : 'text-teal-600 dark:text-teal-400 group-hover:text-white'}`}>
                  {option.label.includes('Enroll') ? 'school' : 'person_outline'}
                </span>
              </div>
              <h3 className={`text-xl font-bold mb-2 ${option.disabled ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                {option.label}
              </h3>
              {option.disabled && option.reason && (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium px-2">
                  {option.reason}
                </p>
              )}
            </button>
          ))}
        </div>

        <div className="mt-12 text-center relative z-10 pt-8 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onLogout}
            className="text-slate-400 hover:text-rose-500 font-bold flex items-center gap-2 mx-auto transition-colors"
          >
            <span className="material-icons-outlined">logout</span>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegistrationChoice;
