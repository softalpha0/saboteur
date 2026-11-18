---
test: ../save10_discount_ten_percent_test.md
status: passed
started: 2026-11-18T12:13:25.529Z
duration_s: 215
session_id: 6aed6906-9c25-49e7-afef-b5515fcd131c
---

# SAVE10 takes 10% off the subtotal — Result

## Add the Canvas Tote ✓ passed (46.1s)
md5: ffa88488fdece293080260b903894c2a
Open the home page and add the Canvas Tote to the cart.
Verify the cart badge in the header shows 1.

## Add the Linen Apron ✓ passed (34.2s)
md5: dfb0c4b586f280fc1e757d237dbe0607
From the home page, add the Linen Apron to the cart.
Verify the cart badge in the header shows 2.

## Check the cart before the discount ✓ passed (65s)
md5: 02998b8fe5b1612f5db09cb90de73c3c
Open the cart page at /cart.
Verify the cart lists both "Canvas Tote" and "Linen Apron", the Subtotal shows $59.98 and the Total shows $59.98.

## Apply the SAVE10 code ✓ passed (46.5s)
md5: b9b496f60fa3892dd3e9142776c9e969
On the cart page, enter the discount code SAVE10 and apply it.
Verify the Discount shows −$6.00, Shipping shows Free, and the Total shows $53.98.
