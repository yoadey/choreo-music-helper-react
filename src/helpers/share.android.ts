import Clip from '@/model/clip'
import TrackWithClips from '@/model/track'
import { NativeModules, Share } from 'react-native'
import { sortByPosition } from './playback'

type Chapter = { elementID: string; startTimeMs: number; endTimeMs: number; tags: { title: string } }
type TableOfContents = { elementID: string; isOrdered: boolean; elements: string[]; tags: { title: string } }

const { ID3 } = NativeModules as {
  ID3?: { writeChapters(filePath: string, chapters: Chapter[], toc: TableOfContents): Promise<void> }
}

export async function shareTrackWithClips(track: TrackWithClips, clips: Clip[]): Promise<void> {
  if (!ID3) {
    throw new Error('ID3 native module not available')
  }
  const sorted = sortByPosition(clips)
  // Clip positions are stored in seconds, the track length in milliseconds, ID3 chapters use milliseconds
  const chapters = sorted.map((clip, index) => ({
    elementID: `clip${index}`,
    startTimeMs: Math.round(clip.position * 1000),
    endTimeMs: sorted[index + 1] ? Math.round(sorted[index + 1].position * 1000) : track.length,
    tags: { title: clip.title },
  }))
  const toc = {
    elementID: 'toc',
    isOrdered: true,
    elements: chapters.map((c) => c.elementID),
    tags: { title: track.title },
  }
  await ID3.writeChapters(track.uri, chapters, toc)
  await Share.share({ url: track.uri, title: track.title })
}
