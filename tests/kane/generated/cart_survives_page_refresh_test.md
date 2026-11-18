---
mode: testing
url: http://localhost:4173
tags: [generated, cart]
max_steps: 30
---

# Cart contents survive a page refresh

## Add the Canvas Tote
Open the home page and add the Canvas Tote to the cart.
Verify the cart badge in the header shows 1.

## Open the cart
Open the cart page at /cart.
Verify the cart lists "Canvas Tote" with quantity 1, the Subtotal shows $24.99 and the Total shows $29.99.

## Reload the cart page
Reload the current page in the browser (a full page refresh of /cart). Do not add any products again.
Verify the cart still lists "Canvas Tote" with quantity 1, the page does not show "Your cart is empty", the Subtotal shows $24.99, and the Total shows $29.99.
