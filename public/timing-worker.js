/**
 * Timing Worker — runs independently of the main thread's tab visibility.
 * Chrome throttles setInterval to 1s minimum in background tabs,
 * but Web Workers maintain full-speed timing regardless.
 *
 * Protocol:
 *   { type: "start", intervalMs: number }  → start ticking
 *   { type: "stop" }                       → stop ticking
 *   Worker posts: { type: "tick" }         → each interval
 */

let timerId = null;

self.onmessage = (e) => {
  const { type, intervalMs } = e.data;

  if (type === "start") {
    if (timerId !== null) clearInterval(timerId);
    timerId = setInterval(() => {
      self.postMessage({ type: "tick" });
    }, intervalMs);
  }

  if (type === "setInterval") {
    // Update the tick interval (e.g. on BPM change) without stopping
    if (timerId !== null) clearInterval(timerId);
    timerId = setInterval(() => {
      self.postMessage({ type: "tick" });
    }, intervalMs);
  }

  if (type === "stop") {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }
};
