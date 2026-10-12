// GitHub Pages (and most static hosts) have no single page app fallback:
// serving the app shell as 404.html makes deep links like /info work after a reload.
import { copyFileSync } from 'node:fs'

copyFileSync('dist/index.html', 'dist/404.html')
