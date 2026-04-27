const fs = require('fs');
const path = require('path');

async function run() {
  const fileBuffer = fs.readFileSync('test.zip');
  const blob = new Blob([fileBuffer]);
  const formData = new FormData();
  formData.append('file', blob, 'test.zip');
  formData.append('name', 'Test App');
  formData.append('slug', 'testslug');

  try {
    const res = await fetch('http://localhost:3000/api/deploy', {
      method: 'POST',
      body: formData
    });
    
    // Check if the HTML path actually works via serve
    const serveRes = await fetch('http://localhost:3000/api/serve/testslug');
    const htmlText = await serveRes.text();
    console.log('--- INDEX HTML ---');
    console.log(htmlText);
    
    // Extract the script tag to see if it works
    const match = htmlText.match(/script type="module" crossorigin src="(.*?)"/);
    if (match && match[1]) {
       const jsPath = match[1];
       console.log('Script path:', jsPath);
       
       // Try fetching the JS file through Next.js
       const jsRes = await fetch('http://localhost:3000' + jsPath);
       console.log('JS Fetch Status:', jsRes.status);
    } else {
       console.log('No script tag found!');
    }
    
  } catch (err) {
    console.error(err);
  }
}
run();
