const fs = require('fs');

const file = 'C:/Frontend/Frontend/pages/StudentAnnouncements.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('useTranslation')) {
    content = content.replace('import { useLocation } from "react-router-dom";', 'import { useLocation } from "react-router-dom";\nimport { useTranslation } from "react-i18next";');
    content = content.replace('const location = useLocation();', 'const { t } = useTranslation();\n  const location = useLocation();');
}

// Replacements
content = content.replace('title="Institutional Dispatches"', 'title={t("Institutional Dispatches")}');
content = content.replace('>Announcements</h1>', '>{t("Announcements")}</h1>');
content = content.replace('>Official broadcasts and academic updates from the administrative nexus.</p>', '>{t("Official broadcasts and academic updates from the administrative nexus.")}</p>');
content = content.replace('"Failed to load announcements"', 't("Failed to load announcements")');
content = content.replace('placeholder="Filter dispatches by content..."', 'placeholder={t("Filter dispatches by content...")}');
content = content.replace('>{t.toUpperCase()} CATEGORY</option>', '>{t(t).toUpperCase()} {t("CATEGORY")}</option>'); // Ensure `t(t)` works by translating the Type directly
content = content.replace('<option>Newest</option>', '<option value="Newest">{t("Newest")}</option>');
content = content.replace('<option>Oldest</option>', '<option value="Oldest">{t("Oldest")}</option>');
content = content.replace('>Null Dispatch Set</h3>', '>{t("Null Dispatch Set")}</h3>');
content = content.replace('>No active announcements matching your parameters</p>', '>{t("No active announcements matching your parameters")}</p>');
content = content.replace('title="New Dispatch"', 'title={t("New Dispatch")}');
content = content.replace('Recall:', '{t("Recall:")}');
content = content.replace('>Active</span>', '>{t("Active")}</span>');
content = content.replace('Origin: {a.posted_by || "Institutional Admin"}', '{t("Origin:")} {a.posted_by || t("Institutional Admin")}');
content = content.replace('Dispatch Log <span', '{t("Dispatch Log")} <span');

fs.writeFileSync(file, content, 'utf8');

// Translations
const translations = {
  "Institutional Dispatches": "တက္ကသိုလ် ကြေညာချက်များ",
  "Announcements": "ကြေညာချက်များ",
  "Official broadcasts and academic updates from the administrative nexus.": "အုပ်ချုပ်ရေးအဖွဲ့မှ တရားဝင် ထုတ်လွှင့်ချက်များနှင့် ပညာရပ်ဆိုင်ရာ နောက်ဆုံးရ သတင်းများ။",
  "Failed to load announcements": "ကြေညာချက်များ ခေါ်ယူ၍မရပါ",
  "Filter dispatches by content...": "အကြောင်းအရာလုပ်၍ ကြေညာချက်များကို စစ်ထုတ်ရန်...",
  "CATEGORY": "အမျိုးအစား",
  "All": "အားလုံး",
  "General": "အထွေထွေ",
  "Urgent": "အရေးကြီး",
  "Event": "ပွဲစဉ်",
  "Academic": "ပညာရပ်ဆိုင်ရာ",
  "Newest": "အသစ်ဆုံး",
  "Oldest": "အဟောင်းဆုံး",
  "Null Dispatch Set": "ကြေညာချက် မရှိပါ",
  "No active announcements matching your parameters": "သင်ရှာဖွေသော အချက်အလက်နှင့် ကိုက်ညီသည့် ကြေညာချက်များ မရှိပါ။",
  "New Dispatch": "ကြေညာချက်အသစ်",
  "Recall:": "သက်တမ်းကုန်ဆုံးမည့်ရက် -",
  "Active": "လက်ရှိ",
  "Origin:": "ပေးပို့သူ -",
  "Institutional Admin": "တက္ကသိုလ် အုပ်ချုပ်ရေးမှူး",
  "Dispatch Log": "ကြေညာချက် မှတ်တမ်း"
};

const enPath = 'C:/Frontend/Frontend/public/locales/en/translation.json';
const myPath = 'C:/Frontend/Frontend/public/locales/my/translation.json';

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const myData = JSON.parse(fs.readFileSync(myPath, 'utf8'));

for (const [key, value] of Object.entries(translations)) {
    if (!enData[key] || enData[key] === key) enData[key] = key;
    myData[key] = value;
}

fs.writeFileSync(enPath, JSON.stringify(enData, null, 2), 'utf8');
fs.writeFileSync(myPath, JSON.stringify(myData, null, 2), 'utf8');

console.log('Translations applied successfully.');