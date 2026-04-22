const fs = require('fs');
const path = require('path');

const EN_LOCALE_PATH = path.join('C:/Frontend/Frontend/public/locales/en/translation.json');
const MY_LOCALE_PATH = path.join('C:/Frontend/Frontend/public/locales/my/translation.json');

const TRANSLATIONS = {
  "Management Queue": "စီမံခန့်ခွဲမှု တန်းစီစာရင်း",
  "Review pending": "စိစစ်ရန်ကျန်နေသေးသည်",
  "Requires intervention": "ကြားဝင်လုပ်ဆောင်ပေးရန်လိုအပ်သည်",
  "Retake Required": "ပြန်လည်ဖြေဆိုရန်လိုအပ်သည်",
  "Successfully completed": "အောင်မြင်စွာ ပြီးမြောက်သည်",
  "Graduated": "ဘွဲ့ရပြီးသူများ",
  "Total active student accounts": "လက်ရှိအသုံးပြုနေသော ကျောင်းသားအကောင့်စုစုပေါင်း",
  "Total Students": "ကျောင်းသား စုစုပေါင်း",
  "Academic status: Graduated": "ပညာရေးအခြေအနေ- ဘွဲ့ရပြီး",
  "Needs retake intervention": "ပြန်လည်ဖြေဆိုမှုအတွက် ကြားဝင်လုပ်ဆောင်ပေးရန် လိုအပ်သည်",
  "Needs attention": "အာရုံစိုက်ရန်လိုအပ်သည်",
  "Average GPA": "ပျမ်းမျှ GPA",
  "Average GPA of active students": "လက်ရှိကျောင်းသားများ၏ ပျမ်းမျှ GPA",
  "Healthy": "ကောင်းမွန်သည်",
  "Watch": "စောင့်ကြည့်ရန်",
  "Must Reset Password": "စကားဝှက် ပြန်လည်သတ်မှတ်ရမည်",
  "Accounts requiring password reset on next sign-in.": "နောက်တစ်ကြိမ် ဝင်ရောက်ရာတွင် စကားဝှက်ပြန်လည်သတ်မှတ်ရန် လိုအပ်သော အကောင့်များ။",
  "Schedule Pending": "အချိန်ဇယား ဆိုင်းငံ့ထားသည်",
  "Enrollments pending review (previously conflicts).": "အတည်ပြုရန် ဆိုင်းငံ့ထားသော ကျောင်းအပ်ချမှုများ (ယခင်က တိုက်ဆိုင်မှုရှိခဲ့သည်)။",
  
  "Online": "အွန်လိုင်းပေါ်တွင်",
  "Degraded": "အရည်အသွေးကျဆင်းလာသည်",
  "Offline": "အွန်လိုင်းပြင်ပတွင်",
  "Unknown": "အမျိုးအမည်မသိ",
  "Active": "တက်ကြွစွာအသုံးပြုနေသည်",
  "Expired": "သက်တမ်းကုန်သွားသည်",

  "Other Majors": "အခြား အဓိကဘာသာရပ်များ",
  "Major Distribution": "အဓိကဘာသာရပ် ဖြန့်ဝေမှု",
  "Cohort split by academic specialization": "ပညာရပ်ဆိုင်ရာ အထူးပြုမှုအလိုက် ခွဲခြားမှု",
  "No data": "အချက်အလက်မရှိပါ",
  "Core Engine": "အဓိကအင်ဂျင်",
  "Protocol": "ပရိုတိုကော",
  "Subject Matrix": "ဘာသာရပ် သင်္ကေတ",
  "Vector": "ဗက်တာ",
  "Age": "အသက်",
  "Zero Matching Records": "တိုက်ဆိုင်သောမှတ်တမ်း မရှိပါ",
  "Manage Enrollment": "ကျောင်းအပ်ချမှုကို စီမံရန်",
  "Manage Students": "ကျောင်းသားများကို စီမံရန်",

  "Sync Error:": "ပေါင်းစပ်မှု အမှား-",
  "Action Inbox": "လုပ်ဆောင်ရမည့် စာဝင်တိုက်",
  "Awaiting intervention": "ကြားဝင်လုပ်ဆောင်ပေးရန် စောင့်ဆိုင်းနေသည်",
  "Expand": "ချဲ့ကြည့်ရန်",
  "Resolve Tasks": "အလုပ်များကို ဖြေရှင်းရန်",
  "University Administrative Operating System • V2.4.0": "တက္ကသိုလ် စီမံခန့်ခွဲမှု စနစ် • V2.4.0",
  "Retry Sync": "ပြန်လည်စမ်းသပ်ရန်",
  "Search protocols...": "ပရိုတိုကောများကို ရှာရန်...",
  "Live Metrics": "တိုက်ရိုက်အချက်အလက်များ",
  "Distribution of academic performance and institutional scale.": "ပညာရေးစွမ်းဆောင်ရည်နှင့် တက္ကသိုလ်အဆင့် ဖြန့်ဝေမှု",
  "Service availability": "ဝန်ဆောင်မှု ရရှိနိုင်မှု",
  "Student Analytics": "ကျောင်းသား ဆန်းစစ်ချက်များ",
  "Catalog": "ကက်တလောက်",
  "Directory": "လမ်းညွှန်"
};

function updateLocales() {
  const enData = JSON.parse(fs.readFileSync(EN_LOCALE_PATH, 'utf-8'));
  const myData = JSON.parse(fs.readFileSync(MY_LOCALE_PATH, 'utf-8'));

  for (let [engText, myText] of Object.entries(TRANSLATIONS)) {
    enData[engText] = engText;
    myData[engText] = myText;
  }

  fs.writeFileSync(EN_LOCALE_PATH, JSON.stringify(enData, null, 2));
  fs.writeFileSync(MY_LOCALE_PATH, JSON.stringify(myData, null, 2));
}

function processComponent(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Add import if missing
  if (!content.includes('react-i18next')) {
    const importMatches = [...content.matchAll(/^import.*$/gm)];
    if (importMatches.length > 0) {
      const lastMatch = importMatches[importMatches.length - 1];
      const insertionPoint = lastMatch.index + lastMatch[0].length;
      content = content.substring(0, insertionPoint) + '\nimport { useTranslation } from "react-i18next";' + content.substring(insertionPoint);
    } else {
      content = 'import { useTranslation } from "react-i18next";\n' + content;
    }
  }

  // Add const { t } = useTranslation(); to AdminDashboard
  if (!content.includes('const { t } = useTranslation();')) {
    content = content.replace(/const AdminDashboard: React\.FC<DashboardProps> = \({ user, onLogout }\) => {/g, 'const AdminDashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {\n  const { t } = useTranslation();');
  }

  // Replacements
  const transforms = [
    { from: '"Total Students"', to: 't("Total Students")' },
    { from: '"Total active student accounts"', to: 't("Total active student accounts")' },
    { from: 'label: "Graduated"', to: 'label: t("Graduated")' },
    { from: '"Academic status: Graduated"', to: 't("Academic status: Graduated")' },
    { from: 'label: "Retake Required"', to: 'label: t("Retake Required")' },
    { from: '"Needs retake intervention"', to: 't("Needs retake intervention")' },
    { from: '"Needs attention"', to: 't("Needs attention")' },
    { from: 'label: "Average GPA"', to: 'label: t("Average GPA")' },
    { from: '"Average GPA of active students"', to: 't("Average GPA of active students")' },
    { from: '"Healthy" : "Watch"', to: 't("Healthy") : t("Watch")' },

    { from: 'title: "Must Reset Password"', to: 'title: t("Must Reset Password")' },
    { from: '"Accounts requiring password reset on next sign-in."', to: 't("Accounts requiring password reset on next sign-in.")' },
    { from: 'title: "Schedule Pending"', to: 'title: t("Schedule Pending")' },
    { from: '"Enrollments pending review (previously conflicts)."', to: 't("Enrollments pending review (previously conflicts).")' },

    { from: 'label: "Online"', to: 'label: t("Online")' },
    { from: 'label: "Degraded"', to: 'label: t("Degraded")' },
    { from: 'label: "Offline"', to: 'label: t("Offline")' },
    { from: 'label: "Unknown"', to: 'label: t("Unknown")' },
    { from: 'label: "Active"', to: 'label: t("Active")' },
    { from: 'label: "Expired"', to: 'label: t("Expired")' },

    { from: '"Other Majors"', to: 't("Other Majors")' },
    { from: '>Management Queue<', to: '>{t("Management Queue")}<' },
    { from: '>Review pending<', to: '>{t("Review pending")}<' },
    { from: '>Requires intervention<', to: '>{t("Requires intervention")}<' },
    { from: '>Retake Required<', to: '>{t("Retake Required")}<' },
    { from: '>Successfully completed<', to: '>{t("Successfully completed")}<' },
    { from: '>Graduated<', to: '>{t("Graduated")}<' },
    
    { from: '>Major Distribution<', to: '>{t("Major Distribution")}<' },
    { from: '>Cohort split by academic specialization<', to: '>{t("Cohort split by academic specialization")}<' },
    { from: '>No data<', to: '>{t("No data")}<' },
    { from: '>Core Engine<', to: '>{t("Core Engine")}<' },
    { from: '>Protocol<', to: '>{t("Protocol")}<' },
    { from: '>Subject Matrix<', to: '>{t("Subject Matrix")}<' },
    { from: '>Vector<', to: '>{t("Vector")}<' },
    { from: '>Age<', to: '>{t("Age")}<' },
    { from: '>Zero Matching Records<', to: '>{t("Zero Matching Records")}<' },
    { from: '>Manage Enrollment<', to: '>{t("Manage Enrollment")}<' },
    { from: '>Manage Students<', to: '>{t("Manage Students")}<' },

    { from: '>Sync Error:<', to: '>{t("Sync Error:")}<' },
    { from: '>Retry Sync<', to: '>{t("Retry Sync")}<' },
    { from: '>Action Inbox<', to: '>{t("Action Inbox")}<' },
    { from: '>Awaiting intervention<', to: '>{t("Awaiting intervention")}<' },
    { from: '>Expand<', to: '>{t("Expand")}<' },
    { from: '>Resolve Tasks<', to: '>{t("Resolve Tasks")}<' },
    { from: '>University Administrative Operating System • V2.4.0<', to: '>{t("University Administrative Operating System • V2.4.0")}<' },
    
    { from: 'placeholder="Search protocols..."', to: 'placeholder={t("Search protocols...")}' },
    { from: '>Live Metrics<', to: '>{t("Live Metrics")}<' },
    { from: '>Distribution of academic performance and institutional scale.<', to: '>{t("Distribution of academic performance and institutional scale.")}<' },
    { from: '>Service availability<', to: '>{t("Service availability")}<' },
    { from: '>Student Analytics<', to: '>{t("Student Analytics")}<' },
    { from: '>Catalog<', to: '>{t("Catalog")}<' },
    { from: '>Directory<', to: '>{t("Directory")}<' }
  ];

  for (const t of transforms) {
    content = content.replace(new RegExp(t.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), t.to);
  }

  content = content.replace('`${formatNumber(stats.totalStudents)} records`', '`${formatNumber(stats.totalStudents)} ${t("records")}`');
  content = content.replace('`${formatNumber(stats.graduatedCount)} completed`', '`${formatNumber(stats.graduatedCount)} ${t("completed")}`');
  
  fs.writeFileSync(filePath, content);
}

try {
  updateLocales();
  processComponent('C:/Frontend/Frontend/pages/AdminDashboard.tsx');
  
  const enData = JSON.parse(fs.readFileSync(EN_LOCALE_PATH, 'utf-8'));
  const myData = JSON.parse(fs.readFileSync(MY_LOCALE_PATH, 'utf-8'));
  
  enData["records"] = "records";
  myData["records"] = "မှတ်တမ်းများ";
  
  enData["completed"] = "completed";
  myData["completed"] = "ပြီးမြောက်သည်";
  
  fs.writeFileSync(EN_LOCALE_PATH, JSON.stringify(enData, null, 2));
  fs.writeFileSync(MY_LOCALE_PATH, JSON.stringify(myData, null, 2));
  
  console.log("Localizations applied to AdminDashboard.")
} catch(err) {
  console.error(err);
}
