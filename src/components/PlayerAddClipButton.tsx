import { colors } from '@/constants/tokens'
import { useCurrentTrack } from '@/hooks/useCurrentTrack'
import Clip from '@/model/clip'
import { database } from '@/model/index.web'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { ComponentProps } from 'react'
import TrackPlayer, { RepeatMode } from 'react-native-track-player'

type IconProps = Omit<ComponentProps<typeof MaterialCommunityIcons>, 'name'>
type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

const repeatOrder = [RepeatMode.Off, RepeatMode.Track, RepeatMode.Queue] as const

export const PlayerAddClipButton = ({ ...iconProps }: IconProps) => {
	const { currentTrack, setCurrentTrack } = useCurrentTrack();

	const addClipToTrack = () => {
		if (!currentTrack) return;

		TrackPlayer.getProgress()
			.then(progress => {
				database.write(async () => {
					database.get<Clip>("clips").create(clip => {
						clip.track.set(currentTrack);
						clip.title = `New clip`;
						clip.color = `#00000000`;
						clip.position = progress.position;
					});
				})
			});
		currentTrack?.id
	}

	return (
		<MaterialCommunityIcons
			name={'playlist-plus'}
			onPress={addClipToTrack}
			color={colors.icon}
			{...iconProps}
		/>
	)
}
