import type { Request, Response, NextFunction } from 'express';
import { readFileSync, readFile } from 'fs';
import { join } from 'path';
import parseInterval, { UpdateInterval } from './interval';
import { CacheSize } from './size';
import getMimeType from './mime';

export { UpdateInterval } from './interval';
export { CacheSize } from './size';

type Disable = undefined | false | 'never' | 'off';

type UpdateMode =
  | 'cache_first' // default
  | 'wait';

type UpdateOptions = {
  mode: UpdateMode;
  interval: UpdateInterval;
  cache_size?: CacheSize;
};

export type CacheFileOptions = {
  read_mode?: 'sync' | 'async'; // default async
  update?: Disable | UpdateOptions;
  redirect?: boolean; // redirect '/' to 'index.html', default true
};

// TODO maintain bounded memory usage by cache
function cacheFile(root: string, options?: CacheFileOptions) {
  const redirect = options?.redirect ?? true;
  const cache: Record<string, CacheContent> = {};
  let readFile = options?.read_mode === 'sync' ? readSync : readAsync;
  readFile = readFileWithUpdate(readFile, cache, options?.update);
  return function (req: Request, res: Response, next: NextFunction) {
    if (req.method.toUpperCase() !== 'GET') {
      next();
      return;
    }
    const file = join(root, req.path);
    const handleConent: Callback<Content> = (err, content) => {
      if (!err) return sendContent(content, res);

      if (err.code === 'ENOENT' || err.code === 'EISDIR') {
        next();
      } else {
        next(`Cannot ${req.method} ${req.baseUrl}${req.url}`);
      }
    };
    readFile(file, (err, content) => {
      if (redirect && err?.code === 'EISDIR') {
        const indexFile = join(file, 'index.html');
        readFile(indexFile, handleConent);
        return;
      }
      handleConent(err, content);
    });
  };
}

type Cache = Record<string, CacheContent>;
type CacheContent = Content & { expire?: number };

type Content = { buffer: Buffer; mimeType: string };

type Callback<T> = (err: any, data: T) => void;

function sendContent(content: Content, res: Response) {
  res.setHeader('Content-Type', content.mimeType);
  res.write(content.buffer);
  res.end();
}

function isDisable(value: any) {
  if (value === 'off' || value === 'never' || !value) {
    return true as true;
  }
  return false as false;
}

function readFileWithUpdate(
  readFile: ReadFileFn,
  cache: Cache,
  options: Disable | UpdateOptions,
): ReadFileFn {
  if (isDisable(options)) {
    return readFile;
  }
  options = options as UpdateOptions;
  const interval = parseInterval(options.interval);
  const mode = options.mode || 'wait';
  function saveCache(file: string, content: Content) {
    cache[file] = content;
    if (interval > 0) {
      cache[file].expire = Date.now() + interval;
    }
  }
  return function (file: string, cb: Callback<Content>) {
    const saveAndReturn: Callback<Content> = (err, content) => {
      if (!err) {
        saveCache(file, content);
      }
      cb(err, content);
    };
    const item = cache[file];
    if (!item) {
      readFile(file, saveAndReturn);
      return;
    }
    const has_expired = item.expire && item.expire < Date.now();
    if (!has_expired) {
      cb(null, item);
      return;
    }
    // expired
    if (mode === 'wait') {
      readFile(file, saveAndReturn);
      return;
    }
    // return cache first, update in background
    cb(null, item);
    readFile(file, (err, content) => {
      if (!err) {
        saveCache(file, content);
      }
    });
  };
}

type ReadFileFn = (file: string, cb: Callback<Content>) => void;

function readSync(file: string, cb: Callback<Content>) {
  try {
    const buffer = readFileSync(file);
    wrapWithMime(null, file, buffer, cb);
  } catch (error) {
    wrapWithMime(error, file, null!, cb);
  }
}

function readAsync(file: string, cb: Callback<Content>) {
  readFile(file, (err, buffer) => wrapWithMime(err, file, buffer, cb));
}

function wrapWithMime(
  err: any,
  file: string,
  buffer: Buffer,
  cb: Callback<Content>,
) {
  err
    ? cb(err, null!)
    : getMimeType(file, buffer)
        .then((mimeType) => cb(null, { buffer, mimeType }))
        .catch((err) => cb(err, null!));
}

export default cacheFile;
