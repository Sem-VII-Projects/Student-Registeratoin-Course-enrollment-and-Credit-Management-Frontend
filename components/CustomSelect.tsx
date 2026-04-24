import React, { useState, useEffect, useRef } from 'react';

export default function CustomSelect({ 
  value, 
  onChange, 
  options, 
  placeholder,
  className = ""
}: { 
  value: string, 
  onChange: (val: string) => void, 
  options: {value: string, label: string}[], 
  placeholder?: string,
  className?: string
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedTitle = options.find(o => o.value === value)?.label || placeholder || "Select...";

  return (
    <div className={`relative group ${className}`} ref={ref}>
      <button 
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-between gap-2 w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 py-3 pl-4 pr-4 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-teal-500/10 transition-all cursor-pointer shadow-sm`}
      >
        <span className="truncate">{selectedTitle}</span>
        <span className="material-icons-outlined text-[18px] text-slate-400 group-hover:text-teal-500 transition-colors shrink-0">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      
      {open && (
        <div className="absolute top-full left-0 mt-1 min-w-full w-max max-h-64 overflow-y-auto border border-slate-700 bg-white shadow-xl z-50 py-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full">
          {options.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center justify-between gap-3 ${
                  isSelected
                    ? "bg-[#1864D9] text-white"
                    : "text-slate-800 hover:bg-[#F0F5FA] hover:text-[#1864D9] bg-white"
                }`}
              >
                <span className="truncate">{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
