---
test: ../cart_remove_middle_item_deletes_clicked_item_test.md
status: passed
started: 2026-11-18T14:18:05.261Z
duration_s: 226
session_id: daf7e29d-84e9-4122-9993-2e945d158430
---

# Removing the middle item of three deletes only the clicked item — Result

## Add the Canvas Tote ✓ passed (44.7s)
md5: ffa88488fdece293080260b903894c2a
Open the home page and add the Canvas Tote to the cart.
Verify the cart badge in the header shows 1.

## Add the Ceramic Mug ✓ passed (31s)
md5: bc62fec656af9a5b92da349e3cf75931
From the home page, add the Ceramic Mug to the cart.
Verify the cart badge in the header shows 2.

## Add the Linen Apron ✓ passed (32.6s)
md5: fd9063d0fc2ca7ed10321fe361f04729
From the home page, add the Linen Apron to the cart.
Verify the cart badge in the header shows 3.

## Open the cart ✓ passed (47.2s)
md5: b719cc3e00a1c74e4affab921ada94d7
Open the cart page at /cart.
Verify the cart lists "Canvas Tote", "Ceramic Mug" and "Linen Apron", and the Subtotal shows $74.48.

## Remove the Ceramic Mug ✓ passed (50.5s)
md5: 3b69aaefff00f0e352d0f2f426386a46
On the cart page, remove only the Ceramic Mug line item. Use the "Remove" on the Ceramic Mug row, not on the Canvas Tote or Linen Apron rows.
Verify the cart still lists both "Canvas Tote" and "Linen Apron", "Ceramic Mug" is no longer listed, the Subtotal shows $59.98, Shipping shows Free, and the Total shows $59.98.
