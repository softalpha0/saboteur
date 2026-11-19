---
test: ../cart_badge_counts_total_quantity_test.md
status: passed
started: 2026-11-19T04:44:38.016Z
duration_s: 197
session_id: 1c1a56fd-a6be-4a3c-957f-494576115051
---

# Cart badge counts total quantity, not distinct products — Result

## Add the Canvas Tote ✓ passed (43.9s)
md5: ffa88488fdece293080260b903894c2a
Open the home page and add the Canvas Tote to the cart.
Verify the cart badge in the header shows 1.

## Add the Canvas Tote again ✓ passed (38.2s)
md5: 5f1dbe7c45c55e297b294cef4d043c93
From the home page, add the Canvas Tote to the cart a second time.
Verify the cart badge in the header shows 2.

## Check the cart quantity ✓ passed (52.7s)
md5: 56e76e320fcc72bebad0429aaaf0f8ee
Open the cart page at /cart.
Verify the cart lists "Canvas Tote" with quantity 2, the Subtotal shows $49.98 and the Total shows $54.98.

## Check the header badge on the home page ✓ passed (27.8s)
md5: 327e4e3e0afe10ed7c02eb9ca6badfe1
Open the home page at /.
Verify the cart badge in the header shows exactly 2, not 1.
