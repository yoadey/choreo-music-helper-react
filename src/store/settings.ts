import { useMMKVNumber } from 'react-native-mmkv'
import { Platform } from 'react-native'
import { preferences } from './playbackState'

/** Selectable display sizes, 1 is the normal size. */
export const UI_SCALES = [0.8, 0.9, 1, 1.1, 1.25] as const

const isValidScale = (scale: number | undefined): scale is number =>
    scale !== undefined && (UI_SCALES as readonly number[]).includes(scale)

/**
 * The display size of the whole app, e.g. 0.8 makes all elements smaller for small phones.
 * Only supported on the web (see applyUiScale).
 */
export const KEY_UI_SCALE = 'uiScale'
export const isUiScaleSupported = Platform.OS === 'web'
export const useUiScale = () => {
    const [scale] = useMMKVNumber(KEY_UI_SCALE, preferences)
    return isValidScale(scale) ? scale : 1
}
export const getUiScale = () => {
    const scale = preferences.getNumber(KEY_UI_SCALE)
    return isUiScaleSupported && isValidScale(scale) ? scale : 1
}
export const setUiScale = (scale: number) => {
    preferences.set(KEY_UI_SCALE, scale)
    applyUiScale()
}

const VIEWPORT = 'width=device-width, viewport-fit=cover'

/**
 * Applies the stored display size to the page. The initial scale of the viewport enlarges the layout width
 * (e.g. 450 instead of 360 pixels at 0.8), so everything is shown smaller while touch coordinates, sliders and
 * gestures keep working unchanged. Mobile browsers only, desktop browsers ignore the viewport (there the
 * browser zoom does the same).
 */
export const applyUiScale = () => {
    if (!isUiScaleSupported || typeof document === 'undefined') return
    const meta = document.querySelector('meta[name="viewport"]')
    meta?.setAttribute('content', `${VIEWPORT}, initial-scale=${getUiScale()}`)
}
