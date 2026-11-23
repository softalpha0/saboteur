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

## 3b. Second app: React TodoMVC (an app we didn't write)

The official React TodoMVC from tastejs/todomvc (MIT), `src/` unchanged, 10 hand-written bugs, 4 starter tests (add, complete, delete, edit a todo). Model `claude-opus-5-5`.

Final run `2026-11-20T02-11-09Z` (baseline exec `5ddfbe24-46d1-4bc9-be69-6bdc9872a725`, all 10 tests passed on the clean build). The tests for M01 and M03 to M07 were written and proven in run `2026-11-19T18-30-13Z`; the M09 test in the final run. Every catch below was confirmed by re-running the test on its own.

| Bug | Starter suite (4 tests) | With Claude's Kane-proven tests | Caught by |
|---|---|---|---|
| M01 counter counts completed todos | slipped | caught | `clear_completed_keeps_active_test.md` (step 6) |
| M02 "1 items left!" | **caught** | caught | `add_todo_test.md` (starter, step 7) |
| M03 Active filter shows completed todos | slipped | caught | `active_filter_hides_completed_test.md` (step 7) |
| M04 Completed filter shows active todos | slipped | caught | `completed_filter_shows_only_completed_test.md` (step 6) |
| M05 Clear completed deletes active todos | slipped | caught | `clear_completed_keeps_active_test.md` (step 7) |
| M06 todo of only spaces is added | slipped | caught | `spaces_only_todo_not_added_test.md` (step 10) |
| M07 emptied todo is not deleted | slipped | caught | `clearing_todo_text_deletes_it_test.md` (step 9) |
| M08 delete removes the first todo | slipped | caught | `clearing_todo_text_deletes_it_test.md` (step 9), written for M07 |
| M09 toggle all cannot un-complete | slipped | caught | `toggle_all_marks_all_active_again_test.md` (`action_failed: click @ step 1`) |
| M10 edit not saved | **caught** | caught | `edit_todo_test.md` (starter, step 8) |

**Before 2/10, after 10/10.** Suite 4 → 11 tests. 7 new tests, all proven on attempt 1; M08 needed no new test because the M07 test already caught it.

Notes:
- In run `2026-11-19T18-30-13Z`, two starter tests failed with `analyzer_failed` (a Kane-side error) on M03 and M08. The confirm runs passed, the suite was re-run, and both bugs were correctly scored as slipped. `analyzer_failed` is now treated as an error, never a catch.
- The same run stopped at M08 when Kane lost its sign-in (`TMS did not return an org_id`); the final run picked up from the committed tests.
- Closed-loop check (23 Nov): to see Kane's failure text drive a retry, M09 was attacked again with only the 4 starter tests (slipped, as before) and filled with a smaller model (`claude-haiku-5-5`). It wrote `toggle_all_uncompletes_individually_completed_test.md`, proven on attempt 1 (passed on the clean build, failed on the bug). So across every real fill, with two models, the retry was never needed; the retry path is covered by the automated tests (`packages/cli/test/fill.test.ts`, a scripted Kane run where attempt 1 fails on the clean build and attempt 2 is proven).
- The M09 test fails on the bugged build at its first step rather than its final check. It passed on the correct app and failed twice on the bug, which is Saboteur's accept rule.

## 4. Credits

| Step | Credits |
|---|---|
| Spike (3 short runs) | ~19 |
| Baseline, 4 tests | ~3 |
| Attack, 10 bugs × 4 tests | ~19 |
| Fill, 10 survivors (recording new tests is the expensive part) | ~1,080 |
| Full `run --replay` (18 tests, before and after) | ~400 |
| Duel, 3 rounds | ~450 |
| TodoMVC, 3 runs (one stopped by a serve bug, one by a Kane sign-out, one final) | ~750 |

## 5. What went wrong, and what we fixed

- A stopped fill left an unproven test behind. Now a stopped fill removes it, and every proven test is recorded in `tests/kane/generated/proven.json`.
- A full disk crashed Chrome, and Kane reported the crashed tests as `failed`. Saboteur now treats browser crashes and timeouts as errors, never as caught bugs, and `doctor` checks free disk space.
- Kane hung for 2 hours after a browser crash, because Saboteur's timeout only stopped the Windows launcher. It now kills the whole process tree, and stops Kane after 10 minutes of silence.
- One generated test failed on the correct shop in a later run (flaky). It was moved to `tests/kane/quarantine/` instead of being kept.

## 6. Launch posts

| Platform | Link | Date |
|---|---|---|
| dev.to | [My tests were green. They caught 0 of 10 real bugs.](https://dev.to/softalpha_0/my-tests-were-green-they-caught-0-of-10-real-bugs-g9h) | 20 Nov 2026 |
| YouTube | [Demo video](https://youtu.be/_3oNNZhODN0) | 20 Nov 2026 |
| X | Launch post (TestMu AI replied) | 19 Nov 2026 |
| LinkedIn | Launch post | 19 Nov 2026 |
