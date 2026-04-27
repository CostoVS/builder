const fs = require('fs');
async function run() {
  const serveRes = await fetch('http://localhost:3000/api/serve/testslug/assets/index-BSJQDkOE.js');
  console.log('JS Fetch Status:', serveRes.status);
}
run();
