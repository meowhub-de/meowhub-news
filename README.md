# MeowHub News

Schlanker Newsdienst mit öffentlicher Webseite, RSS 2.0 und Logto-geschützter Admin-Oberfläche. News werden atomar als JSON im persistenten Volume gespeichert.

## Dockhand

Als Git Deploy die Datei `compose.yml` verwenden. Das externe Netzwerk `dockhand_proxy` muss existieren. Variablen aus `.env.example` in Dockhand hinterlegen; `LOGTO_SECRET` wird als Logto Client Secret verwendet. Die Redirect-URI in Logto lautet exakt `https://DOMAIN/auth/callback`, der Post-Sign-out-Redirect `https://DOMAIN/`.

GitHub: `gh repo create noobproxmox/meowhub-news --public --source . --remote origin --push`. Ein Actions-Workflow ist nicht nötig, wenn Dockhand auf Push/Git Deploy reagiert.
