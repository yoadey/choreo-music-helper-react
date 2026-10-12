import logo from '@/assets/logo192.png'
import { jumpBy, skipToNextClip, skipToPreviousClip, stopPlayback } from '@/constants/playbackService'
import { useEffect } from 'react'
import TrackPlayer, { useIsPlaying, useProgress } from 'react-native-track-player'
import { useCurrentTrack } from './useCurrentTrack'

type Handler = MediaSessionActionHandler | null

const setHandler = (action: MediaSessionAction, handler: Handler) => {
    try {
        navigator.mediaSession.setActionHandler(action, handler)
    } catch {
        // The browser does not support this action
    }
}

const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
    ['play', () => TrackPlayer.play()],
    ['pause', () => TrackPlayer.pause()],
    ['stop', () => stopPlayback()],
    ['previoustrack', () => skipToPreviousClip()],
    ['nexttrack', () => skipToNextClip()],
    ['seekbackward', (details) => jumpBy(-(details.seekOffset ?? 10))],
    ['seekforward', (details) => jumpBy(details.seekOffset ?? 10)],
    ['seekto', (details) => details.seekTime != null && TrackPlayer.seekTo(details.seekTime)],
]

/** Lock screen / hardware media key integration of the browser. */
export const useMediaSession = () => {
    const { currentTrack } = useCurrentTrack()
    const { playing } = useIsPlaying()
    const { position, duration } = useProgress(1000)
    const title = currentTrack?.title
    const supported = typeof navigator !== 'undefined' && 'mediaSession' in navigator

    useEffect(() => {
        if (!supported) return
        handlers.forEach(([action, handler]) => setHandler(action, handler))
        return () => handlers.forEach(([action]) => setHandler(action, null))
    }, [supported])

    useEffect(() => {
        if (!supported || !title || typeof MediaMetadata === 'undefined') return
        navigator.mediaSession.metadata = new MediaMetadata({
            title,
            artwork: [{ src: logo as unknown as string, sizes: '192x192', type: 'image/png' }],
        })
    }, [supported, title])

    useEffect(() => {
        if (!supported) return
        navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
    }, [supported, playing])

    useEffect(() => {
        if (!supported || !navigator.mediaSession.setPositionState || !(duration > 0)) return
        try {
            navigator.mediaSession.setPositionState({ duration, position: Math.min(position, duration) })
        } catch {
            // Invalid state while a track is loading
        }
    }, [supported, position, duration])
}

export default useMediaSession
