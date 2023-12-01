import { Cache, Callback, Content, GetFileFn } from './types';
import parseInterval, { UpdateInterval } from './interval';

export type UpdateOptions = {
  expire?: UpdateInterval;
  mode?: UpdateMode;
};

export type UpdateMode =
  | 'cache_first' // default
  | 'wait';

function getCacheFile(
  getFile: GetFileFn,
  cache: Cache,
  options: UpdateOptions,
): GetFileFn {
  const expire: number = parseInterval(options.expire);
  const mode = options.mode || 'cache_first';
  return (file: string, cb: Callback) => {
    const item = cache.files[file];
    if (item) {
      if (!item.expire || item.expire > Date.now()) {
        cb(null, item);
        return;
      }
      if (mode === 'cache_first') {
        cb(null, item);
      }
      removeFromCache(cache, file, item);
    }
    getFile(file, (err, content) => {
      if (!err) {
        if (expire >= 0) {
          content.expire = Date.now() + expire;
        }
        saveToCache(cache, file, content);
        // TODO auto remove other files when cache is too large
      }
      if (!item || mode !== 'cache_first') {
        cb(err, content);
      }
    });
  };
}

function removeFromCache(cache: Cache, file: string, item = cache.files[file]) {
  delete cache.files[file];
  if (item) {
    cache.usedSize -= item.buffer.byteLength;
  }
}

function saveToCache(cache: Cache, file: string, content: Content) {
  removeFromCache(cache, file);
  if (checkCacheSize(cache, content.buffer.byteLength)) {
    cache.files[file] = content;
    cache.usedSize += content.buffer.byteLength;
  }
}

function checkCacheSize(cache: Cache, sizeNeeded: number): boolean {
  if (!cache.capacity) return true;

  if (cache.capacity >= cache.usedSize + sizeNeeded) {
    return true;
  }

  const entries = Object.entries(cache.files);
  for (let i = 0; i < entries.length; i++) {
    if (cache.capacity >= cache.usedSize + sizeNeeded) {
      return true;
    }
    let entry = entries[i];
    removeFromCache(cache, entry[0], entry[1]);
  }

  return cache.capacity >= cache.usedSize + sizeNeeded;
}

export default getCacheFile;
