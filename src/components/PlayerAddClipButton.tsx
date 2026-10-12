import { colors } from '@/constants/tokens'
import { addClipAtCurrentPosition } from '@/helpers/player'
import { useCurrentTrack } from '@/hooks/useCurrentTrack'
import { t } from '@/i18n'
import { database } from '@/model/index.web'
import { createClip } from '@/model/trackRepository'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { ComponentProps } from 'react'
import { TouchableOpacity } from 'react-native'

type IconProps = Omit<ComponentProps<typeof MaterialCommunityIcons>, 'name'>

export const PlayerAddClipButton = ({ ...iconProps }: IconProps) => {
    const { currentTrack } = useCurrentTrack()

    const addClipToTrack = async () => {
        if (!currentTrack) return
        await addClipAtCurrentPosition(currentTrack, (track, position) =>
            createClip(database, track, { title: t.newClip, position }),
        )
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
