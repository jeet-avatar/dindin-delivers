/**
 * charByChar: reveals text character by character.
 * @param text - full string to reveal
 * @param frame - current frame (relative to sequence start)
 * @param charsPerFrame - characters revealed per frame (default 2)
 * @returns partial string visible at this frame
 */
export function charByChar(text: string, frame: number, charsPerFrame: number = 2): string {
  const chars = Math.floor(frame * charsPerFrame);
  return text.slice(0, Math.min(chars, text.length));
}

/**
 * wordStream: reveals text word by word (simulates AI streaming).
 * @param text - full string to reveal
 * @param frame - current frame (relative to sequence start)
 * @param wordsPerSecond - words revealed per second at 30fps (default 3)
 * @returns partial string visible at this frame
 */
export function wordStream(text: string, frame: number, wordsPerSecond: number = 3): string {
  const words = text.split(" ");
  const wordsPerFrame = wordsPerSecond / 30;
  const count = Math.floor(frame * wordsPerFrame);
  return words.slice(0, Math.min(count, words.length)).join(" ");
}
