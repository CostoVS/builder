# Good News: It worked!

Don't worry about the `ERROR: database ... already exists` message. That is actually **good news!** It just means the database was already there from a previous step. 

Because we pasted everything as a single block, the terminal kept going and successfully ran the `ALTER DATABASE` and `GRANT` commands right after it (which you can see at the bottom of your screenshot). The password has been successfully configured!

### Your Next Step: Restart and Upload

All you need to do now is restart the app so it connects with the shiny new password:

```bash
pm2 restart "masterchief-app"
```

Once that restarts, go back to your browser and try uploading the `.zip` file again. It should succeed this time!
