import { Model, Relation } from '@nozbe/watermelondb'
import { Associations } from '@nozbe/watermelondb/Model'
import { field, immutableRelation, text } from '@nozbe/watermelondb/decorators'
import TrackWithClips from './track'

export default class Clip extends Model {
  static table = 'clips'
  static associations: Associations = {
    track: { type: 'belongs_to', key: 'track_id' },
  }

  @text('title') title!: string;
  @field('position') position!: number;
  @text('color') color!: string;
  @immutableRelation('tracks', 'track_id') track!: Relation<TrackWithClips>;
}