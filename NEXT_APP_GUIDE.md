# How to Protect This App & Build Your Next One

It is great news that it's all loading now! 

To answer your question: **Google AI Studio creates a completely fresh, isolated environment for every new app you build.** It does not have direct access to your VPS. It only goes to your VPS when you manually run the `git pull` commands over SSH.

This means **your new app won't overwrite your current app** in AI Studio. However, to make sure you don't overwrite it on your *VPS* server, you just need to put the next app in a different folder and on a different port.

Here are the commands to see exactly what is being used by the current app, so you can save them for your records:

### 1. View your current App Files
This shows the folder where your code lives:
```bash
ls -la /var/www/masterchief
```

### 2. View your Nginx Server Configuration
This shows how the server routes your specific domains (masterchief.co.za) to this app:
```bash
cat /etc/nginx/sites-available/masterchief
```

### 3. View your PM2 Process Manager
This shows the background name and status of this app:
```bash
pm2 list
```

---

### 🚨 Cheat-Sheet for Hosting Your NEXT App on this same VPS:

When you build your next app in AI Studio and want to put it on this *same* VPS alongside Masterchief, you must change exactly 4 things:

1. **New Folder:** Instead of `/var/www/masterchief`, use a new folder like `/var/www/second-app`
2. **New PM2 Name:** Instead of `masterchief-app`, name it something else:
   `pm2 start npm --name "second-app" -- start -- -p 3001`
3. **New Port:** Notice the `-p 3001` above? The Masterchief app uses Port **3000**. Every new app must use a unique port (3001, 3002, 3003, etc.) so they don't crash into each other.
4. **New Nginx File:** You will create another Nginx config using a new domain name, pointing to `http://127.0.0.1:3001` (matching your new port).

Save this information! Whenever you are ready to put your next app onto the VPS, you can paste this file back to me or any AI, and we will immediately know how to slot it perfectly next to your Masterchief app without breaking it.
