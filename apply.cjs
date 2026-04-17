const fs = require('fs');
let s = fs.readFileSync('update_ui.cjs', 'utf-8');
let body = s.substring(s.indexOf('`') + 1, s.lastIndexOf('`'));
fs.writeFileSync('pages/IntegratedAdminPortal.tsx', body);
console.log('Fixed UI');