---
test: ../save10_drops_below_free_shipping_threshold_test.md
status: passed
started: 2026-11-19T05:08:50.441Z
duration_s: 198
session_id: 48f15fde-4302-479a-94e2-e4dbe5a77448
---

# SAVE10 that drops the order below $50 brings back the $5.00 shipping fee — Result

## Add the Canvas Tote ✓ passed (37.1s)
md5: ffa88488fdece293080260b903894c2a
Open the home page and add the Canvas Tote to the cart.
Verify the cart badge in the header shows 1.

## Add the Desk Plant ✓ passed (30.2s)
md5: ca50f932ec9bbe07096da380acd44c4d
From the home page, add the Desk Plant to the cart.
Verify the cart badge in the header shows 2.

## Check the cart before the discount ✓ passed (43.8s)
md5: 731752325525e8f2e78ea7b1e927443b
Open the cart page at /cart.
Verify the cart lists both "Canvas Tote" and "Desk Plant", the Subtotal shows $54.98, Shipping shows Free, and the Total shows $54.98.

## Apply SAVE10 and check shipping ✓ passed (38.5s)
md5: ca6caad92325b228637b93e76ee207ce
On the cart page, enter the discount code SAVE10 and apply it.
Verify the Discount shows −$5.50, the Shipping row shows exactly $5.00 (not "Free"), and the Total shows exactly $54.48 (not $49.48).
