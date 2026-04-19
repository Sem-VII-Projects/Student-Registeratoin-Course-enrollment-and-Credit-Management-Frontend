const fs = require('fs');
let content = fs.readFileSync('pages/AdminGrading.tsx', 'utf8');

// Do we have useTranslation?
if (!content.includes('useTranslation')) {
  // inject it
  content = content.replace("import React, { useState, useEffect, useRef } from 'react';", "import React, { useState, useEffect, useRef } from 'react';\nimport { useTranslation } from 'react-i18next';");
}

const functionDecl = 'const AdminGrading: React.FC<GradingProps> = ({ user, onLogout }) => {';
if (content.includes(functionDecl) && !content.includes('const { t } = useTranslation();')) {
  content = content.replace(functionDecl, functionDecl + '\n  const { t } = useTranslation();');
} else if (!content.includes('const { t } = useTranslation();')) {
    console.log("Could not find where to inject 	 automatically");
}
// Find strings and wrap them:
// >Academic Year< -> >{t("Academic Year")}< 
console.log("Applying transformations...");
