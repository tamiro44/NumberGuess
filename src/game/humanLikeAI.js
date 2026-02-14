/**
 * Human-like AI for number guessing game (0–100).
 *
 * The AI narrows a range like binary search but adds controlled
 * randomness so it *feels* like a person guessing — slightly off-center,
 * more chaotic early on, sharper when it closes in.
 *
 * Difficulty controls the max deviation from the "ideal" midpoint:
 *   easy   → ±3
 *   medium → ±2
 *   hard   → ±1
 *
 * All functions are pure (no side-effects, no DOM).
 */

const DIFFICULTY_DEVIATION = {
  easy: 3,
  medium: 2,
  hard: 1,
};

const THINKING_MESSAGES = [
  'המחשב חושב...',
  'המממ...',
  'אולי זה באזור הזה...',
  'רגע, תנו לי לחשוב...',
  'מעניין...',
  'אני כמעט בטוח...',
  'בואו ננסה ככה...',
  'זה חייב להיות קרוב...',
  'אוקיי, יש לי רעיון!',
  'חכו רגע...',
];

const CLOSE_MESSAGES = [
  'זה חייב להיות קרוב!',
  'אני מרגיש שזה פה...',
  'עוד קצת!',
  'כמעט שם!',
];

/**
 * Create a fresh AI state for a new round.
 */
export function createAIState(difficulty = 'medium') {
  return {
    low: 0,
    high: 100,
    guessCount: 0,
    lastGuess: null,
    difficulty,
    maxDeviation: DIFFICULTY_DEVIATION[difficulty] ?? 2,
    usedMessageIndices: [],
  };
}

/**
 * Pick the next guess based on the current state.
 * Returns { guess: number, message: string }.
 */
export function nextGuess(state) {
  const { low, high, guessCount, maxDeviation } = state;
  const range = high - low;

  // Ideal midpoint
  const mid = Math.round((low + high) / 2);

  let guess;

  if (range <= 1) {
    // Only one or two possibilities left — just pick the right one
    guess = low === state.lastGuess ? high : low;
  } else if (range <= 3) {
    // Very narrow — go precise
    guess = mid;
  } else {
    // Determine how "random" to be based on game progress
    // Early (guessCount 0-2): 40% chance of random offset
    // Mid   (guessCount 3-5): 20% chance
    // Late  (guessCount 6+):  8% chance
    let randomChance;
    if (guessCount <= 2) {
      randomChance = 0.4;
    } else if (guessCount <= 5) {
      randomChance = 0.2;
    } else {
      randomChance = 0.08;
    }

    if (Math.random() < randomChance) {
      // Apply a random offset from the midpoint
      const deviation = Math.floor(Math.random() * (maxDeviation * 2 + 1)) - maxDeviation;
      guess = mid + deviation;
    } else {
      // Slight human-style imprecision: ±1 wobble
      const wobble = range > 6 ? Math.round(Math.random() * 2 - 1) : 0;
      guess = mid + wobble;
    }

    // Clamp within bounds
    guess = Math.max(low, Math.min(high, guess));

    // Avoid repeating the same guess
    if (guess === state.lastGuess) {
      guess = guess < mid ? guess + 1 : guess - 1;
      guess = Math.max(low, Math.min(high, guess));
    }
  }

  // Pick a personality message
  const message = pickMessage(state);

  return { guess, message };
}

/**
 * Update the AI's knowledge after receiving feedback.
 * feedback: 'higher' | 'lower' | 'correct'
 * guess: the number that was just guessed
 *
 * Returns a new state object (immutable).
 * If bounds become invalid (contradiction), sets state.invalid = true
 */
export function updateStateFromFeedback(state, feedback, guess) {
  const next = { ...state, guessCount: state.guessCount + 1, lastGuess: guess };

  if (feedback === 'higher') {
    // The target is higher than our guess
    next.low = Math.max(state.low, guess + 1);
  } else if (feedback === 'lower') {
    // The target is lower than our guess
    next.high = Math.min(state.high, guess - 1);
  }
  // 'correct' — no bounds update needed

  // Clamp bounds to valid range [0, 100]
  next.low = Math.max(0, Math.min(100, next.low));
  next.high = Math.max(0, Math.min(100, next.high));

  // Detect contradiction: if low > high, bounds became invalid
  if (next.low > next.high) {
    next.invalid = true;
  }

  return next;
}

/**
 * Generate a random thinking delay in ms (700–1200).
 */
export function getThinkingDelay() {
  return 700 + Math.floor(Math.random() * 500);
}

/* ---- Helpers ---- */

function pickMessage(state) {
  const range = state.high - state.low;

  // When range is small, use "close" messages
  if (range <= 10 && state.guessCount >= 2) {
    return CLOSE_MESSAGES[Math.floor(Math.random() * CLOSE_MESSAGES.length)];
  }

  // Pick a random thinking message, avoiding recent repeats
  let idx;
  let attempts = 0;
  do {
    idx = Math.floor(Math.random() * THINKING_MESSAGES.length);
    attempts++;
  } while (state.usedMessageIndices.includes(idx) && attempts < 8);

  // Track last 3 used indices to avoid repeats
  state.usedMessageIndices = [...state.usedMessageIndices.slice(-2), idx];

  return THINKING_MESSAGES[idx];
}
