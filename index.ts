import type { Request, Response, NextFunction } from "express";
import { readFileSync, readFile } from "fs";
import { fromFile, fromBuffer } from "file-type";
import { join } from "path";

type Disable = undefined | false | "never" | "off";

type UpdateInterval =
  | undefined
  | "immediate" // default
  | number // ms
  | string; // duration format

type UpdateMode =
  | "cache_first" // default
  | "wait";
type UpdateOptions = {
  mode: UpdateMode;
  interval: UpdateInterval;
};

export type CacheFileOptions = {
  read_mode?: "sync" | "async"; // default async
  update?: Disable | UpdateOptions;
  redirect?: boolean; // redirect '/' to 'index.html', default true
};

// TODO maintain bounded memory usage by cache
function cacheFile(root: string, options?: CacheFileOptions) {
  const redirect = options?.redirect ?? true;
  const cache: Record<string, CacheContent> = {};
  let readFile = options?.read_mode === "sync" ? readSync : readAsync;
  readFile = readFileWithUpdate(readFile, cache, options?.update);
  return function (req: Request, res: Response, next: NextFunction) {
    if (req.method.toUpperCase() !== "GET") {
      next();
      return;
    }
    const file = join(root, req.path);
    const handleConent: Callback<Content> = (err, content) => {
      if (err) {
        if (err.code === "ENOENT" || err.code === "EISDIR") {
          next();
        } else {
          next(`Cannot ${req.method} ${req.baseUrl}${req.url}`);
        }
        return;
      }
      sendContent(content, res);
    };
    readFile(file, (err, content) => {
      if (redirect && err?.code === "EISDIR") {
        const indexFile = join(file, "index.html");
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
  res.setHeader("Content-Type", content.mimeType);
  res.write(content.buffer);
  res.end();
}

function isDisable(value: any) {
  if (value === "off" || value === "never" || !value) {
    return true as true;
  }
  return false as false;
}

function readFileWithUpdate(
  readFile: ReadFileFn,
  cache: Cache,
  options: Disable | UpdateOptions
): ReadFileFn {
  if (isDisable(options)) {
    return readFile;
  }
  options = options as UpdateOptions;
  const interval = parseInterval(options.interval);
  const mode = options.mode || "wait";
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
    if (mode === "wait") {
      readFile(file, saveAndReturn);
    } else {
      // return cache first, update in background
      cb(null, item);
      readFile(file, (err, content) => {
        if (!err) {
          saveCache(file, content);
        }
      });
    }
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
  cb: Callback<Content>
) {
  err
    ? cb(err, null!)
    : getMimeType(file, buffer)
        .then((mimeType) => cb(null, { buffer, mimeType }))
        .catch((err) => cb(err, null!));
}

const BinaryMimeType = "application/octet-stream";
const HtmlMimeType = "text/html";
const TxtMimeType = "text/plain";

function getMimeType(file: string, buffer: Buffer) {
  return fromBuffer(buffer).then((res) => {
    if (res) {
      return res.mime;
    }
    if (file.match(/\.html$/i)) {
      return HtmlMimeType;
    }
    if (file.match(/\.txt$/i)) {
      return TxtMimeType;
    }
    return fromFile(file).then((res) => res?.mime || BinaryMimeType);
  });
}

namespace Interval {
  export const second = 1000;
  export const minute = second * 60;
  export const hour = minute * 60;
  export const day = hour * 24;
}

function parseInterval(interval: UpdateInterval): number {
  if (!interval) return -1;
  if (typeof interval === "number") return interval;
  const value = parseFloat(interval);
  const unit = interval.replace(value.toString(), "").trim();
  if (unit.startsWith("ms")) {
    return value;
  }
  if (unit.startsWith("s")) {
    return value * Interval.second;
  }
  if (unit.startsWith("m")) {
    return value * Interval.minute;
  }
  if (unit.startsWith("h")) {
    return value * Interval.hour;
  }
  if (unit.startsWith("d")) {
    return value * Interval.day;
  }
  if (value < 1000) {
    return value * Interval.second;
  }
  return value;
}

export default cacheFile;
