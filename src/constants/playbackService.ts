import {
    buildClipRanges,
    ClipLike,
    ClipRange,
    computeSpeedFactor,
    computeVolume,
    getLoopSeekTarget,
    getNextClipTarget,
    getPreviousClipTarget,
    getStopTarget,
    LoopRange,
    resolveLoop,
    SPEED_FADE_DURATION,
} from '@/helpers/playback'
import Clip from '@/model/clip'
import { database } from '@/model/index.web'
import {
    getGlobalSpeedOnly,
    getLastTrack,
    getLeadInDuration,
    getLeadInVolume,
    getLeadOutDuration,
    getLeadOutVolume,
    getLoopEndId,
    getLoopStartId,
    getSpeed,
    KEY_LAST_TRACK,
    preferences,
} from '@/store/playbackState'
import { useLoopStatusStore } from '@/store/store'
import { Q } from '@nozbe/watermelondb'
import TrackPlayer, { Event, State } from 'react-native-track-player'
import type { Subscription } from 'rxjs'

const readPreferences = () => ({
    speed: getSpeed(),
    globalSpeedOnly: getGlobalSpeedOnly(),
    leadIn: getLeadInDuration(),
    leadOut: getLeadOutDuration(),
    leadInVolume: getLeadInVolume(),
    leadOutVolume: getLeadOutVolume(),
    loopStartId: getLoopStartId(),
    loopEndId: getLoopEndId(),
})

/** State shared by the playback service and the player controls. */
const state = {
    prefs: readPreferences(),
    clips: [] as ClipLike[],
    duration: 0,
    // Derived from clips, duration and preferences, recomputed only when one of them changes
    ranges: [] as ClipRange[],
    loop: undefined as LoopRange | undefined,
    playerState: undefined as string | undefined,
    restartingLoop: false,
    trackId: undefined as string | undefined,
    subscription: undefined as Subscription | undefined,
    lastRate: undefined as number | undefined,
    lastVolume: undefined as number | undefined,
}

const recompute = () => {
    state.ranges = buildClipRanges(state.clips, state.duration)
    state.loop = resolveLoop(state.prefs.loopStartId, state.prefs.loopEndId, state.ranges)
    const loopStatus = useLoopStatusStore.getState()
    if (loopStatus.active !== !!state.loop) loopStatus.setActive(!!state.loop)
}

const subscribeToClips = (trackId: string | undefined) => {
    if (trackId === state.trackId && state.subscription) return
    state.subscription?.unsubscribe()
    state.subscription = undefined
    state.trackId = trackId
    state.clips = []
    recompute()
    if (!trackId) return
    state.subscription = database
        .get<Clip>('clips')
        .query(Q.where('track_id', trackId))
        .observeWithColumns(['position', 'speed'])
        .subscribe((clips) => {
            state.clips = clips.map((clip) => ({ id: clip.id, position: clip.position, speed: clip.speed }))
            recompute()
        })
}

const updateDuration = (duration: number | undefined) => {
    if (duration && Number.isFinite(duration) && duration > 0 && duration !== state.duration) {
        state.duration = duration
        recompute()
    }
}

const getProgress = async () => {
    const progress = await TrackPlayer.getProgress()
    updateDuration(progress.duration)
    return progress
}

/** The active loop resolved from the current clips, or undefined. */
export const getActiveLoop = (): LoopRange | undefined => state.loop

const setRate = async (rate: number) => {
    if (state.lastRate !== undefined && Math.abs(state.lastRate - rate) < 0.001) return
    state.lastRate = rate
    try {
        await TrackPlayer.setRate(rate)
    } catch {
        // Try again with the next progress update
        state.lastRate = undefined
    }
}

const setVolume = async (volume: number) => {
    if (state.lastVolume !== undefined && Math.abs(state.lastVolume - volume) < 0.001) return
    state.lastVolume = volume
    try {
        await TrackPlayer.setVolume(volume)
    } catch {
        state.lastVolume = undefined
    }
}

/** Applies speed, volume and loop for the current position. */
export const applyPlaybackRules = async (position: number) => {
    const { prefs, ranges, loop } = state

    await Promise.all([
        setRate(prefs.globalSpeedOnly ? prefs.speed : prefs.speed * computeSpeedFactor(position, ranges, SPEED_FADE_DURATION)),
        setVolume(computeVolume({ position, loop, ...prefs })),
    ])

    const target = getLoopSeekTarget({ position, loop, leadIn: prefs.leadIn, leadOut: prefs.leadOut })
    if (target !== null) {
        await TrackPlayer.seekTo(target)
    }
}

const applyIfPlaying = async (position: number) => {
    if (state.playerState === State.Playing) {
        await applyPlaybackRules(position)
    }
}

/** Stops the playback without unloading the track, so it can be played again directly. */
export const stopPlayback = async () => {
    await TrackPlayer.pause()
    await getProgress()
    await TrackPlayer.seekTo(getStopTarget(getActiveLoop(), state.prefs.leadIn))
}

/** Clip start positions, sorted (the ranges are sorted when they are computed) */
const clipStarts = () => state.ranges.map((range) => range.start)

export const skipToNextClip = async () => {
    const { position } = await getProgress()
    const target = getNextClipTarget(position, clipStarts(), state.prefs.leadIn)
    if (target !== null) {
        await TrackPlayer.seekTo(target)
    }
}

export const skipToPreviousClip = async () => {
    const { position } = await getProgress()
    await TrackPlayer.seekTo(getPreviousClipTarget(position, clipStarts(), state.prefs.leadIn))
}

/** Seeks to the start of a clip, including the lead in. */
export const seekToClip = async (clipPosition: number) => {
    await TrackPlayer.seekTo(Math.max(clipPosition - state.prefs.leadIn, 0))
}

export const jumpBy = async (seconds: number) => {
    const { position, duration } = await getProgress()
    const target = Math.max(position + seconds, 0)
    await TrackPlayer.seekTo(duration > 0 ? Math.min(target, duration) : target)
}

/** Seconds before the end of the track that still count as "at the end" */
const TRACK_END_TOLERANCE = 0.5

/** Restarts an active loop when the track ended (the loop end + lead out can lie behind the track end). */
const handleTrackEnded = async () => {
    // The player can report the end twice (state "ended" and "queue ended")
    if (state.restartingLoop) return
    state.restartingLoop = true
    try {
        const { position, duration } = await getProgress()
        // A second end event after the restart: the position is not at the end anymore
        if (duration > 0 && position < duration - TRACK_END_TOLERANCE) return
        const loop = getActiveLoop()
        if (!loop) return
        await TrackPlayer.seekTo(getStopTarget(loop, state.prefs.leadIn))
        await TrackPlayer.play()
    } finally {
        state.restartingLoop = false
    }
}

export const playbackService = async () => {
    state.prefs = readPreferences()
    state.lastRate = undefined
    state.lastVolume = undefined
    state.restartingLoop = false
    subscribeToClips(getLastTrack())
    recompute()
    TrackPlayer.getPlaybackState()
        .then(({ state: playbackState }) => {
            state.playerState ??= playbackState
        })
        .catch(() => {
            // The player is not set up yet, the state arrives with the next event
        })

    preferences.addOnValueChangedListener((key) => {
        state.prefs = readPreferences()
        recompute()
        if (key === KEY_LAST_TRACK) {
            subscribeToClips(getLastTrack())
        }
        getProgress()
            .then(({ position }) => applyIfPlaying(position))
            .catch(() => {
                // The player is not set up yet
            })
    })

    TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, async ({ position, duration }) => {
        updateDuration(duration)
        await applyIfPlaying(position)
    })

    TrackPlayer.addEventListener(Event.PlaybackState, async ({ state: playbackState }) => {
        state.playerState = playbackState
        if (playbackState === State.Ended) {
            await handleTrackEnded()
        }
    })

    TrackPlayer.addEventListener(Event.PlaybackQueueEnded, handleTrackEnded)

    TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, () => {
        // A newly loaded track starts with the player defaults
        state.duration = 0
        recompute()
        state.lastRate = undefined
        state.lastVolume = undefined
    })

    TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play())
    TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause())
    TrackPlayer.addEventListener(Event.RemoteStop, stopPlayback)
    TrackPlayer.addEventListener(Event.RemoteNext, skipToNextClip)
    TrackPlayer.addEventListener(Event.RemotePrevious, skipToPreviousClip)
    TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) => TrackPlayer.seekTo(position))
    TrackPlayer.addEventListener(Event.RemoteJumpBackward, ({ interval }) => jumpBy(-(interval ?? 10)))
    TrackPlayer.addEventListener(Event.RemoteJumpForward, ({ interval }) => jumpBy(interval ?? 10))
}
