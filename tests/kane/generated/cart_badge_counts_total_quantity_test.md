---
mode: testing
url: http://localhost:4173
tags: [generated, cart]
max_steps: 30
---

# Cart badge counts total quantity, not distinct products

## Add the Canvas Tote
Open the home page and add the Canvas Tote to the cart.
Verify the cart badge in the header shows 1.

## Add the Canvas Tote again
From the home page, add the Canvas Tote to the cart a second time.
Verify the cart badge in the header shows 2.

## Check the cart quantity
Open the cart page at /cart.
Verify the cart lists "Canvas Tote" with quantity 2, the Subtotal shows $49.98 and the Total shows $54.98.

## Check the header badge on the home page
Open the home page at /.
Verify the cart badge in the header shows exactly 2, not 1.
