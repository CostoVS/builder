# Fix the Bash "Event Not Found" Error

I see exactly what happened in your screenshot! The error `-bash: !': event not found` happens because your password contains an exclamation mark (`!`). By default, the Linux terminal (Bash) thinks `!` is a special command for history and breaks when you try to paste it.

To fix this, we will use a special formatting block that tells the terminal to ignore the `!` and just run the SQL commands exactly as they are.

Copy and paste this **ENITRE BLOCK** (from `sudo` all the way down to `EOF`) into your terminal and hit Enter:

```bash
sudo -u postgres psql << 'EOF'
DROP ROLE IF EXISTS builder_admin;
CREATE USER builder_admin WITH SUPERUSER CREATEDB CREATEROLE LOGIN PASSWORD 'Nic6604211989!';
CREATE DATABASE builder_masterchief_co_za;
ALTER DATABASE builder_masterchief_co_za OWNER TO builder_admin;
GRANT ALL PRIVILEGES ON DATABASE builder_masterchief_co_za TO builder_admin;
EOF
```

After you run that, restart PM2 to apply the database changes:

```bash
pm2 restart "masterchief-app"
```

Now try the upload again in your browser!
