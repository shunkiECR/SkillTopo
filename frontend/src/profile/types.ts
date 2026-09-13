/** 保存するデータ型。path/dirty は文書状態であり、ファイル本文には含めない。 */
import { type Skill } from '../model';

export type Profile = {
  format: 'skilltopo-profile';
  version: 1;
  userName: string;
  skills: Skill[];
};
export type ProfileDocument = { profile: Profile; path: string | null; dirty: boolean };
export type FileFormat = 'binary' | 'json';

export const MAX_PROFILE_BYTES = 8 * 1024 * 1024;
