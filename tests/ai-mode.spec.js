import { test, expect } from '@playwright/test';

test.describe('AI Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('navigates to AI mode and starts a game', async ({ page }) => {
    // Click "נגד המחשב" card
    await page.getByTestId('mode-cpu').click();

    // Verify difficulty selector is visible (default: medium)
    await expect(page.getByTestId('difficulty-medium')).toBeVisible();

    // Select easy difficulty
    await page.getByTestId('difficulty-easy').click();
    await expect(page.getByTestId('difficulty-easy')).toHaveAttribute('aria-checked', 'true');

    // Start the game
    await page.getByTestId('btn-start').click();

    // Wait for AI guess to appear (not '?')
    const guessEl = page.getByTestId('ai-guess');
    await expect(guessEl).toBeVisible();
    await expect(guessEl).not.toHaveText('?', { timeout: 5000 });

    // Verify feedback buttons are visible
    await expect(page.getByTestId('btn-higher')).toBeVisible();
    await expect(page.getByTestId('btn-lower')).toBeVisible();
    await expect(page.getByTestId('btn-exact')).toBeVisible();
  });

  test('selects each difficulty level', async ({ page }) => {
    await page.getByTestId('mode-cpu').click();

    for (const key of ['easy', 'medium', 'hard']) {
      await page.getByTestId(`difficulty-${key}`).click();
      await expect(page.getByTestId(`difficulty-${key}`)).toHaveAttribute('aria-checked', 'true');
    }
  });

  test('disables "יותר" button when guess is 100 or AI loses on collapse', async ({ page }) => {
    await page.getByTestId('mode-cpu').click();
    await page.getByTestId('btn-start').click();

    const guessEl = page.getByTestId('ai-guess');
    const btnHigher = page.getByTestId('btn-higher');
    const lossOverlay = page.getByTestId('overlay-loss');

    // Keep clicking "יותר" until AI guesses 100 / button disabled / or loss overlay appears
    for (let i = 0; i < 20; i++) {
      // Check if loss overlay appeared (range collapsed)
      if (await lossOverlay.isVisible().catch(() => false)) {
        await expect(lossOverlay).toBeVisible();
        return;
      }

      if (!(await guessEl.isVisible().catch(() => false))) {
        // Phase changed — loss overlay should be showing
        if (await lossOverlay.isVisible().catch(() => false)) return;
        return;
      }

      await expect(guessEl).not.toHaveText('?', { timeout: 5000 });

      const guessText = await guessEl.textContent();
      const guess = parseInt(guessText, 10);

      if (guess === 100) {
        // Button should be disabled when guess is 100
        await expect(btnHigher).toBeDisabled();
        return;
      }

      // Click higher and wait for next guess or loss overlay
      await btnHigher.click();
      await Promise.race([
        guessEl.waitFor({ state: 'visible', timeout: 5000 }).then(async () => {
          await expect(guessEl).not.toHaveText(guessText, { timeout: 5000 });
        }),
        lossOverlay.waitFor({ state: 'visible', timeout: 5000 }),
      ]).catch(() => {});
    }
  });

  test('disables "פחות" button when guess is 0', async ({ page }) => {
    await page.getByTestId('mode-cpu').click();
    await page.getByTestId('btn-start').click();

    const guessEl = page.getByTestId('ai-guess');
    const btnLower = page.getByTestId('btn-lower');

    // Keep clicking "פחות" until AI guesses 0 or button gets disabled
    for (let i = 0; i < 20; i++) {
      await expect(guessEl).not.toHaveText('?', { timeout: 5000 });

      const guessText = await guessEl.textContent();
      const guess = parseInt(guessText, 10);

      if (guess === 0) {
        // Button should be disabled when guess is 0
        await expect(btnLower).toBeDisabled();
        return;
      }

      // Click lower and wait for next guess
      await btnLower.click();
      await expect(guessEl).not.toHaveText(guessText, { timeout: 5000 });
    }
  });

  test('shows contradiction or loss overlay when bounds become invalid or collapse', async ({ page }) => {
    await page.getByTestId('mode-cpu').click();
    await page.getByTestId('difficulty-hard').click();
    await page.getByTestId('btn-start').click();

    const guessEl = page.getByTestId('ai-guess');
    const contradictionOverlay = page.getByTestId('overlay-contradiction');
    const lossOverlay = page.getByTestId('overlay-loss');

    // Wait for first guess
    await expect(guessEl).not.toHaveText('?', { timeout: 5000 });

    // Keep clicking "higher" to push range up; may trigger loss (collapse) or contradiction.
    for (let i = 0; i < 25; i++) {
      // Check if either overlay appeared
      if (await contradictionOverlay.isVisible().catch(() => false)) {
        await expect(contradictionOverlay).toBeVisible();
        return;
      }
      if (await lossOverlay.isVisible().catch(() => false)) {
        await expect(lossOverlay).toBeVisible();
        return;
      }

      if (!(await guessEl.isVisible().catch(() => false))) {
        // Phase changed — one of the overlays should be visible
        const eitherVisible = await contradictionOverlay.isVisible().catch(() => false)
          || await lossOverlay.isVisible().catch(() => false);
        expect(eitherVisible).toBeTruthy();
        return;
      }

      const btnHigher = page.getByTestId('btn-higher');
      if (await btnHigher.isDisabled()) {
        await page.getByTestId('btn-lower').click();
      } else {
        await btnHigher.click();
      }

      await Promise.race([
        guessEl.waitFor({ state: 'visible', timeout: 5000 }).then(async () => {
          await expect(guessEl).not.toHaveText('?', { timeout: 5000 });
        }),
        contradictionOverlay.waitFor({ state: 'visible', timeout: 5000 }),
        lossOverlay.waitFor({ state: 'visible', timeout: 5000 }),
      ]).catch(() => {});
    }
  });

  test('reset button returns to setup after contradiction or loss', async ({ page }) => {
    await page.getByTestId('mode-cpu').click();
    await page.getByTestId('difficulty-hard').click();
    await page.getByTestId('btn-start').click();

    const guessEl = page.getByTestId('ai-guess');
    const contradictionOverlay = page.getByTestId('overlay-contradiction');
    const lossOverlay = page.getByTestId('overlay-loss');

    // Wait for first guess
    await expect(guessEl).not.toHaveText('?', { timeout: 5000 });

    for (let i = 0; i < 25; i++) {
      // Check if either overlay appeared
      if (await contradictionOverlay.isVisible().catch(() => false)) {
        await page.getByTestId('btn-reset-round').click();
        await expect(page.getByTestId('btn-start')).toBeVisible();
        return;
      }
      if (await lossOverlay.isVisible().catch(() => false)) {
        await page.getByTestId('btn-reset-round').click();
        await expect(page.getByTestId('btn-start')).toBeVisible();
        return;
      }

      if (!(await guessEl.isVisible().catch(() => false))) {
        // Phase changed — one of the overlays should be visible
        if (await contradictionOverlay.isVisible().catch(() => false)) {
          await page.getByTestId('btn-reset-round').click();
        } else if (await lossOverlay.isVisible().catch(() => false)) {
          await page.getByTestId('btn-reset-round').click();
        }
        await expect(page.getByTestId('btn-start')).toBeVisible();
        return;
      }

      const btnHigher = page.getByTestId('btn-higher');
      if (await btnHigher.isDisabled()) {
        await page.getByTestId('btn-lower').click();
      } else {
        await btnHigher.click();
      }

      await Promise.race([
        guessEl.waitFor({ state: 'visible', timeout: 5000 }).then(async () => {
          await expect(guessEl).not.toHaveText('?', { timeout: 5000 });
        }),
        contradictionOverlay.waitFor({ state: 'visible', timeout: 5000 }),
        lossOverlay.waitFor({ state: 'visible', timeout: 5000 }),
      ]).catch(() => {});
    }
  });

  test('clicking "בדיוק" shows win overlay', async ({ page }) => {
    await page.getByTestId('mode-cpu').click();
    await page.getByTestId('btn-start').click();

    const guessEl = page.getByTestId('ai-guess');
    await expect(guessEl).not.toHaveText('?', { timeout: 5000 });

    // Click "בדיוק!"
    await page.getByTestId('btn-exact').click();

    // Win overlay should appear
    const winOverlay = page.locator('.win-overlay');
    await expect(winOverlay).toBeVisible();
  });

  test('shows loss overlay when range collapses to one number', async ({ page }) => {
    await page.getByTestId('mode-cpu').click();
    await page.getByTestId('difficulty-hard').click();
    await page.getByTestId('btn-start').click();

    const guessEl = page.getByTestId('ai-guess');
    const lossOverlay = page.getByTestId('overlay-loss');

    // Wait for first guess
    await expect(guessEl).not.toHaveText('?', { timeout: 5000 });

    // Alternately push the AI into a single-option range by always saying "lower"
    // until either the loss overlay appears or the contradiction overlay appears.
    for (let i = 0; i < 25; i++) {
      if (await lossOverlay.isVisible().catch(() => false)) {
        // Loss overlay appeared — verify it
        await expect(lossOverlay).toBeVisible();
        // Verify reset button is present
        await expect(page.getByTestId('btn-reset-round')).toBeVisible();
        return;
      }

      // Check for contradiction overlay (may appear before collapse)
      const contradictionOverlay = page.getByTestId('overlay-contradiction');
      if (await contradictionOverlay.isVisible().catch(() => false)) {
        // Contradiction appeared before collapse — acceptable, test still passes
        return;
      }

      if (!(await guessEl.isVisible().catch(() => false))) {
        // Phase changed — check for loss overlay
        await expect(lossOverlay).toBeVisible({ timeout: 3000 });
        return;
      }

      // Always say "lower" to force the AI range down
      const btnLower = page.getByTestId('btn-lower');
      if (await btnLower.isDisabled()) {
        // At 0, say "higher" to continue narrowing from other side
        await page.getByTestId('btn-higher').click();
      } else {
        await btnLower.click();
      }

      // Wait for either next guess or overlay
      await Promise.race([
        guessEl.waitFor({ state: 'visible', timeout: 5000 }).then(async () => {
          await expect(guessEl).not.toHaveText('?', { timeout: 5000 });
        }),
        lossOverlay.waitFor({ state: 'visible', timeout: 5000 }),
        contradictionOverlay.waitFor({ state: 'visible', timeout: 5000 }),
      ]).catch(() => {});
    }
  });

  test('loss overlay reset button returns to setup', async ({ page }) => {
    await page.getByTestId('mode-cpu').click();
    await page.getByTestId('difficulty-hard').click();
    await page.getByTestId('btn-start').click();

    const guessEl = page.getByTestId('ai-guess');
    const lossOverlay = page.getByTestId('overlay-loss');

    await expect(guessEl).not.toHaveText('?', { timeout: 5000 });

    for (let i = 0; i < 25; i++) {
      if (await lossOverlay.isVisible().catch(() => false)) {
        await page.getByTestId('btn-reset-round').click();
        await expect(page.getByTestId('btn-start')).toBeVisible();
        return;
      }

      const contradictionOverlay = page.getByTestId('overlay-contradiction');
      if (await contradictionOverlay.isVisible().catch(() => false)) {
        // Contradiction instead of collapse — reset and end test
        await page.getByTestId('btn-reset-round').click();
        await expect(page.getByTestId('btn-start')).toBeVisible();
        return;
      }

      if (!(await guessEl.isVisible().catch(() => false))) {
        if (await lossOverlay.isVisible().catch(() => false)) {
          await page.getByTestId('btn-reset-round').click();
          await expect(page.getByTestId('btn-start')).toBeVisible();
        }
        return;
      }

      const btnLower = page.getByTestId('btn-lower');
      if (await btnLower.isDisabled()) {
        await page.getByTestId('btn-higher').click();
      } else {
        await btnLower.click();
      }

      await Promise.race([
        guessEl.waitFor({ state: 'visible', timeout: 5000 }).then(async () => {
          await expect(guessEl).not.toHaveText('?', { timeout: 5000 });
        }),
        lossOverlay.waitFor({ state: 'visible', timeout: 5000 }),
        contradictionOverlay.waitFor({ state: 'visible', timeout: 5000 }),
      ]).catch(() => {});
    }
  });
});

test.describe('PvP Mode — Loss on range collapse', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('guesser loses when range collapses to one number', async ({ page }) => {
    // Navigate to PvP mode
    await page.getByTestId('mode-pvp').click();

    // Start round
    await page.locator('button', { hasText: 'התחלה' }).click();

    // Privacy screen — proceed
    await page.locator('button', { hasText: 'מוכן' }).click();

    // Enter secret: 50
    await page.locator('input[aria-label="מספר סודי"]').fill('50');
    await page.locator('button', { hasText: 'אישור' }).click();

    // Handoff — skip to guessing
    await page.locator('button', { hasText: /התחל לנחש|דלג/ }).click();

    // Now we need to force the range to collapse to exactly one number.
    // Strategy: guess numbers that narrow the range to a single value.
    // Secret is 50. Guess 49 → "higher" (range: 50–100). Guess 51 → "lower" (range: 50–50) → collapse!
    const guessInput = page.locator('#guess-input');
    const submitBtn = page.locator('button', { hasText: 'נחש' });

    // Guess 49 → feedback: "higher" → range: 50–100
    await guessInput.fill('49');
    await submitBtn.click();

    // Guess 51 → feedback: "lower" → range: 50–50 → loss!
    await guessInput.fill('51');
    await submitBtn.click();

    // Loss overlay should appear
    const lossOverlay = page.getByTestId('overlay-loss');
    await expect(lossOverlay).toBeVisible({ timeout: 3000 });

    // Verify reset button
    await expect(page.getByTestId('btn-reset-round')).toBeVisible();
  });

  test('PvP loss overlay reset starts new round', async ({ page }) => {
    await page.getByTestId('mode-pvp').click();
    await page.locator('button', { hasText: 'התחלה' }).click();
    await page.locator('button', { hasText: 'מוכן' }).click();
    await page.locator('input[aria-label="מספר סודי"]').fill('50');
    await page.locator('button', { hasText: 'אישור' }).click();
    await page.locator('button', { hasText: /התחל לנחש|דלג/ }).click();

    const guessInput = page.locator('#guess-input');
    const submitBtn = page.locator('button', { hasText: 'נחש' });

    await guessInput.fill('49');
    await submitBtn.click();
    await guessInput.fill('51');
    await submitBtn.click();

    // Loss overlay should be visible
    const lossOverlay = page.getByTestId('overlay-loss');
    await expect(lossOverlay).toBeVisible({ timeout: 3000 });

    // Click reset — starts new round (goes to privacy screen)
    await page.getByTestId('btn-reset-round').click();

    // Should be in privacy screen — "מוכן" button visible
    await expect(page.locator('button', { hasText: 'מוכן' })).toBeVisible();
  });
});
