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

describe('createSaveFailureReporter while the app is hidden or reporting itself', () => {
    const messages = { storageFull: 'full', saveFailed: 'failed' }

    it('shows the message when the app is visible again (alerts are dropped while hidden)', () => {
        const show = jest.fn()
        let visible = false
        const reporter = createSaveFailureReporter(show, messages, () => visible)
        reporter.failed(new Error('broken'))
        expect(show).not.toHaveBeenCalled()
        visible = true
        reporter.visible()
        expect(show).toHaveBeenCalledWith('failed')
    })

    it('does not report failures of saves that are reported by the caller (e.g. the import)', async () => {
        const show = jest.fn()
        const reporter = createSaveFailureReporter(show, messages)
        await expect(
            reporter.whileReportedByCaller(async () => {
                reporter.failed(new Error('background save'))
                throw new Error('import failed')
            }),
        ).rejects.toThrow('import failed')
        expect(show).not.toHaveBeenCalled()
        // The user was told by the caller: a later failure (e.g. saving the clean up) is not shown again ...
        reporter.failed(new Error('clean up'))
        expect(show).not.toHaveBeenCalled()
        // ... until a save worked in between
        reporter.succeeded()
        reporter.failed(new Error('edit'))
        expect(show).toHaveBeenCalledTimes(1)
    })
})
