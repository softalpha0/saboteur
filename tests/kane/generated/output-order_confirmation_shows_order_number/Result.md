---
test: ../order_confirmation_shows_order_number_test.md
status: passed
started: 2026-11-18T12:19:49.245Z
duration_s: 244
session_id: 1d262bae-8f62-43ab-a800-963117809dca
---

# Order confirmation shows a real order number — Result

## Add the Linen Apron ✓ passed (49s)
md5: 7d32ab18142e1bdb0f747938748c8c71
Open the home page and add the Linen Apron to the cart.
Verify the cart badge in the header shows 1.

## Go to checkout ✓ passed (54.4s)
md5: 98233ca97549cd1585610d36df92cea0
Open the cart page at /cart and continue to checkout.
Verify the checkout page shows the Full name, Email and Address fields.

## Place the order ✓ passed (58.6s)
md5: ccd2cf8810dd18e5856516233d02c2ba
Fill Full name "Test Buyer", Email "buyer@example.com", Address "12 Test Street, Lagos" and place the order.
Verify the page shows "Thank you for your order".

## Check the order number ✓ passed (49.5s)
md5: f14090f8b3faf43a2e25900e88fe7f59
On the order confirmation page, read the line that starts with "Order number:".
Verify the order number is not blank: the text after "Order number:" starts with "SAB-" followed by exactly 6 digits (for example SAB-123456).
