import logo from '@/assets/logo192.png'
import { useEffect } from 'react'
import { Image } from 'react-native'
import TrackPlayer from 'react-native-track-player'
import { useCurrentTrack } from './useCurrentTrack'

export const useMediaSession = () => {
    const { currentTrack } = useCurrentTrack()
    const title = currentTrack?.title

    useEffect(() => {
        if (!title) return
        TrackPlayer.updateMetadataForTrack(0, {
            title,
            artwork: Image.resolveAssetSource(logo).uri,
        }).catch(() => {
            // No track loaded yet
        })
    }, [title])
}

export default useMediaSession
