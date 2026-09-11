const http = require('http');

http.get('http://localhost:3000/_next/static/css/app/layout.css', (res) => {
  let css = '';
  res.on('data', (chunk) => (css += chunk));
  res.on('end', () => {
    console.log('CSS Status:', res.statusCode);
    console.log('CSS Length:', css.length);
    console.log('CSS Snippet:\n', css.slice(0, 500));
  });
});
