import { ClipListItem } from '@/components/ClipListItem'
import { Clip } from '@/helpers/types'
import { utilsStyles } from '@/styles'
import { FlatList, FlatListProps, Text, View } from 'react-native'

type ClipsListProps = {
	clips: Clip[]
	onClipPress: (playlist: Clip) => void
} & Partial<FlatListProps<Clip>>

const ItemDivider = () => (
	<View style={{ ...utilsStyles.itemSeparator, marginLeft: 80, marginVertical: 12 }} />
)

export const ClipsList = ({
	clips,
	onClipPress: handleCliplistPress,
	...flatListProps
}: ClipsListProps) => {
	return (
		<FlatList
			contentContainerStyle={{ paddingTop: 10, paddingBottom: 128 }}
			ItemSeparatorComponent={ItemDivider}
			ListFooterComponent={ItemDivider}
			ListEmptyComponent={
				<View>
					<Text style={utilsStyles.emptyContentText}>No playlist found</Text>
				</View>
			}
			data={clips}
			renderItem={({ item: playlist }) => (
				<ClipListItem playlist={playlist} onPress={() => handleCliplistPress(playlist)} />
			)}
			{...flatListProps}
		/>
	)
}
