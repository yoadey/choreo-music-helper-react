// Static file server for the end-to-end tests. Behaves like GitHub Pages: the app can live in a
// sub directory (BASE_PATH) and unknown paths are answered with 404.html.
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'

const root = join(process.cwd(), 'dist')
const basePath = (process.env.BASE_PATH ?? '').replace(/\/$/, '')
const port = Number(process.env.PORT ?? 8081)

const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.ttf': 'font/ttf',
    '.md': 'text/markdown; charset=utf-8',
}

const send = (res, status, file) => {
    res.writeHead(status, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' })
    createReadStream(file).pipe(res)
}

createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    if (!pathname.startsWith(`${basePath}/`) && pathname !== basePath) {
        res.writeHead(404).end('Not found')
        return
    }
    let file = normalize(join(root, pathname.slice(basePath.length)))
    if (!file.startsWith(root)) {
        res.writeHead(403).end()
        return
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
    if (existsSync(file)) send(res, 200, file)
    else send(res, 404, join(root, '404.html'))
}).listen(port, () => console.log(`Serving ${root} at http://localhost:${port}${basePath}/`))
