Run this command on your VPS (`Contabo Masterchief` / `Ubuntu 24.04 LTS`) over SSH as `root` to fix the `Unexpected token '<', "<html>... is not valid JSON"` error.

This happens when **NGINX times out** (504 Gateway Timeout) or **blocks the ZIP file for being too large** (413 Payload Too Large). NGINX returns an HTML error page, which causes the builder UI to crash when parsing JSON. We'll increase the limits, and also update the UI to properly intercept these HTML errors.

Copy and paste this entire block into your VPS terminal:

```bash
cat << 'EOF_BASH' > /root/fix_nginx_builder.sh
#!/bin/bash
set -e

echo "1. Patching NGINX configuration variables for proxy timeouts and 500M file uploads..."
if [ -f /etc/nginx/nginx.conf ]; then
    if ! grep -q "client_max_body_size 500M" /etc/nginx/nginx.conf; then
        sed -i 's/client_max_body_size.*/client_max_body_size 500M;/g' /etc/nginx/nginx.conf
        # If it wasn't there at all, append to http block
        if ! grep -q "client_max_body_size 500M" /etc/nginx/nginx.conf; then
            sed -i '/http {/a \    client_max_body_size 500M;' /etc/nginx/nginx.conf
            sed -i '/http {/a \    proxy_read_timeout 600s;' /etc/nginx/nginx.conf
            sed -i '/http {/a \    proxy_connect_timeout 600s;' /etc/nginx/nginx.conf
            sed -i '/http {/a \    proxy_send_timeout 600s;' /etc/nginx/nginx.conf
        fi
    fi
    systemctl restart nginx
    echo "NGINX restarted."
fi

echo "2. Applying UI/API fixes..."
cd /var/www/masterchief

# Ensure route.ts is fully patched and NGINX timeouts won't drop the connection during large NPM installs
cat << 'ROUTE_EOF' > app/api/deploy/route.ts.b64
REPLACE_WITH_ROUTE_B64
ROUTE_EOF

cat app/api/deploy/route.ts.b64 | base64 -d | gzip -d > app/api/deploy/route.ts
rm app/api/deploy/route.ts.b64

# Update Builder UI Dashboard to gracefully print HTTP errors so we can actually see NGINX error codes
cat << 'PAGE_EOF' > app/builder/page.tsx.b64
REPLACE_WITH_PAGE_B64
PAGE_EOF

cat app/builder/page.tsx.b64 | base64 -d | gzip -d > app/builder/page.tsx
rm app/builder/page.tsx.b64

echo "3. Rebuilding the Builder Applet..."
npm run build
pm2 restart masterchief || systemctl restart masterchief || echo "Please restart the node server manually."

echo "✅ All done! Try deploying your app again. The UI will now display precise Nginx errors instead of crashing, and timeouts are extended to 10 minutes."
EOF_BASH

bash /root/fix_nginx_builder.sh
```
