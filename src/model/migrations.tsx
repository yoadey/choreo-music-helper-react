import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations'

export default schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'tracks',
          columns: [
            { name: 'waveform', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
  ],
})