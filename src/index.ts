import getCacheFile from './cache';
import { join } from 'path';
import getFsFile from './fs';
import parseSize, { CacheSize } from './size';

import type { NextFunction, Request, Response } from 'express';
import type { UpdateOptions } from './cache';
import type { ReadMode } from './fs';
import type { Cache, Content } from './types';

export type { UpdateOptions } from './cache';
export type { ReadMode } from './fs';

export type CacheFileOptions = {
  readMode?: ReadMode;
  update?: false | UpdateOptions;
  cacheSize?: CacheSize;
  redirect?: boolean; // redirect '/' to 'index.html', default true
};

export function cacheFile(root: string, options: CacheFileOptions = {}) {
  const redirect = options.redirect ?? true;
  const cache: Cache = {
    capacity: parseSize(options.cacheSize),
    usedSize: 0,
    files: {},
  };
  let readFile = getFsFile(options.readMode);
  readFile = getCacheFile(readFile, cache, options.update || {});
  return function (req: Request, res: Response, next: NextFunction) {
    const file = join(root, req.path);
    readFile(file, (err, content) => {
      if (redirect && err && err.code === 'EISDIR') {
        const indexFile = join(file, 'index.html');
        readFile(indexFile, (err, content) =>
          sendResponse(req, res, next, err, content),
        );
        return;
      }
      return sendResponse(req, res, next, err, content);
    });
  };
}

function sendResponse(
  req: Request,
  res: Response,
  next: NextFunction,
  err: any,
  content: Content,
) {
  if (!err) return sendContent(res, content);
  if (err.code === 'ENOENT' || err.code === 'EISDIR') next();
  else next(`Cannot ${req.method} ${req.originalUrl}`);
}

function sendContent(res: Response, content: Content) {
  res.setHeader('Content-Type', content.mimeType);
  res.write(content.buffer);
  res.end();
}

export default cacheFile;
