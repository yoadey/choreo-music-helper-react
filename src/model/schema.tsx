import { appSchema, tableSchema } from '@nozbe/watermelondb'


export default appSchema({
    version: 1,
    tables: [
        tableSchema({
          name: 'tracks',
          columns: [
            { name: 'title', type: 'string' },
            { name: 'uri', type: 'string' },
            { name: 'length', type: 'number' },
          ]
        }),
        tableSchema({
          name: 'clips',
          columns: [
            { name: 'track_id', type: 'string', isIndexed: true },
            { name: 'position', type: 'number' },
            { name: 'title', type: 'string' },
            { name: 'color', type: 'string' },
          ]
        }),
    ]
})