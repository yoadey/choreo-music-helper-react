import { database } from '@/model/index.web'
import TrackWithClips from '@/model/track'
import { setLastTrack } from '@/store/playbackState'
import { useCurrentTrackStore } from '@/store/store'
import { useEffect } from 'react'
import TrackPlayer, { useActiveTrack } from 'react-native-track-player'
import { useStoredAudioFiles } from './useStoredAudioFiles'

export const useCurrentTrack = () => {
    const activeTrack = useActiveTrack()
    const audioFiles = useStoredAudioFiles()
    const { currentTrack, setCurrentTrack } = useCurrentTrackStore()

    useEffect(() => {
        if (!activeTrack || activeTrack.headers?.id == currentTrack?.id) {
            return
        }

        database.get<TrackWithClips>('tracks')
            .find(activeTrack.id)
            .then(setCurrentTrack)
    }, [activeTrack])

    useEffect(() => {
        if (!currentTrack ||
            !audioFiles.has(currentTrack.id) ||
            audioFiles.get(currentTrack.id) === activeTrack?.url) {
            return
        }

        let id = currentTrack.id
        let url = audioFiles.get(currentTrack.id)!
        let title = currentTrack.title
        TrackPlayer.reset()
            .then(() => {
                TrackPlayer.load({
                    headers: {
                        id: id,
                    },
                    url: url,
                    title: title
                })
            });
    }, [audioFiles, activeTrack, currentTrack])

    const setCurrentTrackIntern = (track: TrackWithClips) => {
        let url = track.uri;
        if (audioFiles && audioFiles.has(track.uri)) {
            url = audioFiles.get(url)!;
        }
        setCurrentTrack(track)
        setLastTrack(track.id)
        TrackPlayer.reset()
            .then(async () => {
                await TrackPlayer.load({
                    headers: {
                        id: track.id,
                    },
                    url: url,
                    title: track.title,
                })
            })
    }
    return {
        currentTrack,
        setCurrentTrack: setCurrentTrackIntern
    }
}