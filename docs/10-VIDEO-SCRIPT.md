# 10 — Demo video script (target 4:00, real footage)

Every shot below is a real screen recording, except the 30-second opener (an animated illustration of real
results, labelled as such). Record at 1080p, terminal font 18 to 20 pt, browser zoom 125%, notifications off.

Before recording: close Chrome tabs and heavy apps, `pnpm i`, `pnpm saboteur doctor --replay` all green,
port 4173 free. Pre-run anything slow and record its output; say so in the voice-over ("this takes about
20 minutes, here is the result").

| Time | Show | Say (rough, in your own words) |
|---|---|---|
| 0:00–0:30 | The animated explainer (`saboteur-explainer.mp4`), or skip straight to the terminal | "My coding agent wrote me four Kane CLI tests. All green. I wanted to know if they'd catch a real bug. So I built Saboteur." |
| 0:30–0:50 | `apps/shop` in the browser: add the Canvas Tote and Ceramic Mug, open the cart, total $44.49 | "This is the demo shop. Products, cart, discount code, checkout, login." |
| 0:50–1:10 | `tests/kane/starter/` in the editor, open `cart_shows_item_test.md` | "Here are the four tests. Plain English. Kane CLI runs them in real Chrome." |
| 1:10–1:50 | `pnpm saboteur attack`: the table filling with SLIPPED, ending `0/10 caught` (recorded run, sped up) | "Saboteur plants one bug at a time, a wrong total, a dead plus button, a 1% discount, builds the broken app, and Kane replays the suite with healing off. Every test still passes. Zero out of ten." |
| 1:50–2:10 | `apps/shop/mutations/M03-*.patch` (one line: `SAVE10: 1`) | "Each bug is a real one-line patch. This one makes SAVE10 take 1% instead of 10%." |
| 2:10–2:50 | `pnpm saboteur fill --only M03` (or the recorded output) + `evidence/runs/<id>/fill-M03.md` | "For each miss, Claude writes a new Kane test. Kane runs it twice. On the correct shop it must pass. On the bugged shop it must fail. Only then is it kept." |
| 2:50–3:10 | `kane-cli evidence serve <pack>`: Kane's screenshot of the cart showing the wrong total | "This is Kane's own evidence: the total it saw on the bugged build." |
| 3:10–3:30 | `reports/latest/report.html`: before 0/10, after 10/10, per-bug table | "With Claude's fourteen tests, all ten bugs are caught. Every verdict links to a real Kane run." |
| 3:30–3:50 | `reports/latest-duel/duel.html` (Red 3 : Blue 3) | "Then I let a second Claude attack the suite. It found three more bugs all the tests missed. A blue Claude closed every one, each proven by Kane." |
| 3:50–4:00 | `saboteur.config.json` + repo URL | "Point it at your own app with one config file. Link below." |

## Recording tips

- Sped-up terminal footage is fine; say that it is sped up.
- Keep the real numbers on screen long enough to read (2 to 3 seconds).
- If a run fails on camera, keep it: Saboteur showing an error instead of a fake "caught" is a feature.
- Upload as public or unlisted on YouTube, then open the link in a private window to check it plays.
