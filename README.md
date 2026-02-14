# NumberGuess 🎯 יותר / פחות / בדיוק

A slick, kid-friendly Hebrew number-guessing game built with React.

משחק ניחוש מספרים בעברית — עם ממשק מלוטש, אנימציות, ובינה מלאכותית שמרגישה כמו בן-אדם. בעלת שני מצבי משחק: נגד המחשב או בין שני שחקנים.

---

## 🎮 How to Play / איך משחקים?

### נגד המחשב (Vs Computer)

1. Think of a number between **0** and **100**.
2. The computer guesses — you respond:
   - **יותר** — your number is higher
   - **פחות** — your number is lower
   - **בדיוק!** — correct guess
3. Try to make the computer use as many guesses as possible!
4. Choose a difficulty level: **קל** (Easy), **בינוני** (Medium), or **קשה** (Hard).

**Features:**
- Human-like AI that mimics real guessing patterns
- Difficulty adapts AI strategy and randomness
- Score tracking: wins, AI wins, and average guesses
- Smooth animations and real-time feedback

### שני שחקנים (Two Players)

1. **Setup Phase:** Choose who goes first (Player 1 or Player 2).
2. **Privacy Screen:** Handoff between players with optional countdown.
3. **Secret Entry:** Player 1 enters a secret number (0–100) with password-masked input.
4. **Guessing:** Player 2 guesses and receives feedback:
   - **יותר** — secret number is higher
   - **פחות** — secret number is lower
   - **בדיוק!** — correct guess
5. **Scoring:** Track wins and best attempts for both players.
6. **Replay:** Play again with same roles or swap and play.

**Features:**
- Hidden input phase prevents cheating
- Screen handoff prompts for privacy
- Optional countdown animation
- Guess history with all feedback
- Scoreboard with best attempts tracked per player
- Swap roles and play again without resetting scores

---

## ✨ Features

- ✅ **Two Game Modes:** Vs Computer (AI) and Two-Player (PvP)
- ✅ **Human-like AI:** Realistic guessing with difficulty levels
- ✅ **RTL Support:** Full right-to-left layout for Hebrew
- ✅ **Accessibility:** ARIA labels, keyboard navigation, high contrast
- ✅ **Boundary Protection:** Invalid bounds detection (e.g., guess at limits)
- ✅ **Dark Mode UI:** Smooth, modern dark theme with animations
- ✅ **Responsive Design:** Mobile-first, works on all screen sizes
- ✅ **Settings Panel:** Toggle animations, sound, and difficulty presets
- ✅ **Automated Testing:** E2E tests with Playwright (7 tests passing)
- ✅ **Performance:** Zero external dependencies, ~70KB gzipped bundle

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🧪 Automated Testing

This project includes comprehensive **end-to-end (E2E) tests** using **Playwright**.

### Run Tests

```bash
# Run all tests (headless)
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run specific test file
npx playwright test tests/e2e/game.spec.js
```

### Test Coverage

- ✅ 7 E2E tests covering:
  - Game initialization and mode selection
  - AI guessing logic and difficulty levels
  - Two-player flow (secret entry → guessing → scoring)
  - Boundary conditions and edge cases
  - UI interactions and accessibility

### Viewing Reports

```bash
# Show test report (after tests run)
npx playwright show-report
```

---

## 🛠 Tech Stack

| Layer       | Technology             |
| ----------- | ---------------------- |
| Framework   | React 19               |
| Build tool  | Vite 7                 |
| Language    | JavaScript (ES modules)|
| Styling     | Plain CSS + CSS vars   |
| Testing     | Playwright E2E         |
| Fonts       | Rubik (Google Fonts)   |
| Deployment  | GitHub Pages (CI/CD)   |

Zero external runtime dependencies beyond React.

---

## 📁 Project Structure

```
src/
├── components/              # Reusable UI (TopBar, Modal, Confetti, Settings)
├── screens/                 # HomeScreen, ModeScreen
├── game/                    # Pure game logic (humanLikeAI.js, pvpLogic.js)
└── styles/                  # Global CSS + design tokens
tests/
├── e2e/                     # Playwright E2E tests
└── fixtures/                # Test utilities and fixtures
```

---

## 🎯 Game Logic

### AI Mode (`humanLikeAI.js`)

- Pure, immutable state management
- Binary search base with human-like randomness
- Difficulty-based deviation: **easy** (±3), **medium** (±2), **hard** (±1)
- Personality messages that scale based on proximity to target

### PvP Mode (`pvpLogic.js`)

- Pure validation and comparison logic
- Range narrowing based on feedback
- Role swapping between rounds

---

## 🌐 RTL & Accessibility

- Full **right-to-left** layout (`dir="rtl"` on `<html>`)
- All visible text in **Hebrew**
- Keyboard navigable with visible focus indicators
- High-contrast colors on dark background
- `aria-` labels on all interactive elements
- Respects `prefers-reduced-motion` via animations toggle
- Screen reader friendly

---

## 📄 License

[MIT](LICENSE)

---

## 🔗 Links

- **Repository:** [github.com/tamiro44/NumberGuess](https://github.com/tamiro44/NumberGuess)
- **Issues & Feedback:** Use GitHub Issues

