export function persistStudentSession(data) {
  if (!data) return;
  localStorage.setItem('studentData', JSON.stringify(data));
  if (data.role) {
    localStorage.setItem('role', data.role);
  }
  if (data.token) {
    localStorage.setItem('authToken', data.token);
  }
}

export function getStudentSession() {
  const data = localStorage.getItem('studentData');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

export function clearStudentSession() {
  localStorage.removeItem('studentData');
  localStorage.removeItem('authToken');
}
