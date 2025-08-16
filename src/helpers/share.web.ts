import TrackWithClips from '@/model/track';
import Clip from '@/model/clip';
import * as ID3Writer from 'browser-id3-writer';
import { get } from 'idb-keyval';

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
  // browser-id3-writer exposes the constructor as a property on the module namespace
  const writer = new ID3Writer.ID3Writer(arrayBuffer);

  const sorted = [...clips].sort((a, b) => a.position - b.position);
  sorted.forEach((clip, index) => {
    const end = sorted[index + 1] ? sorted[index + 1].position : track.length;
    writer.setFrame('CHAP', {
      elementID: `clip${index}`,
      startTime: clip.position,
      endTime: end,
      startOffset: 0,
      endOffset: 0,
      tags: { TIT2: clip.title }
    });
  });

  writer.setFrame('CTOC', {
    elementID: 'toc',
    flags: 0,
    childElementIDs: sorted.map((_, i) => `clip${i}`)
  });

  writer.addTag();
  const blob = writer.getBlob();
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
