# Final Step: Fix the Connection Refused Error

The reason `masterchief.co.za` worked but `builder.masterchief.co.za` said **"ERR_CONNECTION_REFUSED"** is almost certainly because your browser tried to securely connect (HTTPS on port 443) but **we haven't installed the SSL certificate yet**, so the server rejected the secure connection.

Your screenshots show Nginx is perfectly set up and PM2 is running gracefully. Great job! 

To fix the connection error and secure your sites, copy and paste this **exact block** of commands into your VPS terminal. It will open your firewall, install the SSL certificates, and automatically configure Nginx to use them.

```bash
# 1. Allow web traffic through the firewall
sudo ufw allow 'Nginx Full'
sudo ufw allow 'OpenSSH'

# 2. Restart Nginx to be 100% sure the config is applied
sudo systemctl restart nginx

# 3. Install Certbot (The SSL provider)
sudo apt install -y certbot python3-certbot-nginx

# 4. Generate the SSL Certificates for all your domains 
# (This automatically fixes Nginx to listen on HTTPS port 443 and redirects HTTP)
sudo certbot --nginx -d masterchief.co.za -d www.masterchief.co.za -d builder.masterchief.co.za --non-interactive --agree-tos -m nicholauscostochetty@gmail.com --redirect
```

### What to do next:

1. **Wait 10 seconds** after running the commands.
2. Go to your browser and type EXACTLY: **`https://builder.masterchief.co.za`**
3. You should see the login screen! Use `admin` and `Nic6604211989!` to log in.
4. Go to **`https://masterchief.co.za`** to see your green animated orb.

### Troubleshooting (If it says 502 Bad Gateway)
If the site loads but says "502 Bad Gateway", it means the Node.js app is crashing in the background. If that happens, run:
```bash
pm2 logs masterchief-app --lines 20
```
and show me the red error text! Otherwise, it should all be working smoothly now.
