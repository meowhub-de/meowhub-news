# MeowHub News

Schlanker Newsdienst mit öffentlicher Webseite, RSS 2.0 und Logto-geschützter Admin-Oberfläche. News werden atomar als JSON im persistenten Volume gespeichert.

## Dockhand

Als Git Deploy die Datei `compose.yml` verwenden. Die Anwendung läuft wie `stadt-hoeren` in einem internen Compose-Netzwerk und veröffentlicht den Host-Port `HOST_PORT`. Der Reverse Proxy routet `https://DOMAIN` auf `http://127.0.0.1:HOST_PORT`.

In Dockhand müssen mindestens `DOMAIN`, `HOST_PORT`, `SESSION_SECRET`, `LOGTO_ISSUER`, `LOGTO_CLIENT_ID`, `LOGTO_SECRET` und `LOGTO_ADMIN_EMAILS` als Compose-Variablen angelegt werden. Für deine aktuelle Konfiguration ist `HOST_PORT=3003` korrekt. Die Caddy-Upstream-Adresse lautet `127.0.0.1:3003`.

GitHub: `gh repo create noobproxmox/meowhub-news --public --source . --remote origin --push`. Ein Actions-Workflow ist nicht nötig, wenn Dockhand auf Push/Git Deploy reagiert.
