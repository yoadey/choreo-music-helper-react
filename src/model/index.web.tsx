import { showMessage } from '@/helpers/dialogs'
import { t } from '@/i18n'
import { Database } from '@nozbe/watermelondb'
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs'
import Clip from './clip'
import { createSaveFailureReporter, toSaveError } from './saveErrors'
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
const getLoki = (): Loki | undefined => (adapter as unknown as { _driver?: { loki?: Loki } })._driver?.loki

/**
 * Writes pending changes to IndexedDB. LokiJS only autosaves every 500 ms, so changes made right before
 * the tab is closed or reloaded (e.g. directly after an import) would otherwise be lost.
 * Rejects if the changes could not be written (e.g. the storage is full).
 */
export const flushDatabase = () =>
    new Promise<void>((resolve, reject) => {
        const loki = getLoki()
        if (!loki) return resolve()
        loki.saveDatabase((error) => (error ? reject(toSaveError(error)) : resolve()))
    })

const saveFailures = createSaveFailureReporter(showMessage, t)

/** Runs an action that reports its own save failures (e.g. the import), so they are not shown twice. */
export const withOwnSaveFailureReport = <T,>(action: () => Promise<T>) => saveFailures.whileReportedByCaller(action)

/** The caller told the user that saving failed (e.g. its clean up then fails to save as well). */
export const markSaveFailureReported = () => saveFailures.markReported()

const flushInBackground = () => {
    flushDatabase()
        .then(() => saveFailures.succeeded())
        .catch((error) => {
            // LokiJS tries again with the next change; the user is told, edits would be lost after a reload
            console.warn('Could not save the database', error)
            saveFailures.failed(error)
        })
}

if (typeof window !== 'undefined') {
    database.withChangesForTables(['tracks', 'clips']).subscribe(flushInBackground)
    window.addEventListener('pagehide', flushInBackground)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flushInBackground()
    })
}
