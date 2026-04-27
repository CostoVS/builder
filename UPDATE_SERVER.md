# How to Pull Updates and Rebuild the Server

Here are the exact commands to copy and paste into your VPS terminal to pull the latest code updates (the better error reporting I added), rebuild the application, and restart it.

Copy and paste this entire block:

```bash
cd /var/www/masterchief
sudo git pull origin main
npm install
npm run build
pm2 restart "masterchief-app"
```

### 🚨 Don't forget the Database Fix!
If you still get the `password authentication failed` error after pulling and rebuilding, make sure you also run the database fix commands from the previous step:

```bash
sudo -u postgres psql -c "CREATE USER builder_admin WITH PASSWORD 'Nic6604211989!';" || sudo -u postgres psql -c "ALTER USER builder_admin WITH PASSWORD 'Nic6604211989!';"
sudo -u postgres psql -c "CREATE DATABASE builder_masterchief_co_za OWNER builder_admin;" || true
sudo -u postgres psql -c "ALTER DATABASE builder_masterchief_co_za OWNER TO builder_admin;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE builder_masterchief_co_za TO builder_admin;"
```
