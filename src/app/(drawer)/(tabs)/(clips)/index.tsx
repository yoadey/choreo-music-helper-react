import { ClipsList } from '@/components/ClipList'
import { useCurrentTrack } from '@/hooks/useCurrentTrack'
import Clip from '@/model/clip'
import { defaultStyles } from '@/styles'
import { useMemo, useState } from 'react'
import { View } from 'react-native'

const ClipsScreen = () => {
	const { currentTrack, setCurrentTrack } = useCurrentTrack()
	const [clips, setClips] = useState<Clip[]>([]);

	useMemo(() => {
                currentTrack?.clips.observeWithColumns(['title','position','color','speed']).subscribe((clips) => {
                        setClips(clips);
                })
	}, [currentTrack?.id])

        return (
                <View style={defaultStyles.container}>
                        <ClipsList clips={clips} />
                </View>
        )
}

export default ClipsScreen
