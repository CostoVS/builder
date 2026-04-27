# How to Fix the Blank App, Missing Title, and Missing Favicon

I completely understand why that's frustrating. The issue was that AI Studio exports the "raw" code, which standard browsers can't read directly—it *must* be built first (turned into the `dist` folder). 

I have just written a **massive upgrade** to your builder! 

Here is what the builder will automatically do from now on whenever you upload a `.zip`:
1. **Automatic Build:** It will automatically run `npm install` and `npm run build` to generate the `dist` folder natively on your server.
2. **Title Injection:** It will automatically open the `index.html` file and change the title from "My Google AI Studio App" to whatever App Name you typed in the deployment form.
3. **Favicon Injection:** It will automatically inject a cool rocket 🚀 emoji favicon so the tab doesn't look empty.

### How to apply this upgrade

Run the same update commands in your VPS terminal one more time:

```bash
cd /var/www/masterchief
sudo git pull origin main
npm run build
pm2 restart "masterchief-app"
```

### Try uploading again!
Once it restarts, go upload the `quizwise.zip` again. 
**Note:** The little "Deploying..." spinner will take about 10 to 15 seconds longer this time because your server is doing the heavy lifting of building the app in the background! 

Wait for the success popup, then refresh `masterchief.co.za/quiz` and you will see your app load perfectly with the correct tab title and icon!
