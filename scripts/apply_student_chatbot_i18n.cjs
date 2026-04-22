const path = require('path');

const EN_LOCALE_PATH = path.join('C:/Frontend/Frontend/public/locales/en/translation.json');
const MY_LOCALE_PATH = path.join('C:/Frontend/Frontend/public/locales/my/translation.json');

const TRANSLATIONS = {
  "Your session expired. Please sign in again.": "သင်၏ အကောင့်သက်တမ်းကုန်သွားပါပြီ။ ကျေးဇူးပြု၍ ပြန်လည်ဝင်ရောက်ပါ။",
  "You do not have permission to use student AI chat.": "သင်သည် ကျောင်းသား AI ချက်ဘောက်စ်ကို အသုံးပြုရန် ခွင့်ပြုချက်မရှိပါ။",
  "Too many requests. Please wait a moment and retry.": "တောင်းဆိုမှုများလွန်းနေပါသည်။ ခဏစောင့်ပြီး ပြန်လည်ကြိုးစားပါ။",
  "The AI service is temporarily unavailable. Please try again shortly.": "AI ဝန်ဆောင်မှုကို ယာယီအသုံးပြု၍မရပါ။ ခဏအကြာမှ ပြန်လည်ကြိုးစားပါ။",
  "Unexpected error while contacting AI service.": "AI ဝန်ဆောင်မှုဖြင့် ဆက်သွယ်ရာတွင် မမျှော်လင့်ထားသော အမှားဖြစ်ပေါ်ခဲ့ပါသည်။",
  "Return to Dashboard": "ဒက်ရှ်ဘုတ်သို့ ပြန်သွားရန်",
  "Academic Intelligence": "ပညာရေးဆိုင်ရာ ဉာဏ်ရည်တု",
  "Select AI mode": "AI မုဒ်ကို ရွေးချယ်ပါ",
  "Clear": "ရှင်းလင်းရန်",
  "Start a new chat": "ချက်စကားဝိုင်းအသစ်စရန်",
  "Quick prompt: ": "အမြန်မေးခွန်း - ",
  "Student Knowledge Base": "ကျောင်းသား အသိပညာဗဟိုဌာန",
  "Inquire about curriculum metrics, administrative logs, faculty updates, or campus policies.": "သင်ရိုးညွှန်းတမ်း၊ စီမံခန့်ခွဲမှု မှတ်တမ်းများ၊ ဆရာ/ဆရာမ အသိပေးချက်များ သို့မဟုတ် ကျောင်းစည်းကမ်းများအကြောင်း စုံစမ်းမေးမြန်းပါ။",
  "Assistant is synthesizing": "လက်ထောက်က ပေါင်းစပ်ပေးနေပါသည်",
  "Ask anything about courses, faculty, or institutional guidelines...": "သင်တန်းများ၊ ဆရာ/ဆရာမများ သို့မဟုတ် ကျောင်းစည်းကမ်းချက်များအကြောင်း မေးမြန်းနိုင်ပါသည်...",
  "Chat message input": "ချက်စာတို ရက်ထည့်ရန်",
  "characters": "အက္ခရာများ",
  "Neural Processing Active": "ဉာဏ်ရည်တု လုပ်ဆောင်နေပါသည်",
  "Send message": "စာတိုပေးပို့ရန်",
  "Execute": "လုပ်ဆောင်ရန်",
  "CMD + Enter to dispatch • Shift + Enter for multiline": "ပေးပို့ရန် CMD + Enter နှိပ်ပါ • စာကြောင်းအသစ်ဆင်းရန် Shift + Enter နှိပ်ပါ",
  "Member": "အဖွဲ့ဝင်",
  "System Intelligence": "စနစ်ဉာဏ်ရည်တု",
  "Conceal Citations": "အကိုးအကားများကို ဖုံးကွယ်ရန်",
  "View Evidence": "အထောက်အထားများ ကြည့်ရှုရန်",

  "Auto": "အလိုအလျောက်",
  "Smartly picks the best academic mode based on your prompt.": "သင့်မေးခွန်းအပေါ်မူတည်၍ အကောင်းဆုံး ပညာရေးမုဒ်ကို အလိုအလျောက် ရွေးချယ်ပေးပါသည်။",
  "Help me plan next semester with 15 credits.": "နောက်စာသင်နှစ်အတွက် ခရက်ဒစ် ၁၅ ခုဖြင့် အစီအစဉ်ဆွဲရန် ကူညီပါ။",
  "What should I focus on this week academically?": "ယခုအပတ် ပညာရေးအတွက် မည်သည့်အရာကို အဓိကထားရမည်နည်း။",
  "Course Selection": "သင်တန်းရွေးချယ်မှု",
  "Suggests course combinations while considering workload and fit.": "သင်ယူရမည့် ဝန်နှင့် သင့်လျော်မှုတို့ကို ထည့်သွင်းစဉ်းစားပြီး သင်တန်းများကို အကြံပြုပေးပါသည်။",
  "Pick 4 balanced courses for next term.": "နောက်စာသင်နှစ်အတွက် မျှတသော သင်တန်း ၄ ခုကို ရွေးပါ။",
  "Suggest a schedule with two labs and one elective.": "လက်တွေ့ ၂ ခုနှင့် ရွေးချယ်ခွင့် ၁ ခုပါသော အချိန်ဇယားကို အကြံပြုပါ။",
  "Course Stats": "သင်တန်း အချက်အလက်များ",
  "Explains historical course trends, pass rates, and difficulty signals.": "ယခင်သင်တန်းများ၏ အခြေအနေ၊ အောင်ချက်ရာခိုင်နှုန်းနှင့် အခက်အခဲအဆင့်များကို ရှင်းပြပေးပါသည်။",
  "Show me performance trends for Data Structures.": "Data Structures ဘာသာရပ်အတွက် အောင်မြင်မှုမှတ်တမ်းကို ပြပါ။",
  "Which course has lower failure risk between A and B?": "ဘာသာရပ် A နှင့် B တွင် မည်သည့်ဘာသာရပ်က ကျနိုင်ခြေနည်းပါသနည်း။",
  "Academic Progress": "ပညာရေး တိုးတက်မှု",
  "Tracks completion status and identifies gaps in your progress.": "ပြီးစီးမှုအခြေအနေကို ခြေရာခံပြီး သင့်တိုးတက်မှုတွင် လိုအပ်ချက်များကို ဖော်ထုတ်ပေးပါသည်။",
  "How close am I to graduation credits?": "ဘွဲ့ရရန် ခရက်ဒစ်ဘယ်လောက် လိုသေးသနည်း။",
  "What milestones am I missing this year?": "ယခုနှစ်အတွက် မည်သည့်မှတ်တိုင်များ လိုအပ်နေသေးသနည်း။",
  "Major Requirements": "အဓိကဘာသာရပ် လိုအပ်ချက်များ",
  "Checks required major courses and what remains unfinished.": "အဓိကဘာသာရပ်အတွက် လိုအပ်သောသင်တန်းများနှင့် မပြီးသေးသည်များကို စစ်ဆေးပေးပါသည်။",
  "Which core courses are still pending for my major?": "ကျွန်ုပ်၏ အဓိကဘာသာရပ်အတွက် မည်သည့် အခြေခံသင်တန်းများ ကျန်နေသေးသနည်း။",
  "Can you list remaining requirements by semester?": "ကျန်ရှိနေသော လိုအပ်ချက်များကို စာသင်နှစ်အလိုက် စာရင်းပြုစုပေးနိုင်ပါသလား။",
  "Announcements": "ကြေညာချက်များ",
  "Summarizes important university and department announcements.": "တက္ကသိုလ်နှင့် ဌာနဆိုင်ရာ အရေးကြီးကြေညာချက်များကို အကျဉ်းချုပ်ပေးပါသည်။",
  "Any urgent announcements for students this week?": "ယခုအပတ် ကျောင်းသားများအတွက် အရေးကြီးသော ကြေညာချက်များ ရှိပါသလား။",
  "Summarize academic notices I should not miss.": "မလွတ်သင့်သော ပညာရေးအသိပေးချက်များကို အကျဉ်းချုပ်ပေးပါ။",
  "Policy & General": "မူဝါဒနှင့် အထွေထွေ",
  "Answers general policy questions with student-friendly explanations.": "အထွေထွေ မူဝါဒဆိုင်ရာ မေးခွန်းများကို ကျောင်းသားများ နားလည်လွယ်အောင် ဖြေကြားပေးပါသည်။",
  "What is the late registration policy?": "နောက်ကျမှ မှတ်ပုံတင်ခြင်းဆိုင်ရာ မူဝါဒက ဘာလဲ။",
  "How does add/drop week work?": "ဘာသာရပ် အတိုး/အလျှော့ရက်သတ္တပတ်က ဘယ်လိုအလုပ်လုပ်သနည်း။",
  "Course Advisor": "သင်တန်း အကြံပေး",
  "Gives deep advice focused on a specific course context.": "သတ်မှတ်ထားသော သင်တန်းအကြောင်းအရာအတွက် အသေးစိတ် အကြံဉာဏ်ပေးပါသည်။",
  "How should I prepare for the midterm in this course?": "ဤသင်တန်း၏ နှစ်လယ်စာမေးပွဲအတွက် ဘယ်လိုပြင်ဆင်ရမလဲ။",
  "Break down a study strategy for this class.": "ဤအတန်းအတွက် လေ့လာမှုဗျူဟာကို ရှင်းပြပေးပါ။"
};

// 1. Update locales
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

// 2. Inject `useTranslation` hook
function injectImport(content, filePath) {
  // If it doesn't already import react-i18next, add it
  if (!content.includes('react-i18next')) {
    // try to put it after all other imports
    const importMatches = [...content.matchAll(/import .*from .*/g)];
    if (importMatches.length > 0) {
        const lastMatch = importMatches[importMatches.length - 1];
        const insertionPoint = lastMatch.index + lastMatch[0].length;
        content = content.substring(0, insertionPoint) + '\nimport { useTranslation } from "react-i18next";' + content.substring(insertionPoint);
    } else {
       content = 'import { useTranslation } from "react-i18next";\n' + content;
    }
  }
  return content;
}

function processComponent(filePath, transformations, componentName) {
  let content = fs.readFileSync(filePath, 'utf-8');
  content = injectImport(content, filePath);

  if (componentName && !content.includes('const { t } = useTranslation();')) {
    const regex = new RegExp(`const ${componentName}(\\s*:.*?)?\\s*=\\s*\\([^)]*\\)\\s*=>\\s*{`);
    content = content.replace(regex, match => `${match}\n  const { t } = useTranslation();`);
  }

  for (const t of transformations) {
    content = content.split(t.from).join(t.to);
  }

  fs.writeFileSync(filePath, content);
}

try {
  updateLocales();

  // StudentChatPage.tsx
  processComponent(
    'C:/Frontend/Frontend/pages/StudentChatPage.tsx',
    [
      { from: '"Your session expired. Please sign in again."', to: 't("Your session expired. Please sign in again.")' },
      { from: '"You do not have permission to use student AI chat."', to: 't("You do not have permission to use student AI chat.")' },
      { from: '"Too many requests. Please wait a moment and retry."', to: 't("Too many requests. Please wait a moment and retry.")' },
      { from: '"The AI service is temporarily unavailable. Please try again shortly."', to: 't("The AI service is temporarily unavailable. Please try again shortly.")' },
      { from: '"Unexpected error while contacting AI service."', to: 't("Unexpected error while contacting AI service.")' }
    ],
    'StudentChatPage'
  );

  // ChatWindow.tsx
  processComponent(
    'C:/Frontend/Frontend/components/student-chat/ChatWindow.tsx',
    [
      { from: 'title="Return to Dashboard"', to: 'title={t("Return to Dashboard")}' },
      { from: '>Academic Intelligence<', to: '>{t("Academic Intelligence")}<' },
      { from: '{meta.description}', to: '{t(meta.description)}' },
      { from: 'aria-label="Select AI mode"', to: 'aria-label={t("Select AI mode")}' },
      { from: '{modeMeta[mode].label}', to: '{t(modeMeta[mode].label)}' },
      { from: 'aria-label="Start a new chat"', to: 'aria-label={t("Start a new chat")}' },
      { from: '>Clear<', to: '>{t("Clear")}<' },
      { from: 'aria-label={`Quick prompt: ${example}`}', to: 'aria-label={`${t("Quick prompt: ")}${t(example)}`}' },
      { from: '>{example}<', to: '>{t(example)}<' },
      { from: '>Student Knowledge Base<', to: '>{t("Student Knowledge Base")}<' },
      { from: '>Inquire about curriculum metrics, administrative logs, faculty updates, or campus policies.<', to: '>{t("Inquire about curriculum metrics, administrative logs, faculty updates, or campus policies.")}<' }
    ],
    'ChatWindow'
  );

  // MessageList.tsx
  processComponent(
    'C:/Frontend/Frontend/components/student-chat/MessageList.tsx',
    [
      { from: 'aria-label="Assistant is synthesizing"', to: 'aria-label={t("Assistant is synthesizing")}' }
    ],
    'MessageList'
  );

  // ChatComposer.tsx
  processComponent(
    'C:/Frontend/Frontend/components/student-chat/ChatComposer.tsx',
    [
      { from: 'placeholder="Ask anything about courses, faculty, or institutional guidelines..."', to: 'placeholder={t("Ask anything about courses, faculty, or institutional guidelines...")}' },
      { from: 'aria-label="Chat message input"', to: 'aria-label={t("Chat message input")}' },
      { from: '`${value.length} characters`', to: '`${value.length} ${t("characters")}`' },
      { from: "'Neural Processing Active'", to: 't("Neural Processing Active")' },
      { from: 'aria-label="Send message"', to: 'aria-label={t("Send message")}' },
      { from: '>Execute<', to: '>{t("Execute")}<' },
      { from: '>CMD + Enter to dispatch • Shift + Enter for multiline<', to: '>{t("CMD + Enter to dispatch • Shift + Enter for multiline")}<' }
    ],
    'ChatComposer'
  );

  // MessageBubble.tsx
  // We pass null for componentName here because MessageBubble doesn't need to inject `const { t } = useTranslation()` just at the signature, wait no it does need `t`.
  processComponent(
    'C:/Frontend/Frontend/components/student-chat/MessageBubble.tsx',
    [
      { from: "{isUser ? 'Member' : 'System Intelligence'}", to: "{isUser ? t('Member') : t('System Intelligence')}" },
      { from: 'aria-expanded={showSources}', to: 'aria-expanded={showSources} title={showSources ? t("Conceal Citations") : t("View Evidence")}' },
      { from: 'showSources ? "Conceal Citations" : `View Evidence (${message.sources.length})`', to: 'showSources ? t("Conceal Citations") : `${t("View Evidence")} (${message.sources.length})`' }
    ],
    'MessageBubble'
  );

  console.log("i18n updates applied successfully.");
} catch(err) {
  console.error(err);
}
