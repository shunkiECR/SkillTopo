/** JSONと .skilltopo のバイト変換。Rust側の profile/format.rs と仕様を揃える。 */
import { MAX_PROFILE_BYTES as maxBytes, type Profile, type FileFormat } from './types';
import { parseProfile } from './validation';

// 先頭7バイトは SKTOPO + NUL、その次の1バイトはバイナリ形式バージョン。
const binaryMagic = new Uint8Array([83, 75, 84, 79, 80, 79, 0]);

// 圧縮後だけでなく展開中にも上限を設け、巨大な展開結果を蓄積しない。
async function boundedBytes(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error('ファイルおよび展開後のサイズは8 MB以下にしてください。');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

export async function decodeProfileBytes(data: Uint8Array): Promise<Profile> {
  if (data.length > maxBytes) throw new Error('ファイルは8 MB以下にしてください。');
  if (binaryMagic.every((b, i) => data[i] === b)) {
    if (data[7] !== 1) throw new Error('対応していないバイナリ形式のバージョンです。');
    try {
      data = await boundedBytes(
        new Blob([new Uint8Array(data.slice(8))])
          .stream()
          .pipeThrough(new DecompressionStream('gzip')),
      );
    } catch {
      throw new Error('バイナリファイルが破損しているか、展開後のサイズが8 MBを超えています。');
    }
  }
  return parseProfile(new TextDecoder('utf-8', { fatal: true }).decode(data));
}

export async function encodeProfileBytes(
  profile: Profile,
  format: FileFormat,
): Promise<Uint8Array> {
  const json = JSON.stringify(profile, null, format === 'json' ? 2 : undefined);
  parseProfile(json);
  const data = new TextEncoder().encode(json);
  if (format === 'json') return data;
  const compressed = await boundedBytes(
    new Blob([data]).stream().pipeThrough(new CompressionStream('gzip')),
  );
  if (compressed.length + 8 > maxBytes) throw new Error('ファイルは8 MB以下にしてください。');
  const result = new Uint8Array(compressed.length + 8);
  result.set(binaryMagic);
  result[7] = 1;
  result.set(compressed, 8);
  return result;
}
