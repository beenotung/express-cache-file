export type CacheSize =
  | undefined
  | 'unlimited' // default
  | number // bytes
  | string; // size format

namespace Size {
  export const kb = 1024;
  export const mb = kb * 1024;
  export const gb = mb * 1024;
  export const tb = gb * 1024;
  export const pb = tb * 1024;

  export const kib = 1000;
  export const mib = kib * 1000;
  export const gib = mib * 1000;
  export const tib = gib * 1000;
  export const pib = tib * 1000;
}

function parseSize(size: CacheSize): number {
  if (!size || size === 'unlimited') return -1;
  if (typeof size === 'number') return -1;

  let value = parseFloat(size);
  let unit = size.replace(value.toString(), '').trim().toLowerCase();

  if (unit.startsWith('b')) return value;

  if (unit.startsWith('ki')) return value * Size.kib;
  if (unit.startsWith('mi')) return value * Size.mib;
  if (unit.startsWith('gi')) return value * Size.gib;
  if (unit.startsWith('ti')) return value * Size.tib;
  if (unit.startsWith('pi')) return value * Size.pib;

  if (unit.startsWith('k')) return value * Size.kb;
  if (unit.startsWith('m')) return value * Size.mb;
  if (unit.startsWith('g')) return value * Size.gb;
  if (unit.startsWith('t')) return value * Size.tb;
  if (unit.startsWith('p')) return value * Size.pb;

  if (value < 1024) return value * Size.mb;

  return value;
}

export default parseSize;
