import { Model, Query } from '@nozbe/watermelondb';
import { Associations } from '@nozbe/watermelondb/Model';
import { children, field, text } from '@nozbe/watermelondb/decorators';
import { useDatabase, withObservables } from '@nozbe/watermelondb/react';
import Clip from './clip';

export default class TrackWithClips extends Model {
  static table = 'tracks'
  static associations: Associations = {
    clips: { type: 'has_many', foreignKey: 'track_id' },
  }


  @text('title') title!: string;
  @text('uri') uri!: string;
  @field('length') length!: number;
  @children('clips') clips!: Query<Clip>;
}


export function useTracks() {
  const database = useDatabase()

  const tracks = withObservables(["database"], ({ database }) => ({
    tracks: database.get("tracks").find().observe()
  }));

  return tracks
}