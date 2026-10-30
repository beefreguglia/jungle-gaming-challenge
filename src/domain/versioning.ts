/**
 * Monotonic resource versions guard against duplicate and out-of-order realtime events:
 * an update is applied only when it is strictly newer than what the client holds.
 */
export function isNewerVersion(current: number | undefined, incoming: number): boolean {
  return current === undefined || incoming > current
}
