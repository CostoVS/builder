# Fix for the Blank App

You are absolutely right. The app built successfully, but it was "blank" because the browser was trying to look for the code at `masterchief.co.za/assets/...` instead of `masterchief.co.za/quiz/assets/...`. This is a classic issue when deploying exported code into a subfolder.

I have updated the builder's code again. At the very end of the build step, it will now surgically open `index.html` and rewrite all the Vite paths to point precisely to your custom slug (`/quiz/assets/...`) so the browser knows exactly where to find the JavaScript and CSS.

### Run these commands on your VPS one last time

```bash
cd /var/www/masterchief
sudo git pull origin main
npm run build
pm2 restart "masterchief-app"
```

### Try uploading again!
1. Wait for PM2 to restart
2. Go back to `builder.masterchief.co.za`
3. Upload `quizwise.zip` to the exact same slug (`quiz`) - it will overwrite the broken one.
4. Once it says success, refresh `masterchief.co.za/quiz` and your shiny app will be sitting there waiting for you!
