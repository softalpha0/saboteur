---
test: ../wool_beanie_click_add_does_not_change_cart_test.md
status: failed
started: 2026-11-18T15:00:45.153Z
duration_s: 232
session_id: 40a2b77c-4d3c-41b5-a284-e6d901b31004
---

# Pressing Add to cart on the out-of-stock Wool Beanie leaves the cart unchanged — Result

## Add the Canvas Tote ✗ failed (99s)
md5: ffa88488fdece293080260b903894c2a
Reason: Final verification failed: "the cart badge in the header shows 1" — bug verdict: Cart state was not reset before badge assertion [automation_bug/test_data_issue, confidence 0.96]
Open the home page and add the Canvas Tote to the cart.
Verify the cart badge in the header shows 1.

## Open the Wool Beanie product page ✓ passed (—)
md5: f2aba697a966cfab9a41d553d7d641a3
Open the product page at /product/wool-beanie.
Verify the page shows the product name "Wool Beanie", the price $19.00, and a stock status saying it is out of stock.

## Attempt to add the Wool Beanie ✓ passed (—)
md5: 9555d070d8a10fe55534aef11c6e9b71
On the Wool Beanie product page, try to press the "Add to cart" button once, even if it looks unavailable. If the page blocks the press because the button is disabled, leave it and move on.
Verify the cart badge in the header still shows exactly 1, not 2.

## Check the cart contents ✓ passed (—)
md5: 6dca57101787dc82f70d7277f855bed6
Open the cart page at /cart.
Verify the cart lists only "Canvas Tote", no "Wool Beanie" line item is listed anywhere, the Subtotal shows exactly $24.99 (not $43.99), and the Total shows exactly $29.99.
