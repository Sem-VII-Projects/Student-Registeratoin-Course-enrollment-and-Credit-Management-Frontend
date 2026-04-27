import React, { useState, useEffect, useRef, useCallback, useId } from 'react';

interface CustomSelectProps {
  id?: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export default function CustomSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  className = "",
  disabled = false,
  required = false
}: CustomSelectProps) {
  const generatedId = useId();
  const baseId = id || generatedId.replace(/:/g, '');
  const listboxId = `${baseId}-listbox`;
  const triggerId = `${baseId}-trigger`;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selectedIndex = options.findIndex(o => o.value === value);

  const handleOpen = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    const initialIndex = selectedIndex >= 0 ? selectedIndex : 0;
    setActiveIndex(initialIndex);
  }, [selectedIndex, disabled]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open && activeIndex >= 0 && optionRefs.current[activeIndex]) {
      optionRefs.current[activeIndex]?.focus();
    }
  }, [open, activeIndex]);

  const handleSelect = useCallback((optValue: string) => {
    onChange(optValue);
    setOpen(false);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleOpen();
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex(prev => {
          const next = prev < options.length - 1 ? prev + 1 : prev;
          optionRefs.current[next]?.focus();
          return next;
        });
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex(prev => {
          const next = prev > 0 ? prev - 1 : prev;
          optionRefs.current[next]?.focus();
          return next;
        });
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (activeIndex >= 0 && options[activeIndex]) {
          handleSelect(options[activeIndex].value);
        }
        break;
    }
  }, [open, activeIndex, options, handleOpen, handleSelect, disabled]);

  const selectedTitle = options.find(o => o.value === value)?.label || placeholder || "Select...";
  const activeDescendant = activeIndex >= 0 ? `${baseId}-option-${options[activeIndex]?.value}` : undefined;

  return (
    <div className={`relative group ${className}`} ref={containerRef}>
<button
      type="button"
      id={triggerId}
      role="combobox"
      aria-expanded={open}
      aria-haspopup="listbox"
      aria-controls={listboxId}
      aria-activedescendant={open ? activeDescendant : undefined}
      aria-disabled={disabled}
      disabled={disabled}
      required={required}
      onClick={() => !disabled && (open ? setOpen(false) : handleOpen())}
      onKeyDown={handleKeyDown}
      className={`flex items-center justify-between gap-2 w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 py-3 pl-4 pr-4 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-teal-500/10 transition-all shadow-sm ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
        <span className="truncate">{selectedTitle}</span>
        <span className="material-icons-outlined text-[18px] text-slate-400 group-hover:text-teal-500 transition-colors shrink-0">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Select an option"
          className="absolute top-full left-0 mt-1 min-w-full w-max max-h-64 overflow-y-auto border border-slate-700 bg-white shadow-xl z-50 py-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full"
        >
          {options.map((opt, index) => {
            const isSelected = value === opt.value;
            const isActive = activeIndex === index;
            return (
              <button
                type="button"
                key={opt.value}
                id={`${baseId}-option-${opt.value}`}
                role="option"
                aria-selected={isSelected}
                ref={el => { optionRefs.current[index] = el; }}
                tabIndex={isActive ? 0 : -1}
                onClick={() => !disabled && handleSelect(opt.value)}
                className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center justify-between gap-3 ${
                  isSelected
                  ? "bg-[#1864D9] text-white"
                  : "text-slate-800 hover:bg-[#F0F5FA] hover:text-[#1864D9] bg-white"
                } ${isActive ? 'ring-2 ring-teal-500 ring-inset' : ''}`}
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
