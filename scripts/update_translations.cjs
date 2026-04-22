const fs = require('fs');

const myanmarAdditions = {
  "Failed to download semester certificate. Please try again.": "စာသင်နှစ်ဝက်လက်မှတ်ဒေါင်းလုဒ်လုပ်ရန်ပျက်ကွက်သည်။ ကျေးဇူးပြု၍ ထပ်မံကြိုးစားပါ။",
  "Failed to download year certificate. Please try again.": "နှစ်အလိုက်လက်မှတ်ဒေါင်းလုဒ်လုပ်ရန်ပျက်ကွက်သည်။ ကျေးဇူးပြု၍ ထပ်မံကြိုးစားပါ။",
  "Failed to download complete certificate. Please try again.": "လက်မှတ်အပြည့်အစုံဒေါင်းလုဒ်လုပ်ရန်ပျက်ကွက်သည်။ ကျေးဇူးပြု၍ ထပ်မံကြိုးစားပါ။",
  "Academic Portfolio": "ပညာရေးမှတ်တမ်း",
  "Academic Records": "ပညာရေးမှတ်တမ်းများ",
  "Integrated transcript for": "စုစည်းမှတ်တမ်း -",
  "Authorized Member": "ခွင့်ပြုချက်ရရှိထားသူ",
  "Processing...": "လုပ်ဆောင်နေပါသည်...",
  "Export Transcript": "မှတ်တမ်းထုတ်ယူရန်",
  "Semester Dispatches": "စာသင်နှစ်ဝက်မှတ်တမ်းများ",
  "Records": "ခု",
  "Academic Cycles": "ပညာရေးကာလများ",
  "periods": "ခု",
  "units": "ယူနစ်",
  "Comprehensive Export": "အလုံးစုံထုတ်ယူရန်",
  "All validated intervals": "အတည်ပြုပြီးသောကာလအားလုံး",
  "Institutional Standing": "အဖွဲ့အစည်းဆိုင်ရာအခြေအနေ",
  "Interval Performance": "ကာလအလိုက်စွမ်းဆောင်ရည်",
  "Operational Peak": "အမြင့်ဆုံးစွမ်းဆောင်ရည်",
  "Unit Accumulation": "ယူနစ်စုဆောင်းမှု",
  "Validated Credits": "အတည်ပြုပြီးသောယူနစ်များ",
  "Filter course dispatches by code or title...": "ဘာသာရပ်ကုဒ် သို့မဟုတ် အမည်ဖြင့် ရှာဖွေရန်...",
  "Failed to load messages": "မက်ဆေ့ခ်ျများရယူရန်ပျက်ကွက်သည်",
  "Failed to update read status": "ဖတ်ပြီးအခြေအနေပြင်ဆင်ရန်ပျက်ကွက်သည်",
  "Messages": "မက်ဆေ့ခ်ျများ",
  "{{count}} unread items": "မဖတ်ရသေးသော မက်ဆေ့ခ်ျ {{count}} ခု",
  "All caught up": "အားလုံးဖတ်ပြီးပါပြီ",
  "Critical communications from administration": "စီမံခန့်ခွဲရေးမှ အရေးကြီးသောအကြောင်းကြားစာများ",
  "Filter dispatches...": "ရှာဖွေရန်...",
  "Syncing...": "စင့်ခ်လုပ်နေသည်...",
  "Sync Inbox": "အဝင်စာစင့်ခ်လုပ်ရန်",
  "Dispatch Feed": "အကြောင်းကြားစာများ",
  "{{count}} threads": "စကားဝိုင်း {{count}} ခု",
  "{{count}} unread": "{{count}} ခု မဖတ်ရသေးပါ",
  "Live Inbox": "တိုက်ရိုက်အဝင်စာ",
  "Search messages": "မက်ဆေ့ခ်ျရှာဖွေရန်",
  "Refresh messages": "အသစ်ပြန်ယူရန်",
  "No Messages": "မက်ဆေ့ခ်ျမရှိပါ",
  "Nothing matches your current search.": "ရှာဖွေမှုနှင့်ကိုက်ညီသောအရာမရှိပါ။",
  "Untitled Protocol": "ခေါင်းစဉ်မရှိသော အကြောင်းအရာ",
  "System Administrator": "စနစ်စီမံခန့်ခွဲသူ",
  "No content available.": "ပါဝင်သည့်အကြောင်းအရာမရှိပါ။",
  "General": "ယေဘုယျ",
  "Unread": "မဖတ်ရသေးပါ",
  "Read": "ဖတ်ပြီးပါပြီ",
  "Choose a conversation": "စကားဝိုင်းတစ်ခုရွေးချယ်ပါ",
  "Pick any dispatch from the list and we’ll open it in this chat-style view.": "စာရင်းထဲမှ မက်ဆေ့ခ်ျတစ်ခုအားရွေးချယ်၍ ဤနေရာတွင်ဖတ်ရှုနိုင်ပါသည်။",
  "Back to message list": "စာရင်းသို့ပြန်သွားရန်",
  "General Dispatch": "ယေဘုယျအကြောင်းကြားစာ",
  "Mark Unread": "မဖတ်ရသေးဟုမှတ်သားရန်",
  "Acknowledge": "လက်ခံရရှိကြောင်းအတည်ပြုရန်",
  "New": "အသစ်",
  "Origin Source": "ပေးပို့သည့်ရင်းမြစ်",
  "Status": "အခြေအနေ",
  "Reviewed": "စစ်ဆေးပြီး",
  "Awaiting attention": "စောင့်ဆိုင်းဆဲ",
  "End of transmission.": "ပေးပို့မှုပြီးဆုံးသည်။",
  "Review Results": "ရလဒ်များကိုပြန်လည်စစ်ဆေးရန်",
  "Dashboard": "ပင်မစာမျက်နှာ",
  "My Courses": "ကျွန်ုပ်၏သင်တန်းများ",
  "Course Enrollment": "သင်တန်းအပ်နှံခြင်း",
  "Secure Sign Out": "အကောင့်ထွက်ရန်"
};

const enPath = 'C:/Frontend/Frontend/public/locales/en/translation.json';
const myPath = 'C:/Frontend/Frontend/public/locales/my/translation.json';

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const myData = JSON.parse(fs.readFileSync(myPath, 'utf8'));

Object.keys(myanmarAdditions).forEach(key => {
  enData[key] = key; // English uses the same string for the value
  myData[key] = myanmarAdditions[key]; // Myanmar gets translated value
});

fs.writeFileSync(enPath, JSON.stringify(enData, null, 2), 'utf8');
fs.writeFileSync(myPath, JSON.stringify(myData, null, 2), 'utf8');

console.log("Successfully merged the translations!");