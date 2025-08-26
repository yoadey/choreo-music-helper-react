import { colors } from '@/constants/tokens'
import { database } from '@/model/index.web'
import TrackWithClips from '@/model/track'
import { defaultStyles } from '@/styles'
import { useActionSheet } from '@expo/react-native-action-sheet'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { del } from 'idb-keyval'
import { ActivityIndicator, StyleSheet, Text, TouchableHighlight, View } from 'react-native'
import { useActiveTrack, useIsPlaying } from 'react-native-track-player'

export type TracksListItemProps = {
        track: TrackWithClips
        index: number
        onTrackSelect: (track: TrackWithClips) => void
}

export const TracksListItem = ({
        track,
        index,
        onTrackSelect: handleTrackSelect,
}: TracksListItemProps) => {
        const { playing } = useIsPlaying()
        const { showActionSheetWithOptions } = useActionSheet();
        const router = useRouter();

	const isActiveTrack = useActiveTrack()?.url === track.uri

        const handleClipLongPress = (track: TrackWithClips) => {
                const options = ['Delete', 'Edit', 'Cancel'];
                const destructiveButtonIndex = 0;
                const cancelButtonIndex = 2;

		showActionSheetWithOptions({
			options,
			cancelButtonIndex,
			destructiveButtonIndex,
			containerStyle: {
				backgroundColor: colors.backgroundHighlighted,
			},
			textStyle: {
				color: colors.text,
			},
		}, (selectedIndex) => {
                        switch (selectedIndex) {
                                case 1:
                                        router.push(`/(modals)/edit-track?trackId=${track.id}`);
                                        break;

                                case destructiveButtonIndex:
                                        database.write(async () => {
                                                await database.get<TrackWithClips>('tracks')
                                                        .find(track.id)
                                                        .then(track => {
                                                                del(track.uri);
                                                                track?.destroyPermanently();
                                                        });
                                        });
                                        break;

                                case cancelButtonIndex:
                        }
		});
	}

        return (
                <TouchableHighlight
                        activeOpacity={0.8}
                        onPress={() => handleTrackSelect(track)}
                        onLongPress={() => handleClipLongPress(track)}
                        style={{ backgroundColor: track.color || '#00000000' }}>
                        <View style={[styles.trackItemContainer, { backgroundColor: track.color || '#00000000' }]}>
                                <View
                                        style={{
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                width: '100%',
                                                paddingLeft: 10,
                                                paddingRight: 10,
                                                paddingTop: 5,
                                                paddingBottom: 5,
                                        }}
                                >
                                        <Text numberOfLines={1} style={styles.trackIndexText}>
                                                {index + 1}
                                        </Text>
                                        <View style={{ flex: 1, width: "100%" }}>
                                                <Text numberOfLines={1} style={styles.trackTitleText}>
                                                        {track.title || 'Untitled Track'}
                                                </Text>
                                        </View>
                                        {isActiveTrack &&
                                                (playing ? (
                                                        <ActivityIndicator size="small" color={colors.icon} />
                                                ) : (
                                                        <Ionicons name="play" size={24} color={colors.icon} />
                                                ))}
                                </View>
                        </View>
                </TouchableHighlight>
        )
}

const styles = StyleSheet.create({
        trackItemContainer: {
                columnGap: 14,
                alignItems: 'flex-start',
                width: '100%',
        },
        trackIndexText: {
                ...defaultStyles.text,
                textAlign: 'center',
                fontSize: 32,
                fontWeight: '600',
                maxWidth: '100%',
                minWidth: 40,
                paddingRight: 10,
        },
        trackTitleText: {
                ...defaultStyles.text,
                fontSize: 17,
                fontWeight: '600',
                maxWidth: '80%',
        },
})
