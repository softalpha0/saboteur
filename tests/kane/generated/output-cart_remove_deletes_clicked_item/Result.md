---
test: ../cart_remove_deletes_clicked_item_test.md
status: passed
started: 2026-11-18T12:50:38.391Z
duration_s: 186
session_id: 8dd64b96-2de8-449a-aa24-f77f46be3bfd
---

# Remove deletes the clicked item, not the first one — Result

## Add the Canvas Tote ✓ passed (47.7s)
md5: ffa88488fdece293080260b903894c2a
Open the home page and add the Canvas Tote to the cart.
Verify the cart badge in the header shows 1.

## Add the Ceramic Mug ✓ passed (34.3s)
md5: bc62fec656af9a5b92da349e3cf75931
From the home page, add the Ceramic Mug to the cart.
Verify the cart badge in the header shows 2.

## Open the cart ✓ passed (40.5s)
md5: ac1a564b7833c321374b118566cc8469
Open the cart page at /cart.
Verify the cart lists both "Canvas Tote" and "Ceramic Mug", and the Subtotal shows $39.49.

## Remove the Ceramic Mug ✓ passed (39.6s)
md5: 0a2f6f2559fed3023a68dd5828d0e36f
On the cart page, remove the Ceramic Mug line item (use the "Remove" on the Ceramic Mug row, not the Canvas Tote row).
Verify the cart still lists "Canvas Tote", "Ceramic Mug" is no longer listed, the Subtotal shows $24.99 (not $14.50), and the Total shows $29.99.
