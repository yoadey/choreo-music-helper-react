// GitHub Pages (and most static hosts) have no single page app fallback:
// serving the app shell as 404.html makes deep links like /info work after a reload.
//
// 404.html is served for deep links of any depth (e.g. /info/), where the relative links of the app shell
// (manifest, icon, service worker) would point into that path. They are made absolute with the base path of
// the build (EXPO_BASE_URL, which hosting in a sub directory needs anyway, as the scripts are absolute too).
// This runs before the precache manifest is generated, so its revision of index.html matches.
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'

const base = (process.env.EXPO_BASE_URL ?? '').replace(/\/$/, '')
const html = readFileSync('dist/index.html', 'utf8')
const replacements = [
    ['href="manifest.json"', `href="${base}/manifest.json"`],
    ['href="apple-touch-icon.png"', `href="${base}/apple-touch-icon.png"`],
    [".register('sw.js', { scope: './' })", `.register('${base}/sw.js', { scope: '${base}/' })`],
]
let absolute = html
for (const [relative, replacement] of replacements) {
    if (!absolute.includes(relative)) throw new Error(`postbuild-web: ${relative} not found in dist/index.html`)
    absolute = absolute.replace(relative, replacement)
}
writeFileSync('dist/index.html', absolute)
copyFileSync('dist/index.html', 'dist/404.html')
