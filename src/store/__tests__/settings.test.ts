import { beforeEach, describe, expect, it } from '@jest/globals'
import { preferences } from '../playbackState'
import { applyUiScale, getUiScale, KEY_UI_SCALE, setUiScale } from '../settings'

const viewport = () => document.querySelector('meta[name="viewport"]')!.getAttribute('content')

describe('display size', () => {
    beforeEach(() => {
        preferences.remove(KEY_UI_SCALE)
        document.head.innerHTML = '<meta name="viewport" content="width=device-width, initial-scale=1">'
    })

    it('is 1 without or with an invalid stored value', () => {
        expect(getUiScale()).toBe(1)
        preferences.set(KEY_UI_SCALE, 0.1)
        expect(getUiScale()).toBe(1)
    })

    it('scales the viewport when changed and on start', () => {
        setUiScale(0.8)
        expect(getUiScale()).toBe(0.8)
        expect(viewport()).toBe('width=device-width, viewport-fit=cover, initial-scale=0.8')

        document.head.innerHTML = '<meta name="viewport" content="width=device-width, initial-scale=1">'
        applyUiScale()
        expect(viewport()).toBe('width=device-width, viewport-fit=cover, initial-scale=0.8')

        setUiScale(1)
        expect(viewport()).toBe('width=device-width, viewport-fit=cover, initial-scale=1')
    })
})
