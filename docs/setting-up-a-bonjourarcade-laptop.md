(Placeholder doc)

Install Ubuntu

As a startup application, add:
```
chromium-browser https://bonjourarcade.com/gotw --start-fullscreen --autoplay-policy=no-user-gesture-required --disable-session-crashed-bubble --no-first-run --disable-infobars
```

Add a cronjob to restart the laptop every day. From an admin account,
you must `sudo crontab -e` and add something like `0 4 * * * /sbin/shutdown -r now`
