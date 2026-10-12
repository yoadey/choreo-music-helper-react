import {
    buildClipRanges,
    ClipLike,
    ClipRange,
    computeSpeedFactor,
    computeVolume,
    fitLoopToTrack,
    getLoopSeekTarget,
    getNextClipTarget,
    getPreviousClipTarget,
    getStopTarget,
    leadInStart,
    LoopRange,
    resolveLoop,
    SPEED_FADE_DURATION,
} from '@/helpers/playback'
import { isTrackLoading, playCurrentTrack, reloadCurrentTrackAfterError } from '@/helpers/player'
import Clip from '@/model/clip'
import { database } from '@/model/index.web'
import {
    getGlobalSpeedOnly,
    getLeadInDuration,
    getLeadInVolume,
    getLeadOutDuration,
    getLeadOutVolume,
    getLoopEndId,
    getLoopStartId,
    getSpeed,
    preferences,
} from '@/store/playbackState'
import { publishProgress, refreshProgress } from '@/store/progress'
import { useCurrentTrackStore, useLoopStatusStore } from '@/store/store'
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
    // null: not subscribed yet (undefined: no song)
    trackId: null as string | undefined | null,
    clipsPending: false,
    subscription: undefined as Subscription | undefined,
    lastRate: undefined as number | undefined,
    lastVolume: undefined as number | undefined,
}

const recompute = () => {
    state.ranges = buildClipRanges(state.clips, state.duration)
    state.loop = state.clipsPending
        ? undefined
        : resolveLoop(state.prefs.loopStartId, state.prefs.loopEndId, state.ranges)
    // While the clips of a newly selected song are read, a set loop is shown as active (not as invalid)
    const active = state.clipsPending ? !!(state.prefs.loopStartId && state.prefs.loopEndId) : !!state.loop
    const loopStatus = useLoopStatusStore.getState()
    if (loopStatus.active !== active) loopStatus.setActive(active)
}

const subscribeToClips = (trackId: string | undefined) => {
    if (trackId === state.trackId) return
    state.subscription?.unsubscribe()
    state.subscription = undefined
    state.trackId = trackId
    state.clips = []
    state.clipsPending = !!trackId
    recompute()
    if (!trackId) return
    state.subscription = database
        .get<Clip>('clips')
        .query(Q.where('track_id', trackId))
        .observeWithColumns(['position', 'speed'])
        .subscribe((clips) => {
            state.clips = clips.map((clip) => ({ id: clip.id, position: clip.position, speed: clip.speed }))
            state.clipsPending = false
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

/** Seeks and publishes the new position right away (no progress polling while paused). */
const seekAndPublish = async (position: number) => {
    await TrackPlayer.seekTo(position)
    await refreshProgress()
}

/**
 * Controls of the user (buttons, media keys): without a loaded song (e.g. before the player is set up,
 * which happens lazily on the web) they do nothing, and they never reject.
 */
const control =
    <A extends unknown[]>(action: (...args: A) => Promise<void>) =>
    async (...args: A) => {
        if (!useCurrentTrackStore.getState().currentTrack) return
        try {
            await action(...args)
        } catch (error) {
            console.warn('The player control failed', error)
        }
    }

export const seekTo = control(seekAndPublish)

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
    const { prefs, ranges } = state
    const rate = prefs.globalSpeedOnly
        ? prefs.speed
        : prefs.speed *
          computeSpeedFactor(position, ranges, SPEED_FADE_DURATION, { loop: state.loop, leadOut: prefs.leadOut })
    // The loop as it can be played (it ends shortly before the track end), for the volume and the jump
    const { loop, leadOut } = state.loop
        ? fitLoopToTrack({ loop: state.loop, leadOut: prefs.leadOut, duration: state.duration, rate })
        : { loop: undefined, leadOut: prefs.leadOut }

    await Promise.all([setRate(rate), setVolume(computeVolume({ position, ...prefs, loop, leadOut }))])

    const target = getLoopSeekTarget({ position, loop, leadIn: prefs.leadIn, leadOut })
    if (target !== null) {
        await seekAndPublish(target)
    }
}

const applyIfPlaying = async (position: number) => {
    if (state.playerState === State.Playing) {
        await applyPlaybackRules(position)
    }
}

export const pausePlayback = control(() => TrackPlayer.pause())

/** Stops the playback without unloading the track, so it can be played again directly. */
export const stopPlayback = control(async () => {
    await TrackPlayer.pause()
    await getProgress()
    await seekAndPublish(getStopTarget(getActiveLoop(), state.prefs.leadIn))
})

/** Clip start positions, sorted (the ranges are sorted when they are computed) */
const clipStarts = () => state.ranges.map((range) => range.start)

export const skipToNextClip = control(async () => {
    const { position } = await getProgress()
    const target = getNextClipTarget(position, clipStarts(), state.prefs.leadIn)
    if (target !== null) {
        await seekAndPublish(target)
    }
})

export const skipToPreviousClip = control(async () => {
    const { position } = await getProgress()
    await seekAndPublish(getPreviousClipTarget(position, clipStarts(), state.prefs.leadIn))
})

/** Seeks to the start of a clip, including the lead in. */
export const seekToClip = control(async (clipPosition: number) => {
    await seekAndPublish(leadInStart(clipPosition, state.prefs.leadIn))
})

export const jumpBy = control(async (seconds: number) => {
    const { position, duration } = await getProgress()
    const target = Math.max(position + seconds, 0)
    await seekAndPublish(duration > 0 ? Math.min(target, duration) : target)
})

const syncPlayWhenReady = (playWhenReady: boolean) => {
    TrackPlayer.setPlayWhenReady(playWhenReady).catch(() => {
        // The player is not set up, there is nothing to sync
    })
}

/**
 * Restarts an active loop when the track ended. Usually the loop jumps back shortly before the end (see
 * fitLoopToTrack); this covers progress updates that came too late, e.g. in a background tab.
 */
const handleTrackEnded = async () => {
    // The user selected another song meanwhile: neither jump in it nor start it
    if (isTrackLoading()) return
    // Updates the duration, which a loop up to the end of the track needs
    await getProgress()
    const loop = getActiveLoop()
    if (!loop) return
    await seekAndPublish(getStopTarget(loop, state.prefs.leadIn))
    // Not if the user selected another song meanwhile: selecting a song never starts it
    await playCurrentTrack({ unlessLoading: true })
}

export const playbackService = async () => {
    state.prefs = readPreferences()
    state.lastRate = undefined
    state.lastVolume = undefined
    // The clips (and the loop) of the loaded song: the last song may not be loaded (e.g. its file is missing)
    subscribeToClips(useCurrentTrackStore.getState().currentTrack?.id)
    useCurrentTrackStore.subscribe(({ currentTrack }) => subscribeToClips(currentTrack?.id))
    TrackPlayer.getPlaybackState()
        .then(({ state: playbackState }) => {
            state.playerState ??= playbackState
        })
        .catch(() => {
            // The player is not set up yet, the state arrives with the next event
        })

    // Several preferences are often changed at once (e.g. the OK of a dialog, selecting a song): they are
    // applied once afterwards, so no intermediate states (e.g. of the loop) are published or played
    let changeScheduled = false
    preferences.addOnValueChangedListener(() => {
        if (changeScheduled) return
        changeScheduled = true
        queueMicrotask(() => {
            changeScheduled = false
            state.prefs = readPreferences()
            recompute()
            getProgress()
                .then(({ position }) => applyIfPlaying(position))
                .catch(() => {
                    // The player is not set up yet
                })
        })
    })

    TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, async ({ position, duration }) => {
        updateDuration(duration)
        // The UI is updated from these events. While hidden only whole seconds (enough for the lock screen,
        // which also gets the current rate with them), the exact position is refreshed when visible again.
        const hidden = typeof document !== 'undefined' && document.hidden
        publishProgress(hidden ? Math.floor(position) : position, duration)
        await applyIfPlaying(position)
    })

    TrackPlayer.addEventListener(Event.PlaybackState, async ({ state: playbackState }) => {
        state.playerState = playbackState
        // The UI shows Play/Pause from "play when ready". On the web the player does not update it when the
        // browser pauses (e.g. headphones unplugged), the track ends or a new track is loaded.
        if (playbackState !== State.Buffering && playbackState !== State.Loading) {
            syncPlayWhenReady(playbackState === State.Playing)
        }
        refreshProgress()
        if (playbackState === State.Ended) {
            await handleTrackEnded()
        } else if (playbackState === State.Error) {
            // The web player unloads the song on errors: without reloading it Play would do nothing
            await reloadCurrentTrackAfterError()
        }
    })


    TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, () => {
        // A newly loaded track starts with the player defaults
        state.duration = 0
        recompute()
        state.lastRate = undefined
        state.lastVolume = undefined
        refreshProgress()
    })

    TrackPlayer.addEventListener(Event.RemotePlay, () => playCurrentTrack())
    TrackPlayer.addEventListener(Event.RemotePause, pausePlayback)
    TrackPlayer.addEventListener(Event.RemoteStop, stopPlayback)
    TrackPlayer.addEventListener(Event.RemoteNext, skipToNextClip)
    TrackPlayer.addEventListener(Event.RemotePrevious, skipToPreviousClip)
    TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) => seekTo(position))
    TrackPlayer.addEventListener(Event.RemoteJumpBackward, ({ interval }) => jumpBy(-(interval ?? 10)))
    TrackPlayer.addEventListener(Event.RemoteJumpForward, ({ interval }) => jumpBy(interval ?? 10))
}
