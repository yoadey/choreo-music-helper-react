import { database } from '@/model/index.web'
import TrackWithClips from '@/model/track'
import { useEffect, useState } from 'react'
import TrackPlayer, { useActiveTrack } from 'react-native-track-player'

export const useCurrentTrack = () => {
	const activeTrack = useActiveTrack()
	const [currentTrack, setCurrentTrackIntern] = useState<TrackWithClips>()

	useEffect(() => {
		if (!activeTrack) return

        database.get<TrackWithClips>('tracks')
            .find(activeTrack.id)
            .then(setCurrentTrackIntern)
	}, [activeTrack])

    const setCurrentTrack = (track: TrackWithClips) => {
        // TODO: im trackplayer setzen
        TrackPlayer.add({
            id: track.id,
            url: track.uri,
            title: track.title,
        })
        setCurrentTrackIntern(track)
    }
	return { currentTrack, setCurrentTrack }
}