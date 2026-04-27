# VPS Deployment Guide

Here are the step-by-step instructions to get your app running on your fresh Ubuntu 24.04 LTS Contabo VPS.

## 1. System Update & Dependencies

Log in to your VPS via SSH as root, then run:

```bash
# Update the system
sudo apt update && sudo apt upgrade -y

# Install git, curl, and build tools
sudo apt install -y git curl build-essential unzip
```

## 2. Install Node.js & PM2

We will use Node.js version 20 and PM2 to keep the app running in the background.

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2
```

## 3. Install & Configure PostgreSQL

Install the database server and create your user and database.

```bash
# Install Postgres
sudo apt install -y postgresql postgresql-contrib

# Switch to the postgres user to create the database and user
sudo -u postgres psql

# Inside the psql console, run these commands (exactly as shown):
CREATE USER builder_admin WITH PASSWORD 'Nic6604211989!';
CREATE DATABASE builder_masterchief_co_za OWNER builder_admin;
\q
```

## 4. Install Nginx & Certbot (for SSL)

Nginx will route traffic to your Next.js app.

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

## 5. Clone the Repository & Build the App

```bash
# Create directory for the app
sudo mkdir -p /var/www/masterchief
cd /var/www/masterchief

# Ensure empty directory (if needed)
# sudo rm -rf * (if you have conflicting files)

# Clone your GitHub repository
sudo git clone https://github.com/CostoVS/builder.git .

# Change ownership so your regular user (or root) can install modules
sudo chown -R $USER:$USER /var/www/masterchief
```

> **Note:** If `git clone` fails because the directory is not empty, clone into a temp folder and move the files, or just `git init`, `git remote add origin https://github.com/CostoVS/builder.git`, `git fetch --all`, `git checkout main -f`.

**Install dependencies and build:**

```bash
# Install dependencies
npm install

# Build the Next.js production app
npm run build

# Set up the Deployment directory for the builder to extract zip files
sudo mkdir -p /var/www/apps
sudo chown -R $USER:$USER /var/www/apps
```

## 6. Configure the Environment Variables

Create the `.env` file for the production environment.

```bash
nano .env
```

Paste the following into the file:

```env
# Required for the database connection (using the credentials created in Step 3)
DATABASE_URL="postgres://builder_admin:Nic6604211989!@localhost:5432/builder_masterchief_co_za"

# Set node environment to production
NODE_ENV="production"
```
Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

## 7. Start the App with PM2

Start the Next.js server managed by PM2 so it stays alive after you close SSH.

```bash
pm2 start npm --name "masterchief-app" -- start

# Save the PM2 list so it restarts on system reboot
pm2 save
pm2 startup
# (Run the command PM2 tells you to run after executing pm2 startup)
```

## 8. Configure Nginx

You need Nginx to listen on port 80/443 for your domains and pass the traffic to Next.js on port 3000.

Create a new Nginx configuration file:

```bash
sudo nano /etc/nginx/sites-available/masterchief
```

Paste the following configuration:

```nginx
server {
    listen 80;
    listen [::]:80;
    
    # Catch both domains (and variations)
    server_name masterchief.co.za www.masterchief.co.za builder.masterchief.co.za;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Increase max body size for zip file uploads
        client_max_body_size 100M;
    }
}
```

Save and exit. Now enable the site and test Nginx:

```bash
# Disable the default config
sudo rm /etc/nginx/sites-enabled/default

# Enable your site
sudo ln -s /etc/nginx/sites-available/masterchief /etc/nginx/sites-enabled/

# Test Nginx syntax
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## 9. Secure with SSL (HTTPS)

Run Certbot to get free SSL certificates for your domains:

```bash
sudo certbot --nginx -d masterchief.co.za -d www.masterchief.co.za -d builder.masterchief.co.za
```

Follow the prompts. Choose to redirect HTTP to HTTPS when asked.

## 10. Done!

- **masterchief.co.za** will show the animated landing page.
- **builder.masterchief.co.za** will show the unified builder interface (Login: admin / Nic6604211989!).
- Any ZIP files you upload via the builder will be extracted to `/var/www/apps/<slug>` and served at **masterchief.co.za/slug**.
