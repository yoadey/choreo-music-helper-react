import { colors } from '@/constants/tokens'
import { useCurrentTrack } from '@/hooks/useCurrentTrack'
import { t } from '@/i18n'
import Clip from '@/model/clip'
import { database } from '@/model/index.web'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { ComponentProps } from 'react'
import { TouchableOpacity } from 'react-native'
import TrackPlayer from 'react-native-track-player'

type IconProps = Omit<ComponentProps<typeof MaterialCommunityIcons>, 'name'>

export const PlayerAddClipButton = ({ ...iconProps }: IconProps) => {
    const { currentTrack } = useCurrentTrack()

    const addClipToTrack = async () => {
        if (!currentTrack) return
        const { position } = await TrackPlayer.getProgress()
        await database.write(async () => {
            await database.get<Clip>('clips').create((clip) => {
                clip.track.set(currentTrack)
                clip.title = t.newClip
                clip.color = '#00000000'
                clip.position = position
                clip.speed = 1
            })
        })
    }

    return (
        <TouchableOpacity
            onPress={addClipToTrack}
            disabled={!currentTrack}
            accessibilityRole="button"
            accessibilityLabel="Add clip"
            style={{ padding: 10, opacity: currentTrack ? 1 : 0.4 }}
        >
            <MaterialCommunityIcons name="playlist-plus" color={colors.icon} {...iconProps} />
        </TouchableOpacity>
    )
}
