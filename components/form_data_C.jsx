import React, { useState, useEffect } from "react";
import OptionsEditorC from "./OptionsEditor_C";
import { api } from '../lib/api';
import "./componentstyle/form_data_C.css";

const STORAGE_KEY = "registration_form_data";
const DEFAULT_MAJOR_CAPACITY = 100;

const normalizeMajorLabel = (value) => String(value || "").trim();

const majorKey = (yearLevel, label) =>
    `${Number(yearLevel) || 0}::${normalizeMajorLabel(label).toUpperCase()}`;

const resolveMajorSelectionStartYearFromConfig = (config) => {
    const yearlyConfig = Array.isArray(config?.yearlyConfig) ? config.yearlyConfig : [];
    const yearsWithMajors = yearlyConfig
        .filter((entry) => Array.isArray(entry?.majors)
            && entry.majors.some((major) => normalizeMajorLabel(major) !== ""))
        .map((entry) => Number(entry?.yearLevel || 0))
        .filter((year) => Number.isFinite(year) && year > 0)
        .sort((a, b) => a - b);
    if (yearsWithMajors.length > 0) {
        return yearsWithMajors[0];
    }
    const totalYears = Number(config?.header?.totalYears || 0);
    const safeTotalYears = Number.isFinite(totalYears) && totalYears > 0 ? totalYears : 3;
    // No majors configured: keep all years in foundation mode.
    return safeTotalYears + 1;
};

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
    <div className={cn("grid h-10 w-10 place-items-center rounded-xl", tones[tone])}>
      <span className="material-icons-outlined text-[20px]">{icon}</span>
    </div>
  );
}

const FormDataC = ({ initialData, onChange, disabled }) => {
    /**
     * Standardizes the data structure for backend readiness.
     * We separate metadata/global config from the specific yearly data.
     */
    const standardizeData = (input) => {
        const base = (Array.isArray(input) ? input[0] : input) || {};
        
        // Handle migration from old flat structure if necessary
        const header = base.header || {
            id: base.register_id || 1,
            totalYears: base.no_of_years || 0,
            baseFee: base.all_payment || 0
        };

        let yearlyConfig = base.yearlyConfig || base.years?.map(y => ({
            yearLevel: y.year,
            semesters: y.semesters,
            majors: y.majors,
            fee: y.payment_amount
        })) || [];

        // Critical Logic: Clean up old hidden data that exceeds totalYears
        if (yearlyConfig.length > header.totalYears) {
            yearlyConfig = yearlyConfig.slice(0, header.totalYears);
        }

        return {
            header,
            yearlyConfig
        };
    };

    // Main Storage: Array of configurations
    const [history, setHistory] = useState(() => {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                const array = Array.isArray(parsed) ? parsed : [parsed];
                return array.map(item => standardizeData(item));
            } catch (e) {
                console.error("Failed to parse saved data", e);
            }
        }
        if (initialData) {
            const array = Array.isArray(initialData) ? initialData : [initialData];
            return array.map(item => standardizeData(item));
        }
        return [standardizeData(null)];
    });

    // Current active view
    const [data, setData] = useState(() => history[history.length - 1]);

    const [isEditMode, setIsEditMode] = useState(false);
    const [tempData, setTempData] = useState(null);
    const [syncingMajors, setSyncingMajors] = useState(false);

    // Sync with prop if provided and no local storage exists
    useEffect(() => {
        if (initialData && !localStorage.getItem(STORAGE_KEY)) {
            const array = Array.isArray(initialData) ? initialData : [initialData];
            const standardized = array.map(item => standardizeData(item));
            setHistory(standardized);
            setData(standardized[standardized.length - 1]);
        }
    }, [initialData]);

    const handleEditToggle = () => {
        if (!isEditMode) {
            if (disabled) {
                alert("Cannot edit form data during the registration period.");
                return;
            }
            // 3. handleEditToggle (line 100-111) - Clone current data
            setTempData(JSON.parse(JSON.stringify(data)));
        } else {
            // Cancel editing
            setTempData(null);
        }
        setIsEditMode(!isEditMode);
    };

    const handleHistorySelect = (e) => {
        const selectedId = parseInt(e.target.value);
        const selectedConfig = history.find(c => c.header.id === selectedId);
        if (selectedConfig) {
            setTempData(JSON.parse(JSON.stringify(selectedConfig)));
        }
    };

    const handleNoOfYearsChange = (e) => {
        let val = e.target.value;
        if (val.length > 1) val = val.slice(-1);
        const newCount = parseInt(val) || 0;
        let config = [...tempData.yearlyConfig];

        if (newCount > config.length) {
            const diff = newCount - config.length;
            for (let i = 0; i < diff; i++) {
                const yNum = config.length + 1;
                config.push({
                    yearLevel: yNum,
                    semesters: [2 * yNum - 1, 2 * yNum],
                    majors: [],
                    fee: tempData.header.baseFee
                });
            }
        } else if (newCount < config.length) {
            config = config.slice(0, newCount);
        }

        setTempData({ 
            ...tempData, 
            header: { ...tempData.header, totalYears: newCount },
            yearlyConfig: config 
        });
    };

    const handleAllPaymentChange = (e) => {
        const amount = parseInt(e.target.value) || 0;
        const updatedConfig = tempData.yearlyConfig.map(y => ({ ...y, fee: amount }));
        setTempData({ 
            ...tempData, 
            header: { ...tempData.header, baseFee: amount },
            yearlyConfig: updatedConfig 
        });
    };

    const handleYearPaymentChange = (yearLevel, value) => {
        const amount = parseInt(value) || 0;
        const updatedConfig = tempData.yearlyConfig.map(y => 
            y.yearLevel === yearLevel ? { ...y, fee: amount } : y
        );
        setTempData({ ...tempData, yearlyConfig: updatedConfig });
    };

    const handleMajorsChange = (yearLevel, majorsString) => {
        const majorsArray = majorsString.split(",").filter(m => m.trim() !== "");
        const updatedConfig = tempData.yearlyConfig.map(y => 
            y.yearLevel === yearLevel ? { ...y, majors: majorsArray } : y
        );
        setTempData({ ...tempData, yearlyConfig: updatedConfig });
    };

    // 8. Backend API Calls During Save - syncMajorsToBackendCatalog
    const syncMajorsToBackendCatalog = async (finalData) => {
        const term = await api.getCurrentTerm();
        const academicYear = String(term?.academicYear || "").trim();
        const semester = Number(term?.semester || 0);
        if (!academicYear) {
            throw new Error("Current term is missing.");
        }

        const existingRowsRaw = await api.adminListMajorClasses({
            academicYear,
            semester,
            includeInactive: true
        });
        const existingRows = Array.isArray(existingRowsRaw) ? existingRowsRaw : [];
        const existingByKey = new Map();
        existingRows.forEach((row) => {
            const yl = Number(row?.yearLevel || row?.year_level || 0);
            const lbl = normalizeMajorLabel(row?.label || row?.classLabel || "");
            if (yl && lbl) existingByKey.set(majorKey(yl, lbl), row);
        });

        const desiredByKey = new Map();
        finalData.yearlyConfig.forEach((entry) => {
            const yl = Number(entry?.yearLevel || 0);
            if (!yl) return;
            (entry.majors || []).map(normalizeMajorLabel).filter(Boolean).forEach(lbl => {
                const k = majorKey(yl, lbl);
                if (!desiredByKey.has(k)) desiredByKey.set(k, { yearLevel: yl, label: lbl });
            });
        });

        // 8. PUT /api/admin/major-classes
        for (const [key, desired] of desiredByKey.entries()) {
            const existing = existingByKey.get(key);
            const payload = {
                id: existing?.id || existing?.majorClassId || undefined,
                academicYear,
                semester,
                yearLevel: desired.yearLevel,
                classLabel: desired.label,
                courseCode: desired.label,
                courseName: desired.label,
                maxCapacity: Number(existing?.maxCapacity || 40),
                isLocked: Boolean(existing?.isLocked || false),
                isActive: true
            };
            await api.adminUpdateMajorClass(payload);
        }

        // Deactivate removed majors
        for (const [key, existing] of existingByKey.entries()) {
            if (desiredByKey.has(key)) continue;
            const id = existing?.id || existing?.majorClassId;
            if (!id) continue;
            
            // For deactivation, we must pass ALL required fields, not just id
            const payload = {
                id,
                academicYear,
                semester,
                yearLevel: Number(existing?.yearLevel || existing?.year_level || 0),
                classLabel: normalizeMajorLabel(existing?.label || existing?.classLabel || ""),
                courseCode: String(existing?.courseCode || existing?.course_code || ""),
                courseName: String(existing?.courseName || existing?.course_name || ""),
                isActive: false
            };
            await api.adminUpdateMajorClass(payload);
        }
    };

    // 8. PATCH /api/admin/terms/config
    const syncMajorSelectionStartYear = async (finalData) => {
        const majorSelectionStartYear = resolveMajorSelectionStartYearFromConfig(finalData);
        await api.updateAdminTermConfig({ majorSelectionStartYear });
    };

    // 7. handleSave Flow (line 285-341)
    const handleSave = async () => {
        setSyncingMajors(true);
        try {
            // 1. Create new config with new ID
            const maxId = history.reduce((max, item) => Math.max(max, item.header.id), 0);
            const newId = maxId + 1;
            const finalData = {
                header: { ...tempData.header, id: newId, lastUpdated: new Date().toISOString() },
                yearlyConfig: tempData.yearlyConfig
            };

            // 2. Save to localStorage
            const newHistory = [...history, finalData];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
            setHistory(newHistory);
            setData(finalData);

            // 3. Sync majors to backend catalog
            await syncMajorsToBackendCatalog(finalData);

            // 4. Sync major selection start year
            await syncMajorSelectionStartYear(finalData);

            // 5. Notify other components
            window.dispatchEvent(new CustomEvent("registrationConfigUpdated"));

            setIsEditMode(false);
            setTempData(null);
            if (onChange) onChange(finalData);
            alert(`Configuration saved as New Register ID (#${newId}) and synchronized.`);
        } catch (error) {
            alert(`Error during save flow: ${error?.message || "Unknown error"}`);
        } finally {
            setSyncingMajors(false);
        }
    };

    const displayData = isEditMode ? tempData : data;
    const baseVersion = isEditMode && tempData ? history.find(c => c.header.id === tempData.header.id) : null;

    const isModified = () => {
        if (!isEditMode || !tempData || !baseVersion) return false;
        return JSON.stringify(tempData.header) !== JSON.stringify(baseVersion.header) || 
               JSON.stringify(tempData.yearlyConfig) !== JSON.stringify(baseVersion.yearlyConfig);
    };

    const isHeaderModified = (key) => isEditMode && tempData && baseVersion && tempData.header[key] !== baseVersion.header[key];
    const isYearModified = (yearLevel) => isEditMode && tempData && baseVersion && !baseVersion.yearlyConfig.some(y => y.yearLevel === yearLevel);
    const isMajorModified = (yearLevel) => {
        if (!isEditMode || !tempData || !baseVersion) return false;
        const current = tempData.yearlyConfig.find(y => y.yearLevel === yearLevel);
        const original = baseVersion.yearlyConfig.find(y => y.yearLevel === yearLevel);
        return !current || !original || JSON.stringify(original.majors) !== JSON.stringify(current.majors);
    };
    const isFeeModified = (yearLevel) => {
        if (!isEditMode || !tempData || !baseVersion) return false;
        const current = tempData.yearlyConfig.find(y => y.yearLevel === yearLevel);
        const original = baseVersion.yearlyConfig.find(y => y.yearLevel === yearLevel);
        return !current || !original || original.fee !== current.fee;
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Control Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] p-8 shadow-sm relative overflow-hidden group">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <IconBadge icon="assignment" tone="emerald" />
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Form Data Manager</h3>
                            <div className="flex items-center gap-3 mt-1">
                                {isEditMode ? (
                                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Editing Reg ID:</span>
                                        <select 
                                            className="bg-transparent text-[11px] font-black text-emerald-600 outline-none cursor-pointer"
                                            value={tempData.header.id}
                                            onChange={handleHistorySelect}
                                        >
                                            {history.map(item => (
                                                <option key={item.header.id} value={item.header.id}>
                                                    #{item.header.id} {item.header.lastUpdated ? `(${new Date(item.header.lastUpdated).toLocaleDateString()})` : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-900/50">Register ID: #{displayData.header.id}</span>
                                )}
                                {displayData.header.lastUpdated && (
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <span className="material-icons-outlined text-[12px]">schedule</span>
                                        Last Saved: {new Date(displayData.header.lastUpdated).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={handleEditToggle}
                        className={cn(
                            "h-12 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg",
                            isEditMode 
                                ? "bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100" 
                                : "bg-slate-900 text-white dark:bg-emerald-600 shadow-slate-200 dark:shadow-emerald-900/20 hover:shadow-xl"
                        )}
                    >
                        {isEditMode ? "Cancel Editing" : "Modify Configuration"}
                    </button>
                </div>
                <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/5 rounded-bl-full transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform" />
            </div>

            {/* Global Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={cn(
                    "p-6 rounded-[24px] border transition-all",
                    isHeaderModified('totalYears') ? "bg-amber-50/30 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900/30" : "bg-slate-50/50 dark:bg-slate-950 border-slate-100 dark:border-slate-800"
                )}>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Academic Duration</p>
                    {isEditMode ? (
                        <div className="flex items-center gap-4">
                            <input 
                                type="number" 
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 w-24 text-sm font-black text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-all"
                                value={displayData.header.totalYears} 
                                onChange={handleNoOfYearsChange}
                            />
                            <span className="text-xs font-bold text-slate-500 uppercase">Years of Study</span>
                        </div>
                    ) : (
                        <p className="text-xl font-black text-slate-900 dark:text-white">{displayData.header.totalYears} <span className="text-[10px] text-slate-400 uppercase tracking-widest ml-1">Academic Levels</span></p>
                    )}
                </div>
                <div className={cn(
                    "p-6 rounded-[24px] border transition-all",
                    isHeaderModified('baseFee') ? "bg-amber-50/30 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900/30" : "bg-slate-50/50 dark:bg-slate-950 border-slate-100 dark:border-slate-800"
                )}>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Global Fee Structure</p>
                    {isEditMode ? (
                        <div className="flex items-center gap-4">
                            <input 
                                type="number" 
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 w-full text-sm font-black text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-all"
                                value={displayData.header.baseFee} 
                                onChange={handleAllPaymentChange}
                            />
                            <span className="text-xs font-bold text-slate-500 uppercase whitespace-nowrap">MMK (Flat Rate)</span>
                        </div>
                    ) : (
                        <p className="text-xl font-black text-slate-900 dark:text-white">{displayData.header.baseFee.toLocaleString()} <span className="text-[10px] text-slate-400 uppercase tracking-widest ml-1">MMK Per Student</span></p>
                    )}
                </div>
            </div>

            {/* Yearly Configuration Table */}
            <div className="bg-white dark:bg-slate-950/50 rounded-[32px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-slate-900 dark:bg-slate-800 text-white">
                            <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest">Academic Level</th>
                            <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest">Available Majors</th>
                            <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest">Term Fee (MMK)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {displayData.yearlyConfig.length === 0 && (
                            <tr>
                                <td colSpan="3" className="p-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs">No configuration tiers defined</td>
                            </tr>
                        )}
                        {displayData.yearlyConfig.map((y) => (
                            <tr key={y.yearLevel} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-black",
                                            isYearModified(y.yearLevel) ? "bg-amber-500 text-white" : "bg-slate-900 dark:bg-emerald-600 text-white shadow-sm"
                                        )}>Y{y.yearLevel}</div>
                                        <span className="text-sm font-black text-slate-700 dark:text-slate-200">Year {y.yearLevel}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    {isEditMode ? (
                                        <div className={cn("rounded-xl border p-1 transition-all", isMajorModified(y.yearLevel) ? "border-amber-300 bg-amber-50/30" : "border-transparent")}>
                                            <OptionsEditorC 
                                                optionsString={y.majors.join(",")} 
                                                onOptionsChange={(val) => handleMajorsChange(y.yearLevel, val)}
                                                title={y.majors.join(", ") || "Click to add majors..."}
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-1.5">
                                            {y.majors.length > 0 ? y.majors.map((m, mi) => (
                                                <span key={mi} className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-400 group-hover:border-emerald-500/30 transition-all">{m}</span>
                                            )) : <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 italic">Foundation Year Only</span>}
                                        </div>
                                    )}
                                </td>
                                <td className="px-8 py-6 text-right">
                                    {isEditMode ? (
                                        <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all", isFeeModified(y.yearLevel) ? "border-amber-300 bg-amber-50/30" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800")}>
                                            <input 
                                                type="number" 
                                                value={y.fee} 
                                                onChange={(e) => handleYearPaymentChange(y.yearLevel, e.target.value)}
                                                className="bg-transparent text-sm font-black text-slate-900 dark:text-white outline-none w-24 text-right"
                                            />
                                        </div>
                                    ) : (
                                        <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{y.fee.toLocaleString()}</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Persistence Layer */}
            {isEditMode && (
                <div className="flex flex-col items-center gap-4 py-8 animate-in slide-in-from-bottom-2">
                    <button
                        onClick={handleSave}
                        disabled={syncingMajors}
                        className={cn(
                            "px-12 py-5 rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 disabled:opacity-50",
                            isModified() ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20" : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20"
                        )}
                    >
                        {syncingMajors ? "Synchronizing Records..." : (isModified() ? `Authorize New Deployment (#${history.reduce((max, item) => Math.max(max, item.header.id), 0) + 1})` : "Finalize Current Revision")}
                    </button>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Authorization required to push configuration changes to live environment</p>
                </div>
            )}
        </div>
    );
};

export default FormDataC;

