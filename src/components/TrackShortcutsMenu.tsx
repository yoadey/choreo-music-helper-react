import { useQueue } from '@/store/queue'
import { MenuView } from '@react-native-menu/menu'
import { useRouter } from 'expo-router'
import { PropsWithChildren } from 'react'
import { Track } from 'react-native-track-player'
import { match } from 'ts-pattern'

type TrackShortcutsMenuProps = PropsWithChildren<{ track: Track }>

export const TrackShortcutsMenu = ({ track, children }: TrackShortcutsMenuProps) => {
	const router = useRouter()

	const isFavorite = track.rating === 1

	const { activeQueueId } = useQueue()

	const handlePressAction = (id: string) => {
		match(id)
			.with('add-to-playlist', () => {
				// it opens the addToPlaylist modal
				// @ts-expect-error it should work
				router.push({ pathname: '(modals)/addToPlaylist', params: { trackUrl: track.url } })
			})
			.otherwise(() => console.warn(`Unknown menu action ${id}`))
	}

	return (
		<MenuView
			onPressAction={({ nativeEvent: { event } }) => handlePressAction(event)}
			actions={[
				{
					id: 'add-to-playlist',
					title: 'Add to playlist',
					image: 'plus',
				},
			]}
		>
			{children}
		</MenuView>
	)
}
