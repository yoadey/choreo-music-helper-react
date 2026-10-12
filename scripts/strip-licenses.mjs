// Keeps only the fields shown on the licenses screen. The full license texts make the file (and the
// lazily loaded chunk of the web app) several megabytes large.
import { readFileSync, writeFileSync } from 'node:fs'

const file = 'assets/licenses.json'
const licenses = JSON.parse(readFileSync(file, 'utf8'))
const stripped = Object.fromEntries(
    Object.entries(licenses).map(([key, { name, version, type, url, description }]) => [
        key,
        { name, version, type, url, description },
    ]),
)
writeFileSync(file, `${JSON.stringify(stripped, null, 2)}\n`)
