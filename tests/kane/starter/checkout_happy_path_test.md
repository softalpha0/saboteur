---
mode: testing
url: http://localhost:4173
tags: [starter, checkout]
max_steps: 40
---

# Checkout happy path

## Add the apron
Open the home page and add the Linen Apron to the cart.
Verify the cart badge in the header shows 1.

## Go to checkout
Open the cart and continue to checkout.
Verify the checkout page shows the Full name, Email and Address fields.

## Place the order
Fill Full name "Test Buyer", Email {{smart.random_email}}, Address "12 Test Street, Lagos" and place the order.
Verify the page shows "Thank you for your order".
