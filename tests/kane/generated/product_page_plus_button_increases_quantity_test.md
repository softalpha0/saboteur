---
mode: testing
url: http://localhost:4173
tags: [generated, cart]
max_steps: 30
---

# The + button on the product page increases the quantity added to the cart

## Open the Canvas Tote product page
Open the product page at /product/canvas-tote.
Verify the page shows the product name "Canvas Tote", the price $24.99, and the quantity stepper shows 1.

## Increase the quantity with the + button
On the Canvas Tote product page, press the "+" (increase quantity) button once. Use only the + button and do not type into the quantity number field.
Verify the quantity stepper now shows exactly 2, not 1.

## Add to cart and check the cart
Add the Canvas Tote to the cart from this product page, then open the cart page at /cart.
Verify the cart lists "Canvas Tote" with quantity 2, the Subtotal shows $49.98 (not $24.99), Shipping shows $5.00, and the Total shows $54.98 (not $29.99).
