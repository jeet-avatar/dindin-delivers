/**
 * charByChar: reveals text character by character.
 */
export function charByChar(text: string, frame: number, charsPerFrame: number = 2): string {
  const chars = Math.floor(frame * charsPerFrame);
  return text.slice(0, Math.min(chars, text.length));
}

/**
 * wordStream: reveals text word by word (simulates AI streaming).
 */
export function wordStream(text: string, frame: number, wordsPerSecond: number = 3): string {
  const words = text.split(" ");
  const wordsPerFrame = wordsPerSecond / 30;
  const count = Math.floor(frame * wordsPerFrame);
  return words.slice(0, Math.min(count, words.length)).join(" ");
}
