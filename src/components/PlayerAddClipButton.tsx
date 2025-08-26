import { colors } from '@/constants/tokens'
import { useCurrentTrack } from '@/hooks/useCurrentTrack'
import Clip from '@/model/clip'
import { database } from '@/model/index.web'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { ComponentProps } from 'react'
import TrackPlayer from 'react-native-track-player'

type IconProps = Omit<ComponentProps<typeof MaterialCommunityIcons>, 'name'>

export const PlayerAddClipButton = ({ ...iconProps }: IconProps) => {
    const { currentTrack } = useCurrentTrack()

    const addClipToTrack = () => {
        if (!currentTrack) return

        TrackPlayer.getProgress().then((progress) => {
            database.write(async () => {
                database.get<Clip>('clips').create((clip) => {
                    clip.track.set(currentTrack)
                    clip.title = `New clip`
                    clip.color = `#00000000`
                    clip.position = progress.position
                    clip.speed = 1
                })
            })
        })
    }

    return (
        <MaterialCommunityIcons
            name={'playlist-plus'}
            onPress={addClipToTrack}
            color={colors.icon}
            {...iconProps}
        />
    )
}
