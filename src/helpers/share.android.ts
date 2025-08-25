import TrackWithClips from '@/model/track';
import Clip from '@/model/clip';
import { NativeModules, Share } from 'react-native';

const { ID3 } = NativeModules as { ID3?: { writeChapters(filePath: string, chapters: any[], toc: any): Promise<void> } };

export async function shareTrackWithClips(track: TrackWithClips, clips: Clip[]): Promise<void> {
  if (!ID3) {
    throw new Error('ID3 native module not available');
  }
  const sorted = [...clips].sort((a, b) => a.position - b.position);
  const chapters = sorted.map((clip, index) => ({
    elementID: `clip${index}`,
    startTimeMs: clip.position,
    endTimeMs: sorted[index + 1] ? sorted[index + 1].position : track.length,
    tags: { title: clip.title }
  }));
  const toc = {
    elementID: 'toc',
    isOrdered: true,
    elements: chapters.map((c) => c.elementID),
    tags: { title: track.title }
  };
  await ID3.writeChapters(track.uri, chapters, toc);
  await Share.share({ url: track.uri, title: track.title });
}
