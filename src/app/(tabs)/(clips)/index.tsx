import { ClipsList } from '@/components/ClipList'
import { useCurrentTrack } from '@/hooks/useCurrentTrack'
import Clip from '@/model/clip'
import { defaultStyles } from '@/styles'
import { useMemo, useState } from 'react'
import { ScrollView, View } from 'react-native'

const ClipsScreen = () => {
	const { currentTrack, setCurrentTrack } = useCurrentTrack()
	const [clips, setClips] = useState<Clip[]>([]);

	useMemo(() => {
		currentTrack?.clips.observeWithColumns(['title','position','color']).subscribe((clips) => {
			setClips(clips);
		})
	}, [currentTrack?.id])

	return (
		<View style={defaultStyles.container}>
			<ScrollView
				contentInsetAdjustmentBehavior="automatic"
				style={{
					padding: 0,
				}}
			>
				<ClipsList
					scrollEnabled={false}
					clips={clips}
				/>
			</ScrollView>
		</View>
	)
}

export default ClipsScreen
