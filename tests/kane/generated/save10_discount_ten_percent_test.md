---
mode: testing
url: http://localhost:4173
tags: [generated, discount]
max_steps: 30
---

# SAVE10 takes 10% off the subtotal

## Add the Canvas Tote
Open the home page and add the Canvas Tote to the cart.
Verify the cart badge in the header shows 1.

## Add the Linen Apron
From the home page, add the Linen Apron to the cart.
Verify the cart badge in the header shows 2.

## Check the cart before the discount
Open the cart page at /cart.
Verify the cart lists both "Canvas Tote" and "Linen Apron", the Subtotal shows $59.98 and the Total shows $59.98.

## Apply the SAVE10 code
On the cart page, enter the discount code SAVE10 and apply it.
Verify the Discount shows −$6.00, Shipping shows Free, and the Total shows $53.98.
