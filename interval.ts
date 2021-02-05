export type UpdateInterval =
  | undefined
  | 'immediate' // default
  | number // ms
  | string; // duration format

namespace Interval {
  export const second = 1000;
  export const minute = second * 60;
  export const hour = minute * 60;
  export const day = hour * 24;
}

function parseInterval(interval: UpdateInterval): number {
  if (!interval) return -1;
  if (typeof interval === 'number') return interval;

  const value = parseFloat(interval);
  const unit = interval.replace(value.toString(), '').trim().toLowerCase();

  if (unit.startsWith('ms')) return value;
  if (unit.startsWith('s')) return value * Interval.second;
  if (unit.startsWith('m')) return value * Interval.minute;
  if (unit.startsWith('h')) return value * Interval.hour;
  if (unit.startsWith('d')) return value * Interval.day;

  if (value < 1000) return value * Interval.second;

  return value;
}
export default parseInterval;
