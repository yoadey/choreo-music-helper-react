import NodeID3 from 'node-id3';
import { Buffer } from 'buffer';

describe('node-id3 chapter tags', () => {
  it('writes and reads chapter metadata', () => {
    const tags = {
      title: 'Test',
      chapter: [{
        elementID: 'clip0',
        startTimeMs: 0,
        endTimeMs: 1000,
        startOffsetBytes: 0,
        endOffsetBytes: 0,
        tags: { title: 'Intro' }
      }],
      tableOfContents: [{
        elementID: 'toc',
        isOrdered: true,
        elements: ['clip0'],
        tags: { title: 'Test' }
      }]
    };

    const buffer = NodeID3.update(tags, Buffer.alloc(0));
    const read = NodeID3.read(buffer);

    expect(read.title).toBe('Test');
    expect(read.chapter?.[0]?.elementID).toBe('clip0');
    expect(read.chapter?.[0]?.tags?.title).toBe('Intro');
    expect(read.tableOfContents?.[0]?.elements).toContain('clip0');
  });
});
