/**
 * Runs `callback` in the frame after the next one (ISSUE-109, R7; user answer D-6). A `focus()` in
 * the callback of the next frame forces the style of the page the state change has just dirtied,
 * inside the long task of that change; one frame later the page has been drawn, the style is
 * clean, and the call costs next to nothing. Returns a function that cancels it.
 */
export function afterNextFrame(callback: () => void): () => void {
  if (typeof requestAnimationFrame !== 'function') {
    const timer = setTimeout(callback, 32);
    return () => clearTimeout(timer);
  }
  let second: number | null = null;
  const first = requestAnimationFrame(() => {
    second = requestAnimationFrame(() => {
      second = null;
      callback();
    });
  });
  return () => {
    cancelAnimationFrame(first);
    if (second !== null) cancelAnimationFrame(second);
  };
}
