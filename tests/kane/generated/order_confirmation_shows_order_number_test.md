---
mode: testing
url: http://localhost:4173
tags: [generated, checkout]
max_steps: 30
---

# Order confirmation shows a real order number

## Add the Linen Apron
Open the home page and add the Linen Apron to the cart.
Verify the cart badge in the header shows 1.

## Go to checkout
Open the cart page at /cart and continue to checkout.
Verify the checkout page shows the Full name, Email and Address fields.

## Place the order
Fill Full name "Test Buyer", Email "buyer@example.com", Address "12 Test Street, Lagos" and place the order.
Verify the page shows "Thank you for your order".

## Check the order number
On the order confirmation page, read the line that starts with "Order number:".
Verify the order number is not blank: the text after "Order number:" starts with "SAB-" followed by exactly 6 digits (for example SAB-123456).
