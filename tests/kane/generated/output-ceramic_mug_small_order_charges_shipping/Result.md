---
test: ../ceramic_mug_small_order_charges_shipping_test.md
status: passed
started: 2026-11-18T14:07:31.500Z
duration_s: 150
session_id: 9a15fed3-19ff-401e-aba9-b723c6fabe03
---

# A single Ceramic Mug order under $50 is charged $5.00 shipping — Result

## Add the Ceramic Mug ✓ passed (44.8s)
md5: d1f5f51ae6bc4838916da17878b90524
Open the home page and add the Ceramic Mug to the cart.
Verify the cart badge in the header shows 1.

## Open the cart ✓ passed (42.2s)
md5: 287cb5904c228348c131fd615fee763e
Open the cart page at /cart.
Verify the cart lists "Ceramic Mug" with quantity 1 and the Subtotal shows $14.50.

## Check the shipping fee and total ✓ passed (40.1s)
md5: ccb69f72a44e457113e145bc80030389
On the cart page, read the Shipping row and the Total row in the cart summary.
Verify the Shipping row shows exactly $5.00 (not "Free", not $0.00 and not blank), and the Total shows exactly $19.50, which is different from the Subtotal of $14.50.
