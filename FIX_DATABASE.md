# Fix Database Authentication Error

The `password authentication failed for user "builder_admin"` error means the Next.js app successfully opened the connection to your PostgreSQL database server, but the database rejected the login password. 

This usually happens if Step 3 (database setup) was skipped or the password wasn't set correctly in the database itself.

To fix this immediately, copy and paste this **exact block of commands** into your VPS terminal. It will force-create the user, update the password to match your app, and ensure all permissions are correct:

```bash
# 1. Ensure the user exists and the password is correct
sudo -u postgres psql -c "CREATE USER builder_admin WITH PASSWORD 'Nic6604211989!';" || sudo -u postgres psql -c "ALTER USER builder_admin WITH PASSWORD 'Nic6604211989!';"

# 2. Ensure the database exists
sudo -u postgres psql -c "CREATE DATABASE builder_masterchief_co_za OWNER builder_admin;" || true

# 3. Grant the correct ownership and permissions
sudo -u postgres psql -c "ALTER DATABASE builder_masterchief_co_za OWNER TO builder_admin;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE builder_masterchief_co_za TO builder_admin;"

# 4. Restart your app to clear any stuck database connections
pm2 restart "masterchief-app"
```

After pasting this, wait 5 seconds, then try your upload one more time. It should succeed instantly and show your app!
