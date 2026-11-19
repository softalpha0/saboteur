---
mode: testing
url: http://localhost:4173
tags: [generated, discount]
max_steps: 30
---

# SAVE10 that drops the order below $50 brings back the $5.00 shipping fee

## Add the Canvas Tote
Open the home page and add the Canvas Tote to the cart.
Verify the cart badge in the header shows 1.

## Add the Desk Plant
From the home page, add the Desk Plant to the cart.
Verify the cart badge in the header shows 2.

## Check the cart before the discount
Open the cart page at /cart.
Verify the cart lists both "Canvas Tote" and "Desk Plant", the Subtotal shows $54.98, Shipping shows Free, and the Total shows $54.98.

## Apply SAVE10 and check shipping
On the cart page, enter the discount code SAVE10 and apply it.
Verify the Discount shows −$5.50, the Shipping row shows exactly $5.00 (not "Free"), and the Total shows exactly $54.48 (not $49.48).
