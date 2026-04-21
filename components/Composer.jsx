import React, { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import FormDataC from "./form_data_C";
import { api } from '../lib/api';

// Utility to match project style
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function IconBadge({ icon, tone = "primary" }) {
  const tones = {
    primary: "bg-teal-100 text-teal-700 dark:bg-teal-900/35 dark:text-teal-300",
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/35 dark:text-amber-300",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-900/35 dark:text-rose-300",
    cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/35 dark:text-cyan-300",
    indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/35 dark:text-indigo-300",
  };
  return (
    <div className={cn("grid h-12 w-12 place-items-center rounded-2xl", tones[tone])}>
      <span className="material-icons-outlined text-[24px]">{icon}</span>
    </div>
  );
}

const toLocalInputValue = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const fromLocalInputValueToIso = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
};

const minutesFromNow = (minutes) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + minutes);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const Composer_C = () => {
    const { t } = useTranslation();
    const [windowSettings, setWindowSettings] = useState({
        isOpen: true,
        registrationDeadline: "",
        detailsDeadline: "",
        paymentDeadline: "",
        allowEditAfterSubmit: true,
    });
    const [savingWindow, setSavingWindow] = useState(false);

    useEffect(() => {
        let isMounted = true;
        api.getRegistrationWindowSettings()
            .then((data) => {
                if (!isMounted || !data) return;
                setWindowSettings({
                    isOpen: data.isOpen ?? true,
                    registrationDeadline: toLocalInputValue(data.registrationDeadline),
                    detailsDeadline: toLocalInputValue(data.detailsDeadline),
                    paymentDeadline: toLocalInputValue(data.paymentDeadline),
                    allowEditAfterSubmit: data.allowEditAfterSubmit ?? true,
                });
            })
            .catch(() => {});
        return () => { isMounted = false; };
    }, []);

    const handleWindowChange = (e) => {
        const { name, type, checked, value } = e.target;
        setWindowSettings((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const setDeadlineFromNow = (field, minutes) => {
        setWindowSettings((prev) => ({
            ...prev,
            [field]: minutesFromNow(minutes),
        }));
    };

    const handleSaveWindow = async () => {
        setSavingWindow(true);
        try {
            const payload = {
                isOpen: !!windowSettings.isOpen,
                registrationDeadline: fromLocalInputValueToIso(windowSettings.registrationDeadline),
                detailsDeadline: fromLocalInputValueToIso(windowSettings.detailsDeadline),
                paymentDeadline: fromLocalInputValueToIso(windowSettings.paymentDeadline),
                allowEditAfterSubmit: !!windowSettings.allowEditAfterSubmit,
            };
            const reg = payload.registrationDeadline ? new Date(payload.registrationDeadline).getTime() : null;
            const det = payload.detailsDeadline ? new Date(payload.detailsDeadline).getTime() : null;
            const pay = payload.paymentDeadline ? new Date(payload.paymentDeadline).getTime() : null;
            
            if (reg && det && reg > det) {
                alert("Registration deadline must be before or equal to details deadline.");
                setSavingWindow(false);
                return;
            }
            if (det && pay && det > pay) {
                alert("Details deadline must be before or equal to payment deadline.");
                setSavingWindow(false);
                return;
            }

            const updated = await api.updateRegistrationWindowSettings(payload);
            setWindowSettings({
                isOpen: updated.isOpen ?? true,
                registrationDeadline: toLocalInputValue(updated.registrationDeadline),
                detailsDeadline: toLocalInputValue(updated.detailsDeadline),
                paymentDeadline: toLocalInputValue(updated.paymentDeadline),
                allowEditAfterSubmit: updated.allowEditAfterSubmit ?? true,
            });
            alert("Registration window settings saved.");
        } catch (error) {
            alert(error?.message || "Failed to save registration window settings.");
        } finally {
            setSavingWindow(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Window Control Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[40px] p-7 shadow-sm relative overflow-hidden group">
                <div className="relative z-10">
                    <div className="flex items-center gap-6 mb-5">
                        <IconBadge icon="timer" tone="primary" />
                        <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{t("Registration Window Control")}</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{t("Manage intake accessibility and deadlines")}</p>
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 mb-6 flex items-center gap-4">
                        <div className="h-8 w-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-600 shrink-0">
                            <span className="material-icons-outlined text-lg">rocket_launch</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider">{t("Demo Mode")}</p>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t("Quick-set deadlines to test system behavior.")}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Switches */}
                        <div className="space-y-3">
                            <label className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 cursor-pointer transition-all hover:border-teal-500/30">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t("General Access")}</span>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t("Registration Open")}</span>
                                </div>
                                <input
                                    type="checkbox"
                                    name="isOpen"
                                    className="w-5 h-5 accent-teal-600 rounded-lg"
                                    checked={windowSettings.isOpen}
                                    onChange={handleWindowChange}
                                />
                            </label>
                            
                            <label className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 cursor-pointer transition-all hover:border-teal-500/30">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t("Submission Policy")}</span>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t("Allow Edits")}</span>
                            </div>
                            <input
                                type="checkbox"
                                name="allowEditAfterSubmit"
                                className="w-5 h-5 accent-teal-600 rounded-lg"
                                checked={windowSettings.allowEditAfterSubmit}
                                onChange={handleWindowChange}
                            />
                            </label>
                            </div>

                            {/* Deadlines */}
                            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                            {[
                            { id: "registrationDeadline", label: t("Registration Deadline") },
                            { id: "detailsDeadline", label: t("Details Submission") },
                            { id: "paymentDeadline", label: t("Payment Deadline") }
                            ].map((field) => (
                            <div key={field.id} className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{field.label}</label>
                                <input
                                    type="datetime-local"
                                    name={field.id}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:border-teal-500/50 transition-all text-slate-700 dark:text-slate-200"
                                    value={windowSettings[field.id]}
                                    onChange={handleWindowChange}
                                />
                                <div className="flex flex-wrap gap-1.5 pt-0.5">
                                    {[2, 5, 10, 30, 60].map((m) => (
                                        <button 
                                            key={m} 
                                            type="button" 
                                            onClick={() => setDeadlineFromNow(field.id, m)}
                                            className="px-2 py-1 text-[8px] font-black uppercase tracking-widest rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-teal-600 hover:border-teal-500/30 transition-all active:scale-95"
                                        >
                                            {m < 60 ? `${m}m` : "1h"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            ))}
                            </div>
                            </div>

                            <div className="mt-6 flex justify-end pt-6 border-t border-slate-50 dark:border-slate-800">
                            <button
                            type="button"
                            onClick={handleSaveWindow}
                            disabled={savingWindow}
                            className="px-8 py-3.5 bg-slate-900 dark:bg-teal-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:shadow-teal-500/20 active:scale-95 disabled:opacity-50 transition-all"
                            >
                            {savingWindow ? t("Syncing...") : t("Save Window Settings")}
                            </button>
                            </div>
                            </div>
                            <div className="absolute top-0 right-0 h-32 w-32 bg-teal-500/5 rounded-bl-full transform translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform" />
                            </div>

                            {/* Config Section */}
                            <div className="bg-slate-50 dark:bg-slate-950/40 rounded-[40px] p-0.5 border border-slate-100 dark:border-slate-800">
                            <div className="p-7">
                            <div className="flex items-center gap-5 mb-6">
                            <IconBadge icon="settings" tone="indigo" />
                            <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{t("Configure Registration")}</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{t("Academic tiers, majors, and fee structures")}</p>
                            </div>
                            </div>

                    <FormDataC />
                </div>
            </div>
        </div>
    );
};

export default Composer_C;
