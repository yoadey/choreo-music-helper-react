import { ClipListItem } from '@/components/ClipListItem'
import Clip from '@/model/clip'
import { utilsStyles } from '@/styles'
import { FlatList, FlatListProps, Text, View } from 'react-native'

type ClipsListProps = {
	clips: Clip[]
} & Partial<FlatListProps<Clip>>

export const ClipsList = ({
	clips,
	...flatListProps
}: ClipsListProps) => {

	const clipsSorted = clips.sort((a, b) => {
		if (a.position < b.position) return -1;
		if (a.position > b.position) return 1;
		return 0;
	});

	return (
		<FlatList
			contentContainerStyle={{ paddingTop: 0, paddingBottom: 60 }}
			ListEmptyComponent={
				<View>
					<Text style={utilsStyles.emptyContentText}>No Clips defined yet!</Text>
				</View>
			}
			data={clipsSorted}
			renderItem={({ item: clip, index }) => (
				<ClipListItem index={index} clip={clip} endPosition={clipsSorted[index + 1]?.position} />
			)}
			{...flatListProps}
		/>
	)
}
