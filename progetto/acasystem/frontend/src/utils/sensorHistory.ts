/**
 * Utilities for processing raw Home Assistant sensor history data
 * before rendering in chart components.
 */

export interface TimePoint {
  value: number;
  time: Date;
}

/**
 * Downsample a time-ordered array of {value, time} points into at most
 * `maxPoints` buckets of equal time duration.  Each bucket's value is the
 * mean of all source points that fall inside it.  Only non-empty buckets are
 * emitted, so the returned array preserves the true temporal distribution of
 * the data (e.g. a solar sensor with 0 W at night and varying W during the
 * day will produce roughly the correct ratio of 0-value to non-zero buckets).
 *
 * This prevents high-frequency sensors (updating every few seconds) from
 * flooding the SparkLine with thousands of identical 0-value nighttime points
 * that cause the daytime activity to be squeezed into an invisible sliver.
 *
 * @param points - Time-ordered source points.
 * @param maxPoints - Maximum number of output buckets (default 150).
 */
export function downsampleTimeSeries(points: TimePoint[], maxPoints?: number): TimePoint[];
export function downsampleTimeSeries(points: null, maxPoints?: number): null;
export function downsampleTimeSeries(points: undefined, maxPoints?: number): undefined;
export function downsampleTimeSeries(
  points: TimePoint[] | null | undefined,
  maxPoints?: number
): TimePoint[] | null | undefined;
export function downsampleTimeSeries(
  points: TimePoint[] | null | undefined,
  maxPoints = 150
): TimePoint[] | null | undefined {
  if (!Array.isArray(points) || points.length === 0) return points;
  if (points.length <= maxPoints) return points;

  const minTime = points[0].time.getTime();
  const maxTime = points[points.length - 1].time.getTime();
  const timeRange = maxTime - minTime;

  if (timeRange === 0) {
    // All points at the same timestamp — stride-average by index for consistency
    const step = Math.ceil(points.length / maxPoints);
    const result: TimePoint[] = [];
    for (let i = 0; i < points.length; i += step) {
      const group = points.slice(i, i + step);
      const avg = group.reduce((sum, p) => sum + p.value, 0) / group.length;
      result.push({ value: avg, time: group[0].time });
    }
    return result;
  }

  const bucketSums: number[] = new Array<number>(maxPoints).fill(0);
  const bucketCounts: number[] = new Array<number>(maxPoints).fill(0);
  const bucketTimes: (number | null)[] = new Array<number | null>(maxPoints).fill(null);

  for (const point of points) {
    const t = point.time.getTime();
    const bucketIndex = Math.min(
      Math.floor(((t - minTime) / timeRange) * maxPoints),
      maxPoints - 1
    );
    bucketSums[bucketIndex] += point.value;
    bucketCounts[bucketIndex]++;
    if (bucketTimes[bucketIndex] === null) {
      bucketTimes[bucketIndex] = t;
    }
  }

  // Return non-empty buckets. The loop above guarantees at least one bucket
  // is non-empty because the input has at least one point (checked at top).
  const result: TimePoint[] = [];
  for (let i = 0; i < maxPoints; i++) {
    const bucketTime = bucketTimes[i];
    if (bucketCounts[i] > 0 && bucketTime !== null) {
      result.push({
        value: bucketSums[i] / bucketCounts[i],
        time: new Date(bucketTime),
      });
    }
  }

  return result;
}
