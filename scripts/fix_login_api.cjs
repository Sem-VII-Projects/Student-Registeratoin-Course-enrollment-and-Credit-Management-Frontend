const fs = require('fs');

const files = [
  'src/pages/AdminLogin.jsx',
  'src/pages/LoginPage.jsx',
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    let c = fs.readFileSync(f, 'utf8');
    c = c.replace(/import\s*\{\s*api\s*\}\s*from\s*['"]\.\.\/api\/client(?:\.js)?['"];?/g, "import { api } from '../lib/api';");
    fs.writeFileSync(f, c);
    console.log('Fixed', f);
  }
});
