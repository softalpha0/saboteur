---
mode: testing
url: http://localhost:4173
tags: [generated, checkout]
max_steps: 30
---

# Small order total paid includes the $5.00 shipping fee

## Add the Canvas Tote
Open the home page and add the Canvas Tote to the cart.
Verify the cart badge in the header shows 1.

## Check the cart shipping and total
Open the cart page at /cart.
Verify the cart lists "Canvas Tote", the Subtotal shows $24.99, Shipping shows $5.00 (not "Free" and not $0.00), and the Total shows $29.99.

## Check the checkout summary
From the cart, continue to checkout.
Verify the checkout order summary shows a Total of $29.99, not $24.99.

## Place the order and check the amount paid
Fill Full name "Test Buyer", Email "buyer@example.com", Address "12 Test Street, Lagos" and place the order.
Verify the page shows "Thank you for your order" and the Total paid shows exactly $29.99, not $24.99.
