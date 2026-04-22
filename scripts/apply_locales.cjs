const fs = require('fs');

const enDict = {
  "Academic Year": "Academic Year",
  "Period": "Period",
  "Cohort": "Cohort",
  "Specialization": "Specialization",
  "Inventory ID": "Inventory ID",
  "All Tiers": "All Tiers",
  "Full Cycle": "Full Cycle",
  "All Sec": "All Sec",
  "All Majors": "All Majors",
  "Bulk Import": "Bulk Import",
  "Insert Result": "Insert Result",
  "Commit Metrics": "Commit Metrics",
  "Evaluation Matrix": "Evaluation Matrix",
  "90-100 (Superior)": "90-100 (Superior)",
  "80-89 (Standard)": "80-89 (Standard)",
  "Sub-40 (Deficient)": "Sub-40 (Deficient)",
  "System UID": "System UID",
  "Institutional Identity": "Institutional Identity",
  "Catalog Course": "Catalog Course",
  "Semester": "Semester",
  "Scaled Evaluation": "Scaled Evaluation",
  "Grade": "Grade",
  "Actions": "Actions",
  "Zero Records Discovered": "Zero Records Discovered",
  "Record Performance": "Record Performance",
  "Modifying student record": "Modifying student record",
  "Apply Change": "Apply Change",
  "Discard": "Discard",
  "Cancel": "Cancel",
  "Log Result": "Log Result",
  "Edit Metric": "Edit Metric",
  "Student Identifier *": "Student Identifier *",
  "Catalog Course Code *": "Catalog Course Code *",
  "Examination Score (0-100)": "Examination Score (0-100)",
  "Context:": "Context:",
  "Student ID": "Student ID",
  "Course Code": "Course Code",
  "Updated Exam Score": "Updated Exam Score",
  "Search Code...": "Search Code...",
  "Expunge Record": "Expunge Record"
};

const myDict = {
  "Academic Year": "ပညာသင်နှစ်",
  "Period": "ကာလ",
  "Cohort": "အစုအဖွဲ့",
  "Specialization": "အထူးပြုဘာသာရပ်",
  "Inventory ID": "မှတ်တမ်း ကုဒ်",
  "All Tiers": "အဆင့်အားလုံး",
  "Full Cycle": "အချိန်ပြည့်",
  "All Sec": "အတန်းအားလုံး",
  "All Majors": "ဘာသာရပ်အားလုံး",
  "Bulk Import": "အစုလိုက်ထည့်သွင်းရန်",
  "Insert Result": "ရလဒ်ထည့်သွင်းရန်",
  "Commit Metrics": "အမှတ်များမှတ်တမ်းတင်ရန်",
  "Evaluation Matrix": "အကဲဖြတ်မှုဇယား",
  "90-100 (Superior)": "၉၀-၁၀၀ (ထူးချွန်)",
  "80-89 (Standard)": "၈၀-၈၉ (စံနှုန်းမီ)",
  "Sub-40 (Deficient)": "၄၀-အောက် (လိုအပ်ချက်ရှိ)",
  "System UID": "စနစ် ကိုယ်ပိုင်နံပါတ်",
  "Institutional Identity": "ကျောင်းသားအမည်",
  "Catalog Course": "သင်ခန်းစာသင်ရိုး",
  "Semester": "စာသင်နှစ်ဝက်",
  "Scaled Evaluation": "အကဲဖြတ်အမှတ်",
  "Grade": "အဆင့်",
  "Actions": "လုပ်ဆောင်ချက်များ",
  "Zero Records Discovered": "မှတ်တမ်းများ မတွေ့ရှိပါ",
  "Record Performance": "ရလဒ်မှတ်တမ်းတင်ရန်",
  "Modifying student record": "ကျောင်းသားမှတ်တမ်း ပြင်ဆင်နေသည်",
  "Apply Change": "အပြောင်းအလဲလုပ်ရန်",
  "Discard": "ပယ်ဖျက်ရန်",
  "Cancel": "ပယ်ဖျက်ရန်",
  "Log Result": "ရလဒ်မှတ်တမ်းသွင်းရန်",
  "Edit Metric": "ရမှတ်ပြင်ဆင်ရန်",
  "Student Identifier *": "ကျောင်းသား ကိုယ်ပိုင်နံပါတ် *",
  "Catalog Course Code *": "သင်ခန်းစာ ကုဒ် *",
  "Examination Score (0-100)": "စာမေးပွဲ ရမှတ် (၀-၁၀၀)",
  "Context:": "အကြောင်းအရာ:",
  "Student ID": "ကျောင်းသား ကတ်နံပါတ်",
  "Course Code": "သင်ခန်းစာ ကုဒ်",
  "Updated Exam Score": "အသစ်ပြင်ဆင်ထားသော ရမှတ်",
  "Search Code...": "ကုဒ် ရှာဖွေပါ...",
  "Expunge Record": "မှတ်တမ်းဖယ်ရှားရန်"
};

const enPath = 'public/locales/en/translation.json';
const myPath = 'public/locales/my/translation.json';

let enJ = JSON.parse(fs.readFileSync(enPath, 'utf8'));
let myJ = JSON.parse(fs.readFileSync(myPath, 'utf8'));

for (let k in enDict) enJ[k] = enDict[k];
for (let k in myDict) myJ[k] = myDict[k];

fs.writeFileSync(enPath, JSON.stringify(enJ, null, 2), 'utf8');
fs.writeFileSync(myPath, JSON.stringify(myJ, null, 2), 'utf8');

console.log("Locales successfully updated");
