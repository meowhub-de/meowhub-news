# MeowHub News

Moderner Newsdienst für MeowHub mit öffentlicher Website, RSS 2.0 und einem über Logto geschützten Newsroom. Meldungen werden atomar als JSON im persistenten Docker-Volume gespeichert.

## Funktionen

- Responsive Oberfläche im Schwarz-Blau-Orange-Design
- Veröffentlichte Meldungen, Entwürfe und hervorgehobene Top-Meldungen
- Erstellen, Bearbeiten, Vorschau, Suchen, Filtern und Löschen im Newsroom
- RSS-Feed unter `/feed.xml`
- OIDC-Anmeldung über Logto mit E-Mail-Allowlist
- Healthcheck unter `/health`
- Sicherheitsheader, sichere Session-Cookies, Payload-Limits und URL-Validierung
- Betrieb als unprivilegierter Node-Benutzer mit reduzierten Container-Capabilities

## Lokale Entwicklung

Voraussetzung ist Node.js 20 oder neuer.

```bash
npm ci
npm test
npm run dev
```

Für lokale Tests werden `DATA_DIR`, `APP_URL` und `SESSION_SECRET` gesetzt. Der automatisierte Test deckt Healthcheck, CRUD, Entwürfe, Veröffentlichung, RSS, Validierung und Admin-Schutz ab.

## Dockhand und Zoraxy

Dockhand verwendet `compose.yml` als Git-Deploy-Datei. Die Anwendung veröffentlicht `HOST_PORT`; Zoraxy routet `news.meowhub.de` auf Dockhand `10.10.20.12:3003`.

Erforderliche Compose-Variablen:

- `DOMAIN=news.meowhub.de`
- `HOST_PORT=3003`
- `SESSION_SECRET` als langer zufälliger Wert
- `LOGTO_ISSUER`, `LOGTO_CLIENT_ID`, `LOGTO_SECRET`
- `LOGTO_ADMIN_EMAILS` als kommaseparierte Allowlist
- optional `LOGTO_INTERNAL_IP`, standardmäßig Zoraxy `10.10.10.10`

Der interne Host-Eintrag für `auth.meowhub.de` verhindert, dass die OIDC-Erkennung auf Dockhand am nicht funktionierenden NAT-Hairpin scheitert.

## Daten, Backup und Rollback

Das benannte Volume `meowhub_news_data` enthält `news.json` und `feed.xml`. Vor einem Deployment sollte das Volume als TAR-Archiv gesichert werden. Der Container läuft als UID/GID 1000; bei älteren root-eigenen Volumes muss der Besitz einmalig korrigiert werden.

Rollback:

1. Vorherigen Git-Commit in Dockhand deployen.
2. Falls das Datenformat oder Volume betroffen ist, den Container stoppen und das gesicherte TAR-Archiv in `meowhub_news_data` zurückspielen.
3. Healthcheck, `/api/news`, `/feed.xml`, Login-Redirect und die öffentliche Route über Zoraxy erneut prüfen.

Die Datenmigration ist rückwärtskompatibel: ältere Einträge erhalten beim Lesen automatisch `status=published`, `featured=false` und Zeitstempel-Fallbacks.
