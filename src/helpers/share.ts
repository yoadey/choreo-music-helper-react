import TrackWithClips from '@/model/track';
import Clip from '@/model/clip';

export async function shareTrackWithClips(track: TrackWithClips, clips: Clip[]): Promise<void> {
  throw new Error('Sharing not supported on this platform');
}
