import { useMMKVBoolean, useMMKVNumber, useMMKVString } from 'react-native-mmkv'
import { Platform } from 'react-native'
import {
    KEY_GLOBAL_SPEED_ONLY,
    KEY_LEAD_IN_DURATION,
    KEY_LEAD_IN_VOLUME,
    KEY_LEAD_OUT_DURATION,
    KEY_LEAD_OUT_VOLUME,
    KEY_SPEED,
    preferences,
} from './playbackState'

/**
 * Selectable display sizes, 1 is the normal size. Only smaller sizes: a larger initial scale of the viewport does
 * not reduce the layout width, it would just zoom into the page (the browser zoom enlarges the app).
 */
export const UI_SCALES = [0.75, 0.8, 0.85, 0.9, 1] as const

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

/**
 * Keeps the screen on while playing and shortly after (see useKeepAwake). On by default.
 */
export const KEY_KEEP_AWAKE = 'keepAwake'
export const useKeepAwakeSetting = () => {
    const [keepAwake, setKeepAwake] = useMMKVBoolean(KEY_KEEP_AWAKE, preferences)
    return [keepAwake ?? true, setKeepAwake] as const
}

/**
 * What the "previous" button does:
 * - previous: always jumps to the previous clip
 * - restart: jumps to the start of the current clip, to the previous one when pressed right at the start
 */
export type BackButtonMode = 'previous' | 'restart'
export const KEY_BACK_BUTTON = 'backButton'
const toBackButtonMode = (value: string | undefined): BackButtonMode => (value === 'restart' ? 'restart' : 'previous')
export const useBackButtonMode = () => {
    const [mode, setMode] = useMMKVString(KEY_BACK_BUTTON, preferences)
    return [toBackButtonMode(mode), (value: BackButtonMode) => setMode(value)] as const
}
export const getBackButtonMode = () => toBackButtonMode(preferences.getString(KEY_BACK_BUTTON))

/**
 * Layout of the player controls: large (two rows of buttons) or compact (one row, for small screens).
 */
export type PlayerLayout = 'large' | 'compact'
export const KEY_PLAYER_LAYOUT = 'playerLayout'
export const usePlayerLayout = () => {
    const [layout, setLayout] = useMMKVString(KEY_PLAYER_LAYOUT, preferences)
    return [layout === 'compact' ? 'compact' : 'large', (value: PlayerLayout) => setLayout(value)] as const
}

/**
 * Allows the device to turn the app into landscape format, off by default (the installed app stays in portrait format
 * as set in the manifest, see useOrientationLock). The layout does not depend on it, it follows the size of the window
 * (see useControlsSide). Only offered where the browser can lock the orientation at all (touch devices with the
 * Screen Orientation API), the native app is fixed to portrait format (app.json).
 */
export const KEY_ALLOW_ROTATION = 'allowRotation'
export const isRotationSupported =
    Platform.OS === 'web' &&
    typeof screen !== 'undefined' &&
    typeof (screen.orientation as { lock?: unknown } | undefined)?.lock === 'function' &&
    typeof navigator !== 'undefined' &&
    navigator.maxTouchPoints > 0
export const useAllowRotation = () => {
    const [allow, setAllow] = useMMKVBoolean(KEY_ALLOW_ROTATION, preferences)
    return [isRotationSupported && (allow ?? false), setAllow] as const
}

/**
 * Side of the screen on which the player controls are shown next to the songs / clips in landscape format. Only on
 * the web, the native app is fixed to portrait format (app.json).
 */
export const isLandscapeLayoutSupported = Platform.OS === 'web'
export type ControlsSide = 'right' | 'left'
export const KEY_CONTROLS_SIDE = 'controlsSide'
export const useControlsSideSetting = () => {
    const [side, setSide] = useMMKVString(KEY_CONTROLS_SIDE, preferences)
    return [side === 'left' ? 'left' : 'right', (value: ControlsSide) => setSide(value)] as const
}

/** Settings that are included in a backup (the loop refers to clips and is not part of it). */
export const SETTINGS_KEYS = [
    KEY_UI_SCALE,
    KEY_KEEP_AWAKE,
    KEY_BACK_BUTTON,
    KEY_PLAYER_LAYOUT,
    KEY_ALLOW_ROTATION,
    KEY_CONTROLS_SIDE,
    KEY_SPEED,
    KEY_GLOBAL_SPEED_ONLY,
    KEY_LEAD_IN_DURATION,
    KEY_LEAD_OUT_DURATION,
    KEY_LEAD_IN_VOLUME,
    KEY_LEAD_OUT_VOLUME,
] as const
