Please run this diagnostic script on your VPS as `root`. It will check what's returning the 405 error, dump the Next.js logs, and automatically fix PM2 process mismatches.

```bash
cat << 'EOF_BASH' > /root/diagnose_405.sh
#!/bin/bash
echo "--- 1. Testing Local Node Server (direct POST without NGINX) ---"
curl -X POST http://127.0.0.1:3000/api/deploy -H "Content-Type: application/zip" -d "test" -s -o /dev/null -w "HTTP Status Local: %{http_code}\\n"

echo "--- 2. Testing Nginx Proxy ---"
curl -X POST http://127.0.0.1/api/deploy -H "Content-Type: application/zip" -H "Host: masterchief.co.za" -d "test" -s -o /dev/null -w "HTTP Status NGINX: %{http_code}\\n"

echo "--- 3. PM2 Status ---"
pm2 status

echo "--- 4. pm2 logs (last 15 lines) ---"
pm2 logs --lines 15 --nostream

EOF_BASH

bash /root/diagnose_405.sh
```

**Can you share the output after running this script on your VPS?** 