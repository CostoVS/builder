We received an HTTP 405 Method Not Allowed error, which might mean Nginx or the Node server is rejecting the POST method for the file upload. Let's diagnose and fix the specific process running the server.

Please run this diagnostic script on your VPS as `root` to check your PM2 process, test the local server vs Nginx, and fix it:

```bash
cat << 'EOF_BASH' > /root/diagnose_405.sh
#!/bin/bash
echo "--- 1. Testing Local Node Server ---"
curl -X POST http://127.0.0.1:3000/api/deploy -H "Content-Type: application/zip" -d "test" -D - -o /dev/null

echo -e "\n\n--- 2. Testing Nginx Server ---"
curl -X POST http://masterchief.co.za/api/deploy -H "Content-Type: application/zip" -d "test" -D - -o /dev/null

echo -e "\n\n--- 3. PM2 Status ---"
pm2 status

echo -e "\n\n--- 4. Nginx Logs (last 5 errors) ---"
tail -n 5 /var/log/nginx/error.log
EOF_BASH

bash /root/diagnose_405.sh
```

**Can you share the output of the terminal after running that?**
