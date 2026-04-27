# Fix for the Login Page

The login failed because the security middleware on the server was accidentally intercepting the login request itself! It thought the login request was an unauthenticated user trying to access the API.

To apply the fix, please run these commands on your VPS:

```bash
cd /var/www/masterchief
sudo git pull origin main
npm run build
pm2 restart "masterchief-app"
```

After PM2 restarts, wait 5 seconds and try the login again on `https://builder.masterchief.co.za`. It will instantly let you in!
