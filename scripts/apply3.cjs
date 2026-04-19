const fs = require('fs');
let s = fs.readFileSync('pages/IntegratedAdminPortal.tsx', 'utf8');

s = s.replace(/\\\`/g, '`');
s = s.replace(/\\\$/g, '$');

fs.writeFileSync('pages/IntegratedAdminPortal.tsx', s);
console.log('Done');