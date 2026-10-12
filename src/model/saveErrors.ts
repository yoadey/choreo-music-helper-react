/**
 * LokiJS reports a failed IndexedDB save with the event of the transaction, not with an Error: the
 * actual error (e.g. QuotaExceededError) is the error of the transaction.
 */
export const toSaveError = (error: unknown): Error => {
    if (error instanceof Error) return error
    const cause = (error as { target?: { error?: unknown } } | null | undefined)?.target?.error
    if (cause instanceof Error) return cause
    return new Error('The database could not be saved')
}

export const isQuotaError = (error: unknown) => toSaveError(error).name === 'QuotaExceededError'

/**
 * Tells the user that changes could not be saved (they would be lost after a reload). Only once until a
 * save works again, as every change tries to save. While the app is hidden (alerts are dropped, e.g. during
 * pagehide) the message is shown when it is visible again.
 */
export const createSaveFailureReporter = (
    show: (message: string) => void,
    messages: { storageFull: string; saveFailed: string },
    canShow: () => boolean = () => true,
) => {
    let reported = false
    let pending: unknown
    let reportedByCaller = 0
    const report = (error: unknown) => {
        if (reported || reportedByCaller > 0) return
        if (!canShow()) {
            pending = error
            return
        }
        reported = true
        pending = undefined
        show(isQuotaError(error) ? messages.storageFull : messages.saveFailed)
    }
    return {
        failed: report,
        succeeded() {
            reported = false
            pending = undefined
        },
        /** Call when the app is visible again */
        visible() {
            if (pending !== undefined) report(pending)
        },
        /** Runs an action that reports its own save failures (e.g. the import), so they are not shown twice */
        async whileReportedByCaller<T>(action: () => Promise<T>): Promise<T> {
            reportedByCaller++
            try {
                return await action()
            } catch (error) {
                // The caller told the user: later failures (e.g. of its clean up) only after a save worked
                reported = true
                pending = undefined
                throw error
            } finally {
                reportedByCaller--
            }
        },
    }
}
