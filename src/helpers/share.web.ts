import TrackWithClips from '@/model/track';
import Clip from '@/model/clip';
import NodeID3 from 'node-id3';
import { get } from 'idb-keyval';
import { Buffer } from 'buffer';

export async function shareTrackWithClips(track: TrackWithClips, clips: Clip[]): Promise<void> {
  let arrayBuffer: ArrayBuffer;
  if (track.uri.startsWith('/audio/')) {
    const blob = await get(track.uri);
    if (!blob) throw new Error('Track data not found');
    arrayBuffer = await blob.arrayBuffer();
  } else {
    const response = await fetch(track.uri);
    arrayBuffer = await response.arrayBuffer();
  }
  const sorted = [...clips].sort((a, b) => a.position - b.position);
  const tags = {
    title: track.title,
    chapter: sorted.map((clip, index) => {
      const end = sorted[index + 1] ? sorted[index + 1].position : track.length;
      return {
        elementID: `clip${index}`,
        startTimeMs: clip.position,
        endTimeMs: end,
        startOffsetBytes: 0,
        endOffsetBytes: 0,
        tags: { title: clip.title }
      };
    }),
    tableOfContents: [{
      elementID: 'toc',
      isOrdered: true,
      elements: sorted.map((_, i) => `clip${i}`),
      tags: { title: track.title }
    }]
  } as const;

  const updated = NodeID3.update(tags, Buffer.from(arrayBuffer));
  const blob = new Blob([updated], { type: 'audio/mpeg' });
  const file = new File([blob], `${track.title}.mp3`, { type: 'audio/mpeg' });

  if (navigator.share) {
    await navigator.share({ files: [file], title: track.title });
  } else {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${track.title}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
