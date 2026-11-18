---
test: ../small_order_total_paid_includes_shipping_test.md
status: passed
started: 2026-11-18T12:37:26.701Z
duration_s: 252
session_id: 8fb728d8-e36c-4e83-bfd9-2202e464f76a
---

# Small order total paid includes the $5.00 shipping fee — Result

## Add the Canvas Tote ✓ passed (38.7s)
md5: ffa88488fdece293080260b903894c2a
Open the home page and add the Canvas Tote to the cart.
Verify the cart badge in the header shows 1.

## Check the cart shipping and total ✓ passed (49.3s)
md5: 755d93556a3a392cb602037df934a78c
Open the cart page at /cart.
Verify the cart lists "Canvas Tote", the Subtotal shows $24.99, Shipping shows $5.00 (not "Free" and not $0.00), and the Total shows $29.99.

## Check the checkout summary ✓ passed (43.8s)
md5: 6dbe07104c90b55acbe3d7f70cfe1901
From the cart, continue to checkout.
Verify the checkout order summary shows a Total of $29.99, not $24.99.

## Place the order and check the amount paid ✓ passed (78.3s)
md5: ea8845877c9d83dd85c8ae2b4ed365b9
Fill Full name "Test Buyer", Email "buyer@example.com", Address "12 Test Street, Lagos" and place the order.
Verify the page shows "Thank you for your order" and the Total paid shows exactly $29.99, not $24.99.
