const fs = require('fs');

let content = `import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;`;

if (content.includes('export default')) {
    if (content.includes('nextConfig = {')) {
         content = content.replace('nextConfig = {', "nextConfig = {\n  output: 'export',\n  images: { unoptimized: true },");
    } else {
         content = "/** @type {import('next').NextConfig} */\n" + 
                   "const _mcConfig = { output: 'export', images: { unoptimized: true } };\n" + 
                   content.replace(/export default\s+/, "const _userConfig = ") + 
                   "\nexport default { ...(_userConfig || {}), ..._mcConfig };";
    }
}
fs.writeFileSync('patched-test.ts', content);
console.log('done writing');
