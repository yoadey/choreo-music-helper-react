import { afterEach, describe, expect, it, jest } from '@jest/globals'
import { showMessage } from '../dialogs'

const setVisibility = (state: 'visible' | 'hidden') => {
    Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
}

describe('showMessage', () => {
    afterEach(() => setVisibility('visible'))

    it('shows messages of a hidden app when it is visible again (browsers drop those dialogs)', () => {
        const alert = jest.spyOn(window, 'alert').mockImplementation(() => undefined)
        setVisibility('hidden')
        showMessage('Import failed')
        expect(alert).not.toHaveBeenCalled()
        setVisibility('visible')
        expect(alert).toHaveBeenCalledWith('Import failed')
        expect(alert).toHaveBeenCalledTimes(1)
        alert.mockRestore()
    })

    it('shows messages right away while visible', () => {
        const alert = jest.spyOn(window, 'alert').mockImplementation(() => undefined)
        showMessage('Saved')
        expect(alert).toHaveBeenCalledWith('Saved')
        alert.mockRestore()
    })
})
