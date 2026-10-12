import { colors } from '@/constants/tokens'
import { confirmAction } from '@/helpers/dialogs'
import { releaseTrack } from '@/helpers/player'
import { t } from '@/i18n'
import { database } from '@/model/index.web'
import TrackWithClips from '@/model/track'
import { deleteTrack } from '@/model/trackRepository'
import { defaultStyles } from '@/styles'
import { useActionSheet } from '@expo/react-native-action-sheet'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { del } from 'idb-keyval'
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableHighlight, View } from 'react-native'
import { useIsPlaying } from 'react-native-track-player'

export type TracksListItemProps = {
    track: TrackWithClips
    // The record is mutated in place on updates, so the displayed values are passed explicitly
    title: string
    color: string
    index: number
    isActive: boolean
    onTrackSelect: (track: TrackWithClips) => void
}

const removeStoredFile = async (key: string) => {
    if (Platform.OS === 'web') await del(key)
}

export const TracksListItem = ({ track, title, color, index, isActive, onTrackSelect }: TracksListItemProps) => {
    const { playing } = useIsPlaying()
    const { showActionSheetWithOptions } = useActionSheet()
    const router = useRouter()
    const displayTitle = title || t.untitledTrack
    const backgroundColor = color || '#00000000'

    const handleDelete = async () => {
        if (!(await confirmAction(t.confirmDeleteTrack(displayTitle)))) return
        await releaseTrack(track.id)
        await deleteTrack(database, track, removeStoredFile)
    }

    const handleLongPress = () => {
        showActionSheetWithOptions(
            {
                options: [t.delete, t.edit, t.cancel],
                cancelButtonIndex: 2,
                destructiveButtonIndex: 0,
                containerStyle: { backgroundColor: colors.backgroundHighlighted },
                textStyle: { color: colors.text },
            },
            (selectedIndex) => {
                if (selectedIndex === 1) {
                    router.push(`/(modals)/edit-track?trackId=${track.id}`)
                } else if (selectedIndex === 0) {
                    handleDelete()
                }
            },
        )
    }

    return (
        <TouchableHighlight
            activeOpacity={0.8}
            onPress={() => onTrackSelect(track)}
            onLongPress={handleLongPress}
            style={{ backgroundColor }}
            testID={`track-${index}`}
        >
            <View style={[styles.trackItemContainer, { backgroundColor }]}>
                <View style={styles.row}>
                    <Text numberOfLines={1} style={styles.trackIndexText}>
                        {index + 1}
                    </Text>
                    <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={styles.trackTitleText}>
                            {displayTitle}
                        </Text>
                    </View>
                    {isActive &&
                        (playing ? (
                            <ActivityIndicator size="small" color={colors.icon} testID="active-track-playing" />
                        ) : (
                            <Ionicons name="play" size={24} color={colors.icon} testID="active-track" />
                        ))}
                </View>
            </View>
        </TouchableHighlight>
    )
}

const styles = StyleSheet.create({
    trackItemContainer: {
        alignItems: 'flex-start',
        width: '100%',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    trackIndexText: {
        ...defaultStyles.text,
        textAlign: 'center',
        fontSize: 32,
        fontWeight: '600',
        minWidth: 40,
        paddingRight: 10,
    },
    trackTitleText: {
        ...defaultStyles.text,
        fontSize: 17,
        fontWeight: '600',
    },
})
