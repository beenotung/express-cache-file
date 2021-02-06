import { Cache, Callback, GetFileFn } from './types';
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
      delete cache.files[file];
      cache.unsedSize -= item.buffer.byteLength;
    }
    getFile(file, (err, content) => {
      if (!err) {
        if (expire >= 0) {
          content.expire = Date.now() + expire;
        }
        cache.files[file] = content;
        cache.unsedSize += content.buffer.byteLength;
        // TODO auto remove other files when cache is too large
      }
      if (!item || mode !== 'cache_first') {
        cb(err, content);
      }
    });
  };
}

export default getCacheFile;
