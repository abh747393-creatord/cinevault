const http = require('http');

const urls = [
  'http://localhost:3000/',
  'http://localhost:3000/api/stream/c-tears-of-steel',
  'http://localhost:3000/movies',
  'http://localhost:3000/tv',
  'http://localhost:3000/anime',
  'http://localhost:3000/movie/tears-of-steel',
  'http://localhost:3000/tv/chronicles-of-the-multiverse',
  'http://localhost:3000/watch/movie/c-tears-of-steel',
  'http://localhost:3000/watch/tv/c-open-chronicles/ep-oc-101',
  'http://localhost:3000/admin',
  'http://localhost:3000/search?q=sintel',
  'http://localhost:3000/my-list',
  'http://localhost:3000/history',
  'http://localhost:3000/profile',
  'http://localhost:3000/settings',
  'http://localhost:3000/login',
  'http://localhost:3000/signup',
];

async function checkUrl(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ url, status: res.statusCode, length: data.length });
      });
    }).on('error', (err) => resolve({ url, status: 'ERROR', error: err.message }));
  });
}

(async () => {
  let allPass = true;
  for (const url of urls) {
    const res = await checkUrl(url);
    const pass = res.status === 200;
    if (!pass) allPass = false;
    console.log(`${pass ? 'PASS' : 'FAIL'} [${res.status}] ${res.url} (${res.length} bytes)`);
  }
  process.exit(allPass ? 0 : 1);
})();
