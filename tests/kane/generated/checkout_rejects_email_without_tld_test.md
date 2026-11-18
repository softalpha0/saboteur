---
mode: testing
url: http://localhost:4173
tags: [generated, checkout]
max_steps: 30
---

# Checkout rejects an email with no dot-domain part (buyer@example)

## Add the Canvas Tote
Open the home page and add the Canvas Tote to the cart.
Verify the cart badge in the header shows 1.

## Go to checkout
Open the cart page at /cart and continue to checkout.
Verify the checkout page shows the Full name, Email and Address fields and an order summary Total of $29.99.

## Try to place the order with an email missing its .tld
Fill Full name "Test Buyer", Email "buyer@example" (exactly this, with no dot and nothing after "example"), Address "12 Test Street, Lagos" and press "Place order" once.
Verify the shop's own error message "Enter a valid email address" is shown on the checkout page.

## Confirm no order was placed
Look at the page you are on after trying to place the order.
Verify you are still on the checkout page, the page does not show "Thank you for your order", and no "Order number:" line with an SAB- number appears.
