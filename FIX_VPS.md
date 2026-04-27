# Exact Steps to Fix Your VPS

It looks like the `npm audit fix --force` command tried to update Next.js to version `16.x` which broke everything on your VPS, and the `git clone` command was failing because of existing files. Also, PM2 wasn't completely installed.

Let's wipe the directory clean, clone it perfectly, install the correct versions without breaking anything, and get it running.

**Run these commands exactly as written, line by line in your VPS.**

## 1. Clean the Directory and Install PM2

First, let's make sure PM2 is installed and clean out the broken directory.

```bash
# Ensure PM2 is installed globally so the command works
sudo npm install -g pm2

# Go to the parent directory
cd /var/www

# COMPLETELY remove the broken folder
sudo rm -rf masterchief

# Clone the repository freshly into the `masterchief` folder
sudo git clone https://github.com/CostoVS/builder.git masterchief

# Change ownership to you
sudo chown -R $USER:$USER /var/www/masterchief

# Go into the working folder
cd /var/www/masterchief
```

## 2. Install Packages Safely

DO NOT run `npm audit fix --force`. That is what broke Next.js! Just install the packages as they are written in the repository.

```bash
# Install exactly what is in the package.json
npm install
```

## 3. Configure `.env` again

Because we deleted the folder, we need to create the `.env` file again.

```bash
nano .env
```

Paste this string into it (same as before):
```env
DATABASE_URL="postgres://builder_admin:Nic6604211989!@localhost:5432/builder_masterchief_co_za"
NODE_ENV="production"
```
Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

## 4. Build and Start the Application

```bash
# Build the application
npm run build

# Start it using PM2
pm2 start npm --name "masterchief-app" -- start

# Save the PM2 list so it restarts correctly if the server reboots
pm2 save
```

If it builds successfully, your site will be live!

---

**Note about the Turbopack / Eslint warnings:** If you still see a small yellow `Warning:` about Eslint or Turbopack during the build, **DO NOT WORRY**. It is completely harmless. 
If it says `Build error occurred`, show me the screenshot. If it says `Ready in XX ms` and finishes, then it worked!
