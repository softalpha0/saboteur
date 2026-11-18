---
mode: testing
url: http://localhost:4173
tags: [generated, cart]
max_steps: 30
---

# Cart total includes every line item

## Add the Canvas Tote
Open the home page and add the Canvas Tote to the cart.
Verify the cart badge in the header shows 1.

## Add the Ceramic Mug
From the home page, add the Ceramic Mug to the cart.
Verify the cart badge in the header shows 2.

## Check the cart totals
Open the cart page at /cart.
Verify the cart lists both "Canvas Tote" and "Ceramic Mug", the Subtotal shows $39.49, Shipping shows $5.00, and the Total shows $44.49.
