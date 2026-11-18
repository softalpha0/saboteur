---
mode: testing
url: http://localhost:4173
tags: [generated, cart]
max_steps: 30
---

# Pressing Add to cart on the out-of-stock Wool Beanie leaves the cart unchanged

## Add the Canvas Tote
Open the home page and add the Canvas Tote to the cart.
Verify the cart badge in the header shows 1.

## Open the Wool Beanie product page
Open the product page at /product/wool-beanie.
Verify the page shows the product name "Wool Beanie", the price $19.00, and a stock status saying it is out of stock.

## Attempt to add the Wool Beanie
On the Wool Beanie product page, try to press the "Add to cart" button once, even if it looks unavailable. If the page blocks the press because the button is disabled, leave it and move on.
Verify the cart badge in the header still shows exactly 1, not 2.

## Check the cart contents
Open the cart page at /cart.
Verify the cart lists only "Canvas Tote", no "Wool Beanie" line item is listed anywhere, the Subtotal shows exactly $24.99 (not $43.99), and the Total shows exactly $29.99.
