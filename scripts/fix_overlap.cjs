const fs = require('fs');
let code = fs.readFileSync('pages/AdminGrading.tsx', 'utf8');

code = code.replace(
  /className="px-3 py-1 rounded-xl bg-slate-50 dark:bg-slate-950 text-\[10px\] font-black text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800 uppercase tracking-\[0.2em\]"/g,
  'className="whitespace-nowrap inline-block w-full text-center px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 text-[10px] font-black text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800 uppercase tracking-[0.2em]"'
);

code = code.replace(
  /className="px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-900\/20 text-\[10px\] font-black text-indigo-500 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800\/50 uppercase tracking-\[0.2em\]"/g,
  'className="whitespace-nowrap inline-block w-full text-center px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-[10px] font-black text-indigo-500 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50 uppercase tracking-[0.2em]"'
);

fs.writeFileSync('pages/AdminGrading.tsx', code);
