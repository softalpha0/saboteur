# 05 — Mutation catalog and patch format

A **mutant** is the demo app with exactly one small, realistic bug applied. Each bug is a `git` patch against `apps/shop/`. Patches are written by hand on Wed, after the app is final, so they apply cleanly.

## 1. Rules for a good mutant

1. One behaviour change a real user would notice (wrong number, dead button, wrong page, accepted bad input).
2. Small diff (ideally < 10 lines). No styling-only changes.
3. App still builds and loads. A mutant that breaks the build is **rejected**, not scored.
4. Not "equivalent": it must change something visible in the browser, because Kane only sees what a user sees.

## 2. Files

```
apps/shop/mutations/
  manifest.json
  M01-cart-total-skips-last-item.patch
  M02-qty-plus-noop.patch
  ...
```

`manifest.json`

```json
{
  "version": 1,
  "app": "apps/shop",
  "mutants": [
    {
      "id": "M01",
      "title": "Cart total skips the last item",
      "category": "maths",
      "patch": "M01-cart-total-skips-last-item.patch",
      "userImpact": "Customer is charged less than the items in the cart",
      "where": "src/lib/cart.ts"
    }
  ]
}
```

Create a patch: edit the file on a scratch branch, then `git diff --relative=apps/shop > apps/shop/mutations/M01-....patch`, then reset. Check: `git apply --check --directory=apps/shop apps/shop/mutations/M01-....patch` from a clean tree.

## 3. Demo catalog (10 mutants)

| ID | Bug | Category | Where (planned) | Caught by starter suite? |
|---|---|---|---|---|
| M01 | Cart total skips the last line item | maths | `src/lib/cart.ts` | Fill in after run |
| M02 | "+" quantity button does nothing | interaction | `src/components/QtyStepper.tsx` | Fill in after run |
| M03 | Code `SAVE10` takes 1% off instead of 10% | maths | `src/lib/discount.ts` | Fill in after run |
| M04 | Shipping fee not added on orders under $50 | maths | `src/lib/cart.ts` | Fill in after run |
| M05 | Checkout accepts an email without a domain (`a@`) | validation | `src/lib/validate.ts` | Fill in after run |
| M06 | "Remove" deletes the first item, not the clicked one | state | `src/state/cart.tsx` | Fill in after run |
| M07 | Out-of-stock product can still be added to cart | state | `src/pages/Product.tsx` | Fill in after run |
| M08 | Order confirmation shows a blank order number | display | `src/pages/OrderConfirmed.tsx` | Fill in after run |
| M09 | Login redirects to Home instead of Account | navigation | `src/pages/Login.tsx` | Fill in after run |
| M10 | Cart empties on page refresh (state not saved) | persistence | `src/state/cart.tsx` | Fill in after run |

The starter suite (`tests/kane/starter/`) only checks happy paths: browse + add to cart, cart shows the item, checkout with valid details reaches confirmation, login works. That is intentional. It's what most "the agent wrote me some tests" suites look like.

**Never** fill the last column from a guess. It comes from `report.json`.

## 4. How `attack` applies a mutant

1. Copy `apps/shop` to `.saboteur/work/<mutant-id>/` (fresh each time; never touch the real source).
2. `git apply --directory=… <patch>` inside the copy. Failure → mutant rejected.
3. Build: `pnpm vite build` in the copy. Failure → mutant rejected.
4. Serve: `pnpm vite preview --port 4173 --strictPort` in the copy. Wait until `GET http://localhost:4173/` returns 200.
5. Run the suite (see `03-KANE-INTEGRATION.md` §2).
6. Stop the server, delete the copy.

Port 4173 is fixed because the `_test.md` files have `url: http://localhost:4173` in frontmatter. Mutants run one at a time.

## 5. AI mutants (Should, S4)

`saboteur mutate --ai --count 5` asks Claude for new bug patches for the configured app. A proposed patch is kept only if it applies, builds, and changes what the page shows. The visible-change check is one short `kane-cli run "<objective ending in a check of the expected broken behaviour>" --agent --headless --url http://localhost:4173` against the served mutant: `run_end.status: "passed"` means Kane saw the bug. (Kane also has `run --analyzer-only --condition …` for checking the current page, but it works on the browser's current page, so test it before relying on it.) Kept patches are written to `mutations/ai/` and added to the manifest with `"source": "ai"`.
