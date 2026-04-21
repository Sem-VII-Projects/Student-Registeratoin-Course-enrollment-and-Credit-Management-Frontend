const http = require('http');

http.get('http://localhost:8080/api/students', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log(res.statusCode);
    console.log(data.substring(0, 500));
  });
});
