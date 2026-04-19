const fs = require('fs');
const path = require('path');

const tsxPath = path.join(__dirname, 'Frontend', 'pages', 'AdminCourses.tsx');
let code = fs.readFileSync(tsxPath, 'utf8');

// 1. Rename `t` inside ToastHost map to `toast` to avoid variable shadowing
code = code.replace(/toasts\.map\(\(t\)/g, 'toasts.map((toast)');
code = code.replace(/key=\{t\.id\}/g, 'key={toast.id}');
code = code.replace(/t\.type/g, 'toast.type');
code = code.replace(/t\.title/g, 'toast.title');
code = code.replace(/t\.message/g, 'toast.message');
code = code.replace(/onDismiss\(t\.id\)/g, 'onDismiss(toast.id)');

// 2. Add imports
if (!code.includes('useTranslation')) {
  code = code.replace(/import React, \{([^{}]+)\} from "react";/, 'import React, { $1 } from "react";\nimport { useTranslation } from "react-i18next";');
}

// 3. Inject const { t } = useTranslation(); inside functional components
const components = [
  'ToastHost', 'ConfirmModal', 'MultiSelectChips', 'TagInput', 
  'CourseWizardModal', 'AdminCourses'
];

for (const comp of components) {
  const regex = new RegExp(`(function ${comp}\\b(?:[^{}]*\\{[^{}]*\\})*\\s*\\{[\\s\\S]*?\\{.*?\\}(?:[^]*?)\\s*)\\{`, 'm');
  // It's hard to inject exactly. Let's do string replacement for the exact signature.
}

// Write file
fs.writeFileSync(tsxPath, code, 'utf8');

// Update JSONs
// ... (script continues)
