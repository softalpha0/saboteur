---
mode: testing
url: http://localhost:4173
tags: [generated, cart]
max_steps: 30
---

# Increasing quantity with the + button updates the cart

## Add the Canvas Tote
Open the home page and add the Canvas Tote to the cart.
Verify the cart badge in the header shows 1.

## Open the cart
Open the cart page at /cart.
Verify the cart lists "Canvas Tote" with quantity 1, the Subtotal shows $24.99 and the Total shows $29.99.

## Increase the quantity with the + button
On the cart page, press the "+" (increase quantity) button for the Canvas Tote once.
Verify the Canvas Tote quantity shows 2, the Subtotal shows $49.98, Shipping shows $5.00, and the Total shows $54.98.
