# Choreo Music Helper

Web app (PWA) to rehearse choreographies: split a song into clips, loop parts of it (A/B loop with
lead-in and lead-out) and practice them at different speeds.

The app runs completely in the browser. There is no server part: audio files and clips are stored in
the browser (IndexedDB), the built app is a set of static files that can be hosted anywhere
(e.g. GitHub Pages) and works offline after the first visit.

Built with Expo (React Native for Web), Expo Router, WatermelonDB and react-native-track-player.

## Requirements

- Node.js 24 (see `.nvmrc`)

## Development

```bash
npm install
npm run web          # development server
npm run lint
npm run typecheck
npm test             # unit tests (Jest)
```

## Build and end-to-end tests

```bash
npm run build:web               # static files in dist/ (including the service worker)
npx playwright install chromium # once
npm run test:e2e                # end-to-end tests against dist/
```

To host the app in a sub directory (e.g. a GitHub Pages project site), set the base path for the build
and the tests:

```bash
EXPO_BASE_URL=/choreo-music-helper-react npm run build:web
BASE_PATH=/choreo-music-helper-react npm run test:e2e
```

## Deployment

Pushing a tag `v*` builds the app and deploys it to GitHub Pages (`.github/workflows/deploy.yml`).
The base path is taken from the GitHub Pages configuration automatically.

For an own web server, every CI run (`.github/workflows/ci.yml`, job `web-artifact`) uploads the build as the
artifact `web-<commit>` once the tests pass. It is built for the root of the domain (absolute paths like
`/_expo/...`), unzip it into the web root. Deep links like `/info` need `404.html` as fallback after a reload, e.g.
`ErrorDocument 404 /404.html` (Apache) or `try_files $uri $uri/ /index.html;` (nginx).

`scripts/deploy.sh` installs it without any configuration: copy the script and the downloaded artifact
(`web-<commit>.zip`) into the web root on the server and run it there (needs `unzip`):

```bash
./deploy.sh                  # install the newest *.zip in the directory (or: ./deploy.sh web-<commit>.zip)
./deploy.sh list             # list the backups
./deploy.sh restore [backup] # restore a backup (default: the newest one)
```

The files of the installed version are moved into a backup in `.deploy-backups` first (the newest 5 are kept),
other files in the directory (e.g. `.htaccess`) are not touched. A restore also saves the current version as a
backup, so it can be undone with another restore.
