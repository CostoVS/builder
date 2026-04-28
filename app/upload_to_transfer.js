const fs = require('fs');
const https = require('https');

function uploadFile(filename, filepath) {
    const fileData = fs.readFileSync(filepath);
    
    const options = {
        hostname: 'transfer.sh',
        path: '/' + filename,
        method: 'PUT',
        headers: {
            'Content-Type': 'text/plain',
            'Content-Length': fileData.length
        }
    };

    const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
            console.log('Upload successful for ' + filename + ':');
            console.log(body);
        });
    });

    req.on('error', (e) => {
        console.error(e);
    });

    req.write(fileData);
    req.end();
}

uploadFile('route.ts', './public/route.txt');
uploadFile('page.tsx', './public/builder.txt');
