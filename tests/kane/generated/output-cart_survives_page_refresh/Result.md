---
test: ../cart_survives_page_refresh_test.md
status: passed
started: 2026-11-18T14:39:02.392Z
duration_s: 157
session_id: ba977c4e-97af-4536-9ef6-17cb15dbf475
---

# Cart contents survive a page refresh — Result

## Add the Canvas Tote ✓ passed (35.8s)
md5: ffa88488fdece293080260b903894c2a
Open the home page and add the Canvas Tote to the cart.
Verify the cart badge in the header shows 1.

## Open the cart ✓ passed (45.1s)
md5: 118c9806f006a0b961d186e016af87cb
Open the cart page at /cart.
Verify the cart lists "Canvas Tote" with quantity 1, the Subtotal shows $24.99 and the Total shows $29.99.

## Reload the cart page ✓ passed (47.7s)
md5: 81d777b2b1ff473883341d13d274e69b
Reload the current page in the browser (a full page refresh of /cart). Do not add any products again.
Verify the cart still lists "Canvas Tote" with quantity 1, the page does not show "Your cart is empty", the Subtotal shows $24.99, and the Total shows $29.99.
