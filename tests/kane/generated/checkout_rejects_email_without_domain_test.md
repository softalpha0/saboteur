---
mode: testing
url: http://localhost:4173
tags: [generated, checkout]
max_steps: 30
---

# Checkout rejects an email without a domain

## Add the Canvas Tote
Open the home page and add the Canvas Tote to the cart.
Verify the cart badge in the header shows 1.

## Go to checkout
Open the cart page at /cart and continue to checkout.
Verify the checkout page shows the Full name, Email and Address fields.

## Try to place the order with an email missing its domain
Fill Full name "Test Buyer", Email "a@", Address "12 Test Street, Lagos" and try to place the order.
Verify the message "Enter a valid email address" is shown, the page does not show "Thank you for your order", and no "Order number:" line appears.
