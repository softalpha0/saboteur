---
mode: testing
url: http://localhost:4173
tags: [generated, cart]
max_steps: 30
---

# A single Ceramic Mug order under $50 is charged $5.00 shipping

## Add the Ceramic Mug
Open the home page and add the Ceramic Mug to the cart.
Verify the cart badge in the header shows 1.

## Open the cart
Open the cart page at /cart.
Verify the cart lists "Ceramic Mug" with quantity 1 and the Subtotal shows $14.50.

## Check the shipping fee and total
On the cart page, read the Shipping row and the Total row in the cart summary.
Verify the Shipping row shows exactly $5.00 (not "Free", not $0.00 and not blank), and the Total shows exactly $19.50, which is different from the Subtotal of $14.50.
