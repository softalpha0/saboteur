---
test: ../cart_total_includes_every_item_test.md
status: passed
started: 2026-11-18T12:07:24.119Z
duration_s: 204
session_id: bb8755eb-1679-4506-b88a-7a0b6abbedda
---

# Cart total includes every line item — Result

## Add the Canvas Tote ✓ passed (76.5s)
md5: ffa88488fdece293080260b903894c2a
Open the home page and add the Canvas Tote to the cart.
Verify the cart badge in the header shows 1.

## Add the Ceramic Mug ✓ passed (36.1s)
md5: bc62fec656af9a5b92da349e3cf75931
From the home page, add the Ceramic Mug to the cart.
Verify the cart badge in the header shows 2.

## Check the cart totals ✓ passed (56.8s)
md5: 7c76f439292505889bf588708b10c394
Open the cart page at /cart.
Verify the cart lists both "Canvas Tote" and "Ceramic Mug", the Subtotal shows $39.49, Shipping shows $5.00, and the Total shows $44.49.
