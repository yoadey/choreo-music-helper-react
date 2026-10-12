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
