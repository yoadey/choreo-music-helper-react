import { TracksList } from '@/components/TracksList'
import { generateTracksListId } from '@/helpers/miscellaneous'
import { database } from '@/model/index.web'
import TrackWithClips from '@/model/track'
import { defaultStyles } from '@/styles'
import { withObservables } from '@nozbe/watermelondb/react'
import { View } from 'react-native'

const SongsScreen = ({ tracks }: { tracks: TrackWithClips[] }) => {
    return (
        <View style={defaultStyles.container}>
            <TracksList id={generateTracksListId('songs', '')} tracks={tracks} />
        </View>
    )
}

const enhance = withObservables<Record<string, never>, { tracks: TrackWithClips[] }>([], () => ({
    // @ts-expect-error - WatermelonDB typing does not expose observe
    tracks: database.collections.get<TrackWithClips>('tracks').query().observe(),
}))

export default enhance(SongsScreen)
