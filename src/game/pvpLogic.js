/**
 * Pure logic helpers for the PvP (two-player) number guessing game.
 * No DOM, no React — just data transforms.
 */

/**
 * Clamp a value between min and max (inclusive).
 */
export function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Validate that a string represents a valid integer in [0, 100].
 * Returns { ok: true, value: number } or { ok: false, error: string }.
 */
export function validateNumber(raw) {
  const trimmed = String(raw).trim();
  if (trimmed === '') return { ok: false, error: 'הכניסו מספר' };

  const num = Number(trimmed);
  if (!Number.isInteger(num)) return { ok: false, error: 'מספר שלם בלבד' };
  if (num < 0 || num > 100) return { ok: false, error: 'המספר חייב להיות בין 0 ל-100' };

  return { ok: true, value: num };
}

/**
 * Compare a guess to the secret.
 * Returns 'higher' | 'lower' | 'correct'.
 */
export function compareGuess(guess, secret) {
  if (guess < secret) return 'higher';
  if (guess > secret) return 'lower';
  return 'correct';
}

/**
 * Given the current known range [low, high] and the latest feedback,
 * return a narrowed range { low, high }.
 */
export function updateRangeFromFeedback(low, high, guess, feedback) {
  if (feedback === 'higher') return { low: Math.max(low, guess + 1), high };
  if (feedback === 'lower')  return { low, high: Math.min(high, guess - 1) };
  return { low: guess, high: guess }; // correct
}

/**
 * Swap roles: chooser becomes guesser, guesser becomes chooser.
 * chooser / guesser are 1 or 2.
 */
export function swapRoles(chooser) {
  return chooser === 1 ? 2 : 1;
}
