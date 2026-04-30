#!/bin/bash

# Forcefully update the Masterchief Builder app on the VPS
# Run this if git pull is failing or code is stale.

cd /var/www/masterchief

echo "--- 1. Resetting local changes ---"
git add .
git stash
git checkout main
git pull origin main --force

echo "--- 2. Installing dependencies ---"
npm install

echo "--- 3. Running build ---"
npm run build

echo "--- 4. Restarting app ---"
pm2 restart "masterchief-app"

echo "--- DONE! ---"
echo "Try visiting your builder and deploying again."
