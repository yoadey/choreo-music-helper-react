import { database } from '@/model/index.web'
import TrackWithClips from '@/model/track'
import { setLastTrack, useLoopEnd, useLoopStart } from '@/store/playbackState'
import { useCurrentTrackStore } from '@/store/store'
import { get } from 'idb-keyval'
import { useEffect } from 'react'
import { Platform } from 'react-native'
import TrackPlayer, { useActiveTrack } from 'react-native-track-player'

export const useCurrentTrack = () => {
    const activeTrack = useActiveTrack()
    const { currentTrack, setCurrentTrack } = useCurrentTrackStore()
    const [loopStart, setLoopStart] = useLoopStart()
    const [loopEnd, setLoopEnd] = useLoopEnd()

    useEffect(() => {
        if (!activeTrack || activeTrack.headers?.id == currentTrack?.id) {
            return
        }

        database.get<TrackWithClips>('tracks')
            .find(activeTrack.id)
            .then(setCurrentTrack)
    }, [activeTrack])

    const setCurrentTrackIntern = (track: TrackWithClips) => {
        setCurrentTrack(track)
        setLastTrack(track.id)
        setLoopStart(undefined)
        setLoopEnd(undefined)
        let id = track.id
        let url = track.uri
        let title = track.title

        const setEverything = async () => {
            let uri = url
            if (Platform.OS === 'web') {
                try {
                    const blob = await get(url);
                    const blobUrl = URL.createObjectURL(blob);
                    uri = blobUrl;
                } catch (error) {
                    console.log("File not found locally: " + url)
                    return
                }
            }
            await TrackPlayer.reset()
            await TrackPlayer.load({
                headers: {
                    id: id,
                },
                url: uri,
                title: title
            })
        }
        setEverything()
    }
    return {
        currentTrack,
        setCurrentTrack: setCurrentTrackIntern
    }
}