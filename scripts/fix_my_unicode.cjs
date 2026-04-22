const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, 'public', 'locales', 'en', 'translation.json');
const myPath = path.join(__dirname, 'public', 'locales', 'my', 'translation.json');

// Restore the proper Unicode for the translations
const translations = {
  "Your session expired. Please sign in again.": "သင်၏အချိန်ဆက်ရှင်ကုန်ဆုံးသွားပါပြီ။ ကျေးဇူးပြု၍ ပြန်လည်ဝင်ရောက်ပါ။",
  "You do not have permission to use Admin AI Assistant.": "Admin AI Assistant ကို အသုံးပြုရန် သင့်တွင် ခွင့်ပြုချက်မရှိပါ။",
  "Too many requests. Please wait a moment and retry.": "တောင်းဆိုမှုများလွန်းနေပါသည်။ ခဏစောင့်ပြီး ပြန်ကြိုးစားပါ။",
  "The AI service is temporarily unavailable. Please try again shortly.": "AI ဝန်ဆောင်မှုကို ယာယီအသုံးပြု၍မရပါ။ ခဏအကြာတွင် ပြန်လည်ကြိုးစားပါ။",
  "Unexpected error while contacting AI service.": "AI ဝန်ဆောင်မှုနှင့် ဆက်သွယ်စဉ် မမျှော်လင့်ထားသော အမှားအယွင်းဖြစ်ပွားခဲ့သည်။",
  "Auto": "အလိုအလျောက်",
  "Enrollment Management": "ကျောင်းအပ်နှံမှု စီမံခန့်ခွဲခြင်း",
  "Course Planning": "သင်ရိုးညွှန်းတမ်း စီစဉ်ခြင်း",
  "Announcement Strategy": "ကြေညာချက် မဟာဗျူဟာ",
  "Student Performance": "ကျောင်းသားစွမ်းဆောင်ရည်",
  "System Health": "စနစ် ကျန်းမာရေး",
  "Intelligently routes administrative queries to the appropriate system tools.": "သင့်လျော်သော စနစ်ကိရိယာများဆီသို့ အုပ်ချုပ်ရေးမေးခွန်းများကို အလိုအလျောက် လမ်းကြောင်းပေးသည်။",
  "Deep dive into course capacities, waitlists, and student registrations.": "သင်တန်းစွမ်းရည်များ၊ စောင့်ဆိုင်းစာရင်းများနှင့် ကျောင်းသားမှတ်ပုံတင်ခြင်းများကို အသေးစိတ်ကြည့်ရှုပါ။",
  "Assists in curriculum management and scheduling strategies.": "သင်ရိုးညွှန်းတမ်း စီမံခန့်ခွဲမှုနှင့် အချိန်ဇယားဆွဲခြင်းဆိုင်ရာ မဟာဗျူဟာများကို ကူညီပေးသည်။",
  "Helps draft and target administrative communications.": "အုပ်ချုပ်ရေးဆိုင်ရာ ဆက်သွယ်မှုများကို ရေးဆွဲရန်နှင့် ဦးတည်ရန် ကူညီပေးသည်။",
  "Analyzes aggregate student data and grading trends.": "ကျောင်းသားအချက်အလက် စုစုပေါင်းနှင့် အမှတ်ပေးလမ်းကြောင်းများကို ခွဲခြမ်းစိတ်ဖြာသည်။",
  "Monitors administrative system logs and performance metrics.": "အုပ်ချုပ်ရေးစနစ် မှတ်တမ်းများနှင့် စွမ်းဆောင်ရည် အညွှန်းများကို စောင့်ကြည့်သည်။",
  "Summarize current enrollment trends.": "လက်ရှိ ကျောင်းအပ်နှံမှု လမ်းကြောင်းများကို အကျဉ်းချုပ်ပြပါ။",
  "Are there any pending system alerts?": "ဆိုင်းငံ့ထားသော စနစ်သတိပေးချက်များ ရှိပါသလား။",
  "Which courses are over capacity this semester?": "ဤစာသင်နှစ်တွင် မည်သည့်သင်တန်းများ လူပိုနေသနည်း။",
  "Analyze waitlist patterns for core CS courses.": "အဓိက CS သင်တန်းများအတွက် စောင့်ဆိုင်းစာရင်းပုံစံများကို ခွဲခြမ်းစိတ်ဖြာပါ။",
  "Propose a balanced schedule for next year's electives.": "နောက်နှစ် ရွေးချယ်နိုင်သောဘာသာရပ်များအတွက် ဟန်ချက်ညီသော အချိန်ဇယားကို အဆိုပြုပါ။",
  "Check for scheduling conflicts in the Science department.": "သိပ္ပံဌာနတွင် အချိန်ဇယားပဋိပက္ခများကို စစ်ဆေးပါ။",
  "Draft an urgent announcement about the system maintenance.": "စနစ်ပြုပြင်ထိန်းသိမ်းမှုနှင့်ပတ်သက်၍ အရေးပေါ်ကြေညာချက်တစ်စောင် ရေးဆွဲပါ။",
  "Who should receive the notice about graduation deadline?": "ဘွဲ့ယူမည့်နောက်ဆုံးရက်အကြောင်း အသိပေးချက်ကို မည်သူများရရှိသင့်သနည်း။",
  "What is the average GPA distribution for this year's seniors?": "ဒီနှစ် နောက်ဆုံးနှစ်ကျောင်းသားများအတွက် ပျမ်းမျှ GPA ဖြန့်ဝေမှုက ဘာလဲ။",
  "Identify courses with unusually high failure rates.": "ကျရှုံးမှုနှုန်း ပုံမှန်ထက်မြင့်မားသော သင်တန်းများကို ဖော်ထုတ်ပါ။",
  "Show me the system log for the last 24 hours.": "လွန်ခဲ့သော ၂၄ နာရီအတွက် စနစ်မှတ်တမ်းကို ပြပါ။",
  "Report any API latency issues from this morning.": "ယနေ့နံနက်မှ API ကြန့်ကြာမှုပြဿနာများကို တင်ပြပါ။",
  "Institutional Intelligence": "အဖွဲ့အစည်းဆိုင်ရာ ဉာဏ်ရည်",
  "Clear": "ရှင်းလင်းရန်",
  "Administrative Insight": "အုပ်ချုပ်ရေးဆိုင်ရာ ထိုးထွင်းသိမြင်မှု",
  "Initiate a query to analyze enrollment metrics, generate faculty reports, or manage institutional broadcasts.": "ကျောင်းအပ်နှံမှု အညွှန်းများကို ခွဲခြမ်းစိတ်ဖြာရန်၊ ဆရာအဖွဲ့အစီရင်ခံစာများ ထုတ်လုပ်ရန် သို့မဟုတ် အဖွဲ့အစည်းဆိုင်ရာ ကြေညာချက်များကို စီမံခန့်ခွဲရန် မေးခွန်းတစ်ခု စတင်ပါ။",
  "Inquire about curriculum metrics, administrative logs, or faculty updates...": "သင်ရိုးညွှန်းတမ်း အညွှန်းများ၊ အုပ်ချုပ်ရေး မှတ်တမ်းများ သို့မဟုတ် ဆရာအဖွဲ့ နောက်ဆုံးရသတင်းများအကြောင်း မေးမြန်းပါ...",
  "characters": "အက္ခရာများ",
  "AI Synthesis Active": "AI ပေါင်းစပ်မှု လုပ်ဆောင်နေသည်",
  "Execute": "လုပ်ဆောင်ရန်",
  "Administrator": "အုပ်ချုပ်သူ",
  "System Assistant": "စနစ် လက်ထောက်",
  "Conceal Citations": "ကိုးကားချက်များကို ဖုံးကွယ်ရန်",
  "View Evidence": "အထောက်အထားကို ကြည့်ရှုရန်",
  "CMD + Enter to dispatch • Shift + Enter for multiline": "ပေးပို့ရန် CMD + Enter • စာကြောင်းများစွာအတွက် Shift + Enter"
};

function restoreUnicodeFiles(filepath) {
  let data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  for (const [key, translation] of Object.entries(translations)) {
    data[key] = filepath.includes('\\my\\') || filepath.includes('/my/') ? translation : key;
  }
  
  // Cleanup corrupted keys that contain ?????
  for (const k of Object.keys(data)) {
    if (data[k].includes('?????') || k.includes('???')) {
      delete data[k];
    }
  }

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

restoreUnicodeFiles(myPath);
restoreUnicodeFiles(enPath);
console.log('Unicode applied successfully');
