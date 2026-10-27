import {open} from 'node:fs/promises';
import {constants} from 'node:fs';

export async function readBoundedJson(path, limit) {
  if (!Number.isSafeInteger(limit) || limit < 0) throw Error('Invalid input byte limit');
  const handle = await open(path, constants.O_RDONLY | constants.O_NONBLOCK);
  let bytes;
  try {
    const info = await handle.stat();
    if (!info.isFile()) throw Error('Input must be a regular file');
    if (info.size > limit) throw Error('Input exceeds its byte limit');
    const chunks = [];
    let total = 0;
    while (true) {
      const chunk = Buffer.alloc(Math.min(65536, limit + 1 - total));
      const {bytesRead} = await handle.read(chunk, 0, chunk.length, null);
      if (!bytesRead) break;
      total += bytesRead;
      if (total > limit) throw Error('Input exceeds its byte limit');
      chunks.push(chunk.subarray(0, bytesRead));
    }
    bytes = Buffer.concat(chunks, total);
  } finally {
    await handle.close();
  }
  return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
}
