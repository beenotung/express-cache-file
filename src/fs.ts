import { readFileSync, readFile } from 'fs';
import { Callback, GetFileFn } from './types';
import getMimeType from './mime';

export type ReadMode =
  | undefined
  | 'async' // default
  | 'sync';

function getFsFile(mode: ReadMode): GetFileFn {
  if (mode === 'sync') {
    return getSync;
  }
  return getAsync;
}

function getSync(file: string, cb: Callback) {
  try {
    let buffer = readFileSync(file);
    getContent(file, buffer, cb);
  } catch (error) {
    cb(error, null!);
  }
}

function getAsync(file: string, cb: Callback) {
  readFile(file, (err, buffer) =>
    err ? cb(err, null!) : getContent(file, buffer, cb),
  );
}

function getContent(file: string, buffer: Buffer, cb: Callback) {
  getMimeType(file, buffer)
    .then((mimeType) => cb(null, { buffer, mimeType }))
    .catch((err) => cb(err, null!));
}

export default getFsFile;
