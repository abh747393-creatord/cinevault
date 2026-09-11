const http = require('http');

http.get('http://localhost:3000', (res) => {
  let html = '';
  res.on('data', (chunk) => (html += chunk));
  res.on('end', () => {
    console.log('HTML Status:', res.statusCode);
    const cssMatch = html.match(/href="(\/_next\/static\/css\/[^"]+\.css)"/i);
    if (!cssMatch) {
      console.log('No CSS match found in HTML. Checking link tags:');
      const allLinks = html.match(/<link[^>]+>/gi) || [];
      console.log(allLinks);
      return;
    }

    const cssPath = cssMatch[1];
    console.log('Found CSS path:', cssPath);

    http.get(`http://localhost:3000${cssPath}`, (cssRes) => {
      let css = '';
      cssRes.on('data', (c) => (css += c));
      cssRes.on('end', () => {
        console.log('CSS HTTP Status:', cssRes.statusCode);
        console.log('CSS Length:', css.length, 'bytes');
        console.log('Sample Tailwind rule:', css.includes('bg-background') || css.includes('#07080d') ? 'YES (Tailwind Cinema Dark present)' : 'NO');
        console.log('First 200 chars:\n', css.slice(0, 200));
      });
    });
  });
});
