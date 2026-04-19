const fs = require('fs');

let c = fs.readFileSync('App.tsx', 'utf8');

c = c.replace('import AdminDashboard from "./pages/AdminDashboard";', 'import IntegratedAdminPortal from "./pages/IntegratedAdminPortal";');

c = c.replace(
  '<Route\n                  path="/admin/dashboard"\n                  element={<AdminDashboard user={user} onLogout={handleLogout} />}\n                />',
  '<Route\n                  path="/admin/dashboard"\n                  element={<IntegratedAdminPortal user={user} onLogout={handleLogout} />}\n                />'
);

// Fallback in case spacing varies
c = c.replace(
  /<Route\s+path="\/admin\/dashboard"\s+element=\{<AdminDashboard user=\{user\}\s+onLogout=\{handleLogout\}\s*\/>\}\s*\/>/g,
  '<Route path="/admin/dashboard" element={<IntegratedAdminPortal user={user} onLogout={handleLogout} />} />'
);


fs.writeFileSync('App.tsx', c);
console.log('App.tsx updated to use IntegratedAdminPortal.');