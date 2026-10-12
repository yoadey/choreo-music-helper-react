import Clip from '@/model/clip'
import TrackWithClips from '@/model/track'

export async function shareTrackWithClips(_track: TrackWithClips, _clips: Clip[]): Promise<void> {
  throw new Error('Sharing not supported on this platform')
}
