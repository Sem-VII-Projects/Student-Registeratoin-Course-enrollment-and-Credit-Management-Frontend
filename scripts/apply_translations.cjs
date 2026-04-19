const fs = require('fs');
const path = require('path');

const scriptDir = __dirname;
const baseDir = path.resolve(scriptDir, '..');

let f = fs.readFileSync(path.join(baseDir, 'pages/StudentProgressCurrent.tsx'), 'utf8');

// Insert hooks
f = f.replace(
  'import { useLocation, useNavigate } from "react-router-dom";',
  'import { useLocation, useNavigate } from "react-router-dom";\nimport { useTranslation } from "react-i18next";'
);
f = f.replace(
  'const navigate = useNavigate();',
  'const { t } = useTranslation();\n  const navigate = useNavigate();'
);

// Map strings
f = f.replace('setError("Please select current study year and semester");', 'setError(t("Please select current study year and semester"));');
f = f.replace('title="Major Selection Progress"', 'title={t("Major Selection Progress")}');
f = f.replace('Step 2: Current Year & Semester', '{t("Step 2: Current Year & Semester")}');
f = f.replace('<p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Program: {ruleNote}</p>', '<p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{t("Program")}: {t(ruleNote)}</p>');
f = f.replace('<div className="font-semibold text-[#0d1a1c] dark:text-gray-200 mb-1">Current Study Year</div>', '<div className="font-semibold text-[#0d1a1c] dark:text-gray-200 mb-1">{t("Current Study Year")}</div>');
f = f.replace('<option value="">Select year</option>', '<option value="">{t("Select year")}</option>');
f = f.replace('<option key={y} value={y}>{y}</option>', '<option key={y} value={y}>{t(y)}</option>');
f = f.replace('<div className="font-semibold text-[#0d1a1c] dark:text-gray-200 mb-1">Current Semester</div>', '<div className="font-semibold text-[#0d1a1c] dark:text-gray-200 mb-1">{t("Current Semester")}</div>');
f = f.replace('<option value="">Select semester</option>', '<option value="">{t("Select semester")}</option>');
f = f.replace('<option key={s} value={s}>{s}</option>', '<option key={s} value={s}>{t(s)}</option>');
f = f.replace('{loading ? "Saving..." : "Confirm Selection"}', '{loading ? t("Saving...") : t("Confirm Selection")}');

fs.writeFileSync(path.join(baseDir, 'pages/StudentProgressCurrent.tsx'), f, 'utf8');

const myanmarAdditions = {
  "Please select current study year and semester": "ကျေးဇူးပြု၍ လက်ရှိပညာသင်နှစ်နှင့် စာသင်နှစ်ဝက်ကို ရွေးချယ်ပါ",
  "Major Selection Progress": "မေဂျာရွေးချယ်မှု အဆင့်ဆင့်",
  "Step 2: Current Year & Semester": "အဆင့် ၂ - လက်ရှိပညာသင်နှစ်နှင့် စာသင်နှစ်ဝက်",
  "Program": "ပရိုဂရမ်",
  "Current Study Year": "လက်ရှိပညာသင်နှစ်",
  "Select year": "နှစ်ရွေးချယ်ပါ",
  "First Year": "ပထမနှစ်",
  "Second Year": "ဒုတိယနှစ်",
  "Third Year": "တတိယနှစ်",
  "Fourth Year": "စတုတ္ထနှစ်",
  "Fifth Year": "ပဉ္စမနှစ်",
  "Current Semester": "လက်ရှိစာသင်နှစ်ဝက်",
  "Select semester": "စာသင်နှစ်ဝက်ရွေးချယ်ပါ",
  "First Semester": "ပထမ စာသင်နှစ်ဝက်",
  "Second Semester": "ဒုတိယ စာသင်နှစ်ဝက်",
  "Saving...": "သိမ်းဆည်းနေပါသည်...",
  "Confirm Selection": "ရွေးချယ်မှုကို အတည်ပြုပါ",
  "4-year program (2024-2025 and later)": "၄-နှစ် သင်တန်း (၂၀၂၄-၂၀၂၅ နှင့် ယင်းနောက်ပိုင်း)",
  "5-year program (before 2024-2025)": "၅-နှစ် သင်တန်း (၂၀၂၄-၂၀၂၅ မတိုင်မီ)"
};

const enPath = path.join(baseDir, 'public/locales/en/translation.json');
const myPath = path.join(baseDir, 'public/locales/my/translation.json');

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const myData = JSON.parse(fs.readFileSync(myPath, 'utf8'));

Object.keys(myanmarAdditions).forEach(key => {
  enData[key] = key; 
  myData[key] = myanmarAdditions[key]; 
});

fs.writeFileSync(enPath, JSON.stringify(enData, null, 2), 'utf8');
fs.writeFileSync(myPath, JSON.stringify(myData, null, 2), 'utf8');

console.log("Component localized and translations updated!");
