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
 * save works again, as every change tries to save.
 */
export const createSaveFailureReporter = (
    show: (message: string) => void,
    messages: { storageFull: string; saveFailed: string },
) => {
    let reported = false
    let reportedByCaller = 0
    return {
        failed(error: unknown) {
            if (reported || reportedByCaller > 0) return
            reported = true
            show(isQuotaError(error) ? messages.storageFull : messages.saveFailed)
        },
        succeeded() {
            reported = false
        },
        /** A caller told the user that saving failed: not shown again until a save worked */
        markReported() {
            reported = true
        },
        /** Runs an action that reports its own save failures (e.g. the import), so they are not shown twice */
        async whileReportedByCaller<T>(action: () => Promise<T>): Promise<T> {
            reportedByCaller++
            try {
                return await action()
            } finally {
                reportedByCaller--
            }
        },
    }
}
