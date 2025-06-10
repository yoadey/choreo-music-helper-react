import { Model, Query } from '@nozbe/watermelondb'
import { Associations } from '@nozbe/watermelondb/Model'
import { field, immutableRelation, text } from '@nozbe/watermelondb/decorators'
import './__typetests__'
import Track from './track'

export default class Clip extends Model {
  static table = 'clips'
  static associations: Associations = {
    tracks: { type: 'belongs_to', key: 'track_id' },
  }

  @text('title') title!: string;
  @field('position') position!: number;
  @immutableRelation('tracks', 'track_id') track!: Query<Track>;
}