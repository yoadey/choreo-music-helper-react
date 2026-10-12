/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * In-memory replacement for react-native-track-player used by the unit tests.
 */
type Listener = (payload: any) => unknown

const listeners = new Map<string, Set<Listener>>()

export const playerState = {
    position: 0,
    duration: 0,
    state: 'none' as string,
    volume: 1,
    rate: 1,
}

const TrackPlayer = {
    addEventListener: jest.fn((event: string, listener: Listener) => {
        if (!listeners.has(event)) listeners.set(event, new Set())
        listeners.get(event)!.add(listener)
        return { remove: () => listeners.get(event)?.delete(listener) }
    }),
    registerPlaybackService: jest.fn(),
    setupPlayer: jest.fn(async () => undefined),
    updateOptions: jest.fn(async () => undefined),
    setRepeatMode: jest.fn(async () => undefined),
    reset: jest.fn(async () => undefined),
    load: jest.fn(async () => undefined),
    play: jest.fn(async () => {
        playerState.state = 'playing'
    }),
    pause: jest.fn(async () => {
        playerState.state = 'paused'
    }),
    stop: jest.fn(async () => {
        playerState.state = 'stopped'
    }),
    seekTo: jest.fn(async (position: number) => {
        playerState.position = position
    }),
    setVolume: jest.fn(async (volume: number) => {
        playerState.volume = volume
    }),
    setRate: jest.fn(async (rate: number) => {
        playerState.rate = rate
    }),
    getRate: jest.fn(async () => playerState.rate),
    getProgress: jest.fn(async () => ({ position: playerState.position, duration: playerState.duration, buffered: 0 })),
    getPlaybackState: jest.fn(async () => ({ state: playerState.state })),
    getActiveTrack: jest.fn(async () => undefined),
    updateMetadataForTrack: jest.fn(async () => undefined),
}

/** Emits a player event to all registered listeners and waits for async listeners. */
export const emitPlayerEvent = async (event: string, payload: any = {}) => {
    await Promise.all([...(listeners.get(event) ?? [])].map((listener) => listener(payload)))
}

export const resetTrackPlayerMock = () => {
    listeners.clear()
    Object.assign(playerState, { position: 0, duration: 0, state: 'none', volume: 1, rate: 1 })
    Object.values(TrackPlayer).forEach((fn) => (fn as jest.Mock).mockClear())
}

export const Event = {
    PlaybackState: 'playback-state',
    PlaybackError: 'playback-error',
    PlaybackQueueEnded: 'playback-queue-ended',
    PlaybackActiveTrackChanged: 'playback-active-track-changed',
    PlaybackProgressUpdated: 'playback-progress-updated',
    RemotePlay: 'remote-play',
    RemotePause: 'remote-pause',
    RemoteStop: 'remote-stop',
    RemoteNext: 'remote-next',
    RemotePrevious: 'remote-previous',
    RemoteJumpForward: 'remote-jump-forward',
    RemoteJumpBackward: 'remote-jump-backward',
    RemoteSeek: 'remote-seek',
}

export const State = {
    None: 'none',
    Ready: 'ready',
    Playing: 'playing',
    Paused: 'paused',
    Stopped: 'stopped',
    Loading: 'loading',
    Buffering: 'buffering',
    Error: 'error',
    Ended: 'ended',
}

export const Capability = {
    Play: 'play',
    Pause: 'pause',
    Stop: 'stop',
    SkipToNext: 'next',
    SkipToPrevious: 'previous',
    JumpForward: 'jump-forward',
    JumpBackward: 'jump-backward',
    SeekTo: 'seek-to',
}

export const RepeatMode = { Off: 0, Track: 1, Queue: 2 }

export const useActiveTrack = jest.fn(() => undefined)
export const useIsPlaying = jest.fn(() => ({ playing: false, bufferingDuringPlay: false }))
export const useProgress = jest.fn(() => ({ position: playerState.position, duration: playerState.duration, buffered: 0 }))

export default TrackPlayer
