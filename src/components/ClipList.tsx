import { ClipListItem } from '@/components/ClipListItem'
import { clipProgressFraction } from '@/helpers/miscellaneous'
import { buildClipRanges } from '@/helpers/playback'
import { t } from '@/i18n'
import Clip from '@/model/clip'
import { useGlobalSpeedOnly, useLoopEnd, useLoopStart } from '@/store/playbackState'
import { useLoopStatusStore } from '@/store/store'
import { utilsStyles } from '@/styles'
import { useMemo } from 'react'
import { usePlayerProgressStore } from '@/store/progress'
import { FlatList, FlatListProps, Text, View } from 'react-native'

type ClipsListProps = {
	/** Clips sorted by position */
	clips: Clip[]
	/** Track length in seconds, used until the player reports the duration */
	trackLength: number
} & Partial<FlatListProps<Clip>>

export const ClipsList = ({ clips, trackLength, ...flatListProps }: ClipsListProps) => {
	// One progress subscription for the whole list instead of one per clip, 5 updates per second suffice
	const position = usePlayerProgressStore((progress) => Math.floor(progress.position * 5) / 5)
	const duration = usePlayerProgressStore((progress) => progress.duration)
	const [globalOnly] = useGlobalSpeedOnly()
	const [loopStart] = useLoopStart()
	const [loopEnd] = useLoopEnd()
	const loopActive = useLoopStatusStore((state) => state.active)
	// Both markers set, but they do not form a loop (e.g. A behind B)
	const loopInvalid = !!loopStart && !!loopEnd && !loopActive
	const trackEnd = duration > 0 ? duration : trackLength
	// Same clip ranges as used for playback (clips are sorted by position)
	const rangeById = useMemo(
		() => new Map(buildClipRanges(clips, trackEnd).map((range) => [range.id, range])),
		[clips, trackEnd],
	)

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
			extraData={[position, globalOnly, loopStart, loopEnd, loopInvalid, trackEnd]}
			renderItem={({ item: clip, index }) => {
				const endPosition = rangeById.get(clip.id)?.end ?? trackEnd
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
						loopInvalid={loopInvalid}
					/>
				)
			}}
			{...flatListProps}
		/>
	)
}
