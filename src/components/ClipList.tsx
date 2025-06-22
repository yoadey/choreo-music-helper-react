import { ClipListItem } from '@/components/ClipListItem'
import Clip from '@/model/clip'
import { utilsStyles } from '@/styles'
import { FlatList, FlatListProps, Text, View } from 'react-native'

type ClipsListProps = {
	clips: Clip[]
} & Partial<FlatListProps<Clip>>

const ItemDivider = () => (
	<View style={{ ...utilsStyles.itemSeparator, marginLeft: 80, marginVertical: 12 }} />
)

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
			contentContainerStyle={{ paddingTop: 10, paddingBottom: 128 }}
			ItemSeparatorComponent={ItemDivider}
			ListFooterComponent={ItemDivider}
			ListEmptyComponent={
				<View>
					<Text style={utilsStyles.emptyContentText}>No Clips defined yet!</Text>
				</View>
			}
			data={clipsSorted}
			renderItem={({ item: clip }) => (
				<ClipListItem clip={clip} />
			)}
			{...flatListProps}
		/>
	)
}
