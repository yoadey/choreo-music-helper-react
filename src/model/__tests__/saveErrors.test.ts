import { describe, expect, it, jest } from '@jest/globals'
import { createSaveFailureReporter, isQuotaError, toSaveError } from '../saveErrors'

const quota = () => new DOMException('full', 'QuotaExceededError')

describe('toSaveError', () => {
    it('takes the error of the IndexedDB transaction event that LokiJS reports', () => {
        const event = { type: 'abort', target: { error: quota() } }
        expect(isQuotaError(toSaveError(event))).toBe(true)
    })

    it('keeps errors and wraps anything else', () => {
        const error = new Error('broken')
        expect(toSaveError(error)).toBe(error)
        expect(toSaveError({ type: 'abort' })).toBeInstanceOf(Error)
    })
})

describe('createSaveFailureReporter', () => {
    const messages = { storageFull: 'full', saveFailed: 'failed' }

    it('tells the user once that changes are not saved, again after a save worked in between', () => {
        const show = jest.fn()
        const reporter = createSaveFailureReporter(show, messages)
        reporter.failed({ target: { error: quota() } })
        reporter.failed(new Error('again'))
        expect(show).toHaveBeenCalledTimes(1)
        expect(show).toHaveBeenLastCalledWith('full')
        reporter.succeeded()
        reporter.failed(new Error('other'))
        expect(show).toHaveBeenLastCalledWith('failed')
    })
})

describe('createSaveFailureReporter while a caller reports its own save failures', () => {
    const messages = { storageFull: 'full', saveFailed: 'failed' }

    it('does not show failures of the background save meanwhile (the import reports them)', async () => {
        const show = jest.fn()
        const reporter = createSaveFailureReporter(show, messages)
        await reporter.whileReportedByCaller(async () => {
            reporter.failed(new Error('background save'))
        })
        expect(show).not.toHaveBeenCalled()
    })

    it('only counts a failure as reported when the caller reported a save failure', async () => {
        const show = jest.fn()
        const reporter = createSaveFailureReporter(show, messages)
        // E.g. the import failed for another reason: later save failures are still shown
        await expect(
            reporter.whileReportedByCaller(async () => {
                throw new Error('not a save failure')
            }),
        ).rejects.toThrow()
        reporter.failed(new Error('edit'))
        expect(show).toHaveBeenCalledTimes(1)
        // The caller reported a save failure: not shown again until a save worked
        reporter.succeeded()
        show.mockClear()
        reporter.markReported()
        reporter.failed(new Error('clean up'))
        expect(show).not.toHaveBeenCalled()
        reporter.succeeded()
        reporter.failed(new Error('edit'))
        expect(show).toHaveBeenCalledTimes(1)
    })
})
