# Evidence

Every number here comes from a real Kane CLI run (Kane CLI 0.10.5, Windows 11 laptop, 18 to 19 Nov 2026).
Raw logs live in `evidence/runs/<run-id>/` on the machine that ran them (gitignored; the spike NDJSON is committed in `evidence/spike/`).

## 1. Hour-1 spike

A replayed test fails when the page is wrong, with `--no-adaptive-heal`. The cart badge was broken by hand:
`testmd run` exit 1 and `testrun run` exit 1 (member `failed`, `authored: 0`). Output: [`spike/`](spike/).

## 2. Before and after (demo shop, 10 hand-written bugs)

| | Suite | Caught |
|---|---|---|
| Before | 4 starter tests | **0 / 10** |
| After | 4 starter + 14 Claude-written, Kane-proven tests | **10 / 10** |

Runs: `run --replay` `2026-11-18T16-26-23Z` (baseline exec `262da6b6-09ef-465f-afc6-3316bdbe18ab`, all 18 tests passed on the clean build; before 0/10; after: M01 to M06 and M10 caught, M07 to M09 no verdict because Kane's browser crashed or hung on the laptop), then `attack --with-generated --only M07,M08,M09` on 19 Nov with the fixed version: all 3 caught, each confirmed by re-running the failing test alone.

| Bug | What breaks | Before | After | First test to catch it |
|---|---|---|---|---|
| M01 | Cart total skips the last item | slipped | caught | `cart_remove_deletes_clicked_item_test.md` |
| M02 | "+" quantity button does nothing | slipped | caught | `cart_quantity_increase_button_test.md` |
| M03 | SAVE10 takes 1% instead of 10% | slipped | caught | `save10_discount_ten_percent_test.md` |
| M04 | No shipping fee under $50 | slipped | caught | `cart_quantity_increase_button_test.md` |
| M05 | Checkout accepts the email "a@" | slipped | caught | `checkout_rejects_email_without_tld_test.md` |
| M06 | "Remove" deletes the wrong item | slipped | caught | `cart_remove_deletes_clicked_item_test.md` |
| M07 | Out-of-stock item can be added | slipped | caught (confirmed) | `out_of_stock_beanie_cannot_be_added_test.md` |
| M08 | Order number is blank | slipped | caught (confirmed) | `order_confirmation_shows_order_number_test.md` |
| M09 | Login lands on Home, not My account | slipped | caught (confirmed) | `login_redirects_to_account_test.md` |
| M10 | Cart empties on page refresh | slipped | caught | `cart_remove_deletes_clicked_item_test.md` (also `cart_survives_page_refresh_test.md`) |

Why the starter suite missed everything: no test checks a total, shipping or discount; none presses "+", "Remove" or opens an out-of-stock product; checkout only uses a valid email and only checks "Thank you for your order"; the login test checks the header, which looks the same on Home and My account; none reloads the page.

## 3. Duel (red Claude vs blue Claude, Kane referees)

Run on 19 Nov, 3 rounds, model `claude-opus-5-5` for both sides. Every red bug was confirmed real and visible by Kane (`kane-cli run`: the check passes on the bugged build and fails on the correct one) before it counted.

| Round | Red planted | Suite vs bug | Blue's Kane-proven test |
|---|---|---|---|
| 1 | Cart badge counts distinct products, not total quantity (M11) | all 18 passed | `cart_badge_counts_total_quantity_test.md` (attempt 1) |
| 2 | Free shipping checks the subtotal before the discount (M12) | all 19 passed | `save10_drops_below_free_shipping_threshold_test.md` (attempt 1) |
| 3 | Sign out leaves the customer signed in (M13) | all 20 passed | `sign_out_clears_signed_in_header_test.md` (attempt 1) |

**Red 3 : Blue 3.** Suite 18 → 21 tests. Scoreboard: `reports/latest-duel/duel.html`.

## 4. Credits

| Step | Credits |
|---|---|
| Spike (3 short runs) | ~19 |
| Baseline, 4 tests | ~3 |
| Attack, 10 bugs × 4 tests | ~19 |
| Fill, 10 survivors (recording new tests is the expensive part) | ~1,080 |
| Full `run --replay` (18 tests, before and after) | ~400 |
| Duel, 3 rounds | ~450 |

## 5. What went wrong, and what we fixed

- A stopped fill left an unproven test behind. Now a stopped fill removes it, and every proven test is recorded in `tests/kane/generated/proven.json`.
- A full disk crashed Chrome, and Kane reported the crashed tests as `failed`. Saboteur now treats browser crashes and timeouts as errors, never as caught bugs, and `doctor` checks free disk space.
- Kane hung for 2 hours after a browser crash, because Saboteur's timeout only stopped the Windows launcher. It now kills the whole process tree, and stops Kane after 10 minutes of silence.
- One generated test failed on the correct shop in a later run (flaky). It was moved to `tests/kane/quarantine/` instead of being kept.

## 6. Launch posts

| Platform | Link | Date |
|---|---|---|
| | | |
| | | |
