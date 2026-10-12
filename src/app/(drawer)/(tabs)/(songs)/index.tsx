import { TracksList } from '@/components/TracksList'
import { useTracks } from '@/hooks/useTracks'
import { defaultStyles } from '@/styles'
import { View } from 'react-native'

const SongsScreen = () => {
    const tracks = useTracks()
    return (
        <View style={defaultStyles.container}>
            <TracksList tracks={tracks} />
        </View>
    )
}

export default SongsScreen
