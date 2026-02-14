# NumberGuess 🎯 יותר / פחות / בדיוק

A slick, kid-friendly Hebrew number-guessing game built with React.

משחק ניחוש מספרים בעברית — עם ממשק מלוטש, אנימציות, ובינה מלאכותית שמרגישה כמו בן-אדם.

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

### שני שחקנים (Two Players)

> Coming soon — placeholder screen is in place.

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

## 🛠 Tech Stack

| Layer       | Technology             |
| ----------- | ---------------------- |
| Framework   | React 19               |
| Build tool  | Vite 7                 |
| Language    | JavaScript (ES modules)|
| Styling     | Plain CSS + CSS vars   |
| Fonts       | Rubik (Google Fonts)   |
| Deployment  | GitHub Pages (CI/CD)   |

Zero external runtime dependencies beyond React.

---

## 📁 Project Structure

```
src/
├── components/       # Reusable UI (TopBar, Modal, Confetti, Settings)
├── screens/          # HomeScreen, ModeScreen
├── game/             # Pure game logic (humanLikeAI.js)
└── styles/           # Global CSS + design tokens
```

---

## 📸 Screenshots

> Screenshots will be added to [`/public/screenshots/`](public/screenshots/).

---

## 🌐 RTL & Accessibility

- Full **right-to-left** layout (`dir="rtl"` on `<html>`)
- All visible text in **Hebrew**
- Keyboard navigable with visible focus indicators
- High-contrast colors on dark background
- `aria-` labels on all interactive elements
- Respects `prefers-reduced-motion` via animations toggle

---

## 📄 License

[MIT](LICENSE)
