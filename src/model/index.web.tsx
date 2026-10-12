import { showMessage } from '@/helpers/dialogs'
import { t } from '@/i18n'
import { Database } from '@nozbe/watermelondb'
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs'
import Clip from './clip'
import migrations from './migrations'
import schema from './schema'
import TrackWithClips from './track'

const adapter = new LokiJSAdapter({
    schema,
    migrations,
    useWebWorker: false,
    useIncrementalIndexedDB: true,
    onQuotaExceededError: () => {
        showMessage(t.storageFull)
    },
    onSetUpError: () => {
        showMessage(t.databaseError)
    },
    extraIncrementalIDBOptions: {
        onDidOverwrite: () => {
            // Another tab of the app changed the database, continuing here would overwrite those changes
            showMessage(t.otherTabChanged)
        },
        onversionchange: () => {
            // The database was deleted in another tab
            window.location.reload()
        },
    },
})

export const database = new Database({
    adapter,
    modelClasses: [TrackWithClips, Clip],
})

type Loki = { saveDatabase: (callback?: (error?: unknown) => void) => void }

/** The LokiJS instance (only reachable without web worker, which is the configuration used here). */
const getLoki = (): Loki | undefined =>
    (adapter as unknown as { _dispatcher?: { _worker?: { _bridge?: { driver?: { loki?: Loki } } } } })._dispatcher
        ?._worker?._bridge?.driver?.loki

/**
 * Writes pending changes to IndexedDB. LokiJS only autosaves every 500 ms, so changes made right before
 * the tab is closed or reloaded (e.g. directly after an import) would otherwise be lost.
 */
export const flushDatabase = () =>
    new Promise<void>((resolve) => {
        const loki = getLoki()
        if (!loki) return resolve()
        loki.saveDatabase(() => resolve())
    })

if (typeof window !== 'undefined') {
    database.withChangesForTables(['tracks', 'clips']).subscribe(() => {
        flushDatabase()
    })
    window.addEventListener('pagehide', () => {
        flushDatabase()
    })
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flushDatabase()
    })
}
