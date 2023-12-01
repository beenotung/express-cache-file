# express-cache-file

Express middleware to cache static files in server memory.

[![npm Package Version](https://img.shields.io/npm/v/express-cache-file.svg?maxAge=3600)](https://www.npmjs.com/package/express-cache-file)

This is a simple package without external dependencies.
(e.g. it doesn't require redis)

## Features

- express middleware
- cache files in memory
- customizable cache policy
- customizable cache size

## Installation

You can install this package with `npm`, `pnpm`, `yarn` or `slnpm`

```bash
npm install express-cache-file
```

## Typescript Signature

```typescript
export function cacheFile(
  root: string,
  options?: CacheFileOptions,
): (req, res, next) => void

export default cacheFile

export type CacheFileOptions = {
  readMode?: ReadMode
  update?: false | UpdateOptions
  cacheSize?: CacheSize
  redirect?: boolean // redirect '/' to 'index.html', default true
}

export type UpdateOptions = {
  expire?: UpdateInterval
  mode?: UpdateMode
}

export type UpdateMode =
  | 'cache_first' // default
  | 'wait';

export type ReadMode =
  | undefined
  | 'async' // default
  | 'sync'

export type UpdateInterval =
  | undefined
  | false // equivalent to to 'never'
  | 'never' // default
  | 'immediate'
  | number // ms, zero is equivalent to 'immediate'
  | string // duration format, e.g. '5 minutes'

export type CacheSize =
  | undefined
  | 'unlimited' // default
  | number // bytes
  | string // size format, e.g. '5mb'
```

### Duration Format

Format: [value][unit]

| Unit Prefix | Meaning     |
| ----------: | :---------- |
|          ms | millisecond |
|           s | second      |
|           m | minute      |
|           h | hour        |
|           d | day         |

Remarks:

- The unit is case-insensitive.
- The space between value and unit is optional.
- When the unit is not specified, the value is treated as second if smaller than 1000, otherwise treated as ms.

Examples:

- 10ms
- 5 seconds

### Size Format

Format: [value][unit]

| Unit Prefix | Meaning     |
| ----------: | :---------- |
|           B | byte        |
|             |             |
|         KiB | 1024^1 byte |
|         MiB | 1024^2 byte |
|         GiB | 1024^3 byte |
|         TiB | 1024^4 byte |
|         PiB | 1024^5 byte |
|             |             |
|          KB | 1000^1 byte |
|          MB | 1000^2 byte |
|          GB | 1000^3 byte |
|          TB | 1000^4 byte |
|          PB | 1000^5 byte |

Remarks:

- The unit is case-insensitive.
- The space between value and unit is optional.
- When the unit is not specified, the value is treated as MB if smaller than 1000, otherwise treated as byte.

## License

This is a Free and Open Source Software (FOSS) licensed under
[BSD-2-Clause](./LICENSE)
