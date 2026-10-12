import { ClipListItem } from '@/components/ClipListItem'
import { clipProgressFraction } from '@/helpers/miscellaneous'
import { t } from '@/i18n'
import Clip from '@/model/clip'
import { useGlobalSpeedOnly, useLoopEnd, useLoopStart } from '@/store/playbackState'
import { utilsStyles } from '@/styles'
import { FlatList, FlatListProps, Text, View } from 'react-native'
import { useProgress } from 'react-native-track-player'

type ClipsListProps = {
	/** Clips sorted by position */
	clips: Clip[]
	/** Track length in seconds, used until the player reports the duration */
	trackLength: number
} & Partial<FlatListProps<Clip>>

export const ClipsList = ({ clips, trackLength, ...flatListProps }: ClipsListProps) => {
	// One progress subscription for the whole list instead of one per clip
	const { position, duration } = useProgress(200)
	const [globalOnly] = useGlobalSpeedOnly()
	const [loopStart] = useLoopStart()
	const [loopEnd] = useLoopEnd()
	const trackEnd = duration > 0 ? duration : trackLength

	return (
		<FlatList
			contentContainerStyle={{ paddingTop: 0, paddingBottom: 60 }}
			ListEmptyComponent={
				<View>
					<Text style={utilsStyles.emptyContentText}>{t.noClips}</Text>
				</View>
			}
			data={clips}
			keyExtractor={(clip) => clip.id}
			extraData={[position, globalOnly, loopStart, loopEnd, trackEnd]}
			renderItem={({ item: clip, index }) => {
				const endPosition = clips[index + 1]?.position ?? trackEnd
				return (
					<ClipListItem
						index={index}
						clip={clip}
						title={clip.title}
						position={clip.position}
						color={clip.color}
						speed={clip.speed}
						progress={clipProgressFraction(position, clip.position, endPosition)}
						showSpeed={!globalOnly}
						isLoopStart={loopStart?.id === clip.id}
						isLoopEnd={loopEnd?.id === clip.id}
					/>
				)
			}}
			{...flatListProps}
		/>
	)
}
