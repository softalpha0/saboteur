---
mode: testing
url: http://localhost:4173
tags: [generated, cart]
max_steps: 30
---

# Out-of-stock Wool Beanie cannot be added to the cart

## Open the Wool Beanie product page
Open the product page at /product/wool-beanie.
Verify the page shows the product name "Wool Beanie", the price $19.00, and a stock status saying it is out of stock.

## Check the Add to cart button is unavailable
On the Wool Beanie product page, look at the "Add to cart" button.
Verify the "Add to cart" button is disabled and cannot be clicked.

## Try to add the Wool Beanie anyway
On the Wool Beanie product page, if the "Add to cart" button is enabled, click it once. If it is disabled, do not click anything.
Verify the cart badge in the header does not show 1. It shows 0 or no item count.

## Confirm the cart is still empty
Open the cart page at /cart.
Verify the page shows "Your cart is empty" and no "Wool Beanie" line item is listed.
