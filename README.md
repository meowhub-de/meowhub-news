# MeowHub News

Schlanker Newsdienst mit öffentlicher Webseite, RSS 2.0 und Logto-geschützter Admin-Oberfläche. News werden atomar als JSON im persistenten Volume gespeichert.

## Dockhand

Als Git Deploy die Datei `compose.yml` verwenden. Das externe Netzwerk `dockhand_proxy` muss existieren. Variablen aus `.env.example` in Dockhand hinterlegen; `LOGTO_SECRET` wird als Logto Client Secret verwendet. Die Redirect-URI in Logto lautet exakt `https://DOMAIN/auth/callback`, der Post-Sign-out-Redirect `https://DOMAIN/`.

In Dockhand müssen mindestens `DOMAIN`, `HOST_PORT`, `SESSION_SECRET`, `LOGTO_ISSUER`, `LOGTO_CLIENT_ID`, `LOGTO_SECRET` und `LOGTO_ADMIN_EMAILS` als Compose-Variablen angelegt werden. `HOST_PORT` ist der Host-Port, zum Beispiel `8080`, der auf den Container-Port 3000 weiterleitet. Standardmäßig wird das Netzwerk `dockhand_proxy` automatisch erstellt. Wenn bereits ein gemeinsames Proxy-Netzwerk existiert, `DOCKHAND_PROXY_EXTERNAL=true` setzen und dessen Namen in `DOCKHAND_PROXY_NETWORK` eintragen.

GitHub: `gh repo create noobproxmox/meowhub-news --public --source . --remote origin --push`. Ein Actions-Workflow ist nicht nötig, wenn Dockhand auf Push/Git Deploy reagiert.
