---
mode: testing
url: http://localhost:4173
tags: [generated, cart]
max_steps: 30
---

# Remove deletes the clicked item, not the first one

## Add the Canvas Tote
Open the home page and add the Canvas Tote to the cart.
Verify the cart badge in the header shows 1.

## Add the Ceramic Mug
From the home page, add the Ceramic Mug to the cart.
Verify the cart badge in the header shows 2.

## Open the cart
Open the cart page at /cart.
Verify the cart lists both "Canvas Tote" and "Ceramic Mug", and the Subtotal shows $39.49.

## Remove the Ceramic Mug
On the cart page, remove the Ceramic Mug line item (use the "Remove" on the Ceramic Mug row, not the Canvas Tote row).
Verify the cart still lists "Canvas Tote", "Ceramic Mug" is no longer listed, the Subtotal shows $24.99 (not $14.50), and the Total shows $29.99.
