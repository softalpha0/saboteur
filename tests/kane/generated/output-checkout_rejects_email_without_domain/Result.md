---
test: ../checkout_rejects_email_without_domain_test.md
status: passed
started: 2026-11-18T12:45:05.327Z
duration_s: 190
session_id: b2b38c76-d09e-4d90-94b0-32f23aeaa3ca
---

# Checkout rejects an email without a domain — Result

## Add the Canvas Tote ✓ passed (55.6s)
md5: ffa88488fdece293080260b903894c2a
Open the home page and add the Canvas Tote to the cart.
Verify the cart badge in the header shows 1.

## Go to checkout ✓ passed (47.9s)
md5: 98233ca97549cd1585610d36df92cea0
Open the cart page at /cart and continue to checkout.
Verify the checkout page shows the Full name, Email and Address fields.

## Try to place the order with an email missing its domain ✓ passed (52.7s)
md5: 2d36d5e74c47c6cea68e141f02e62a1a
Fill Full name "Test Buyer", Email "a@", Address "12 Test Street, Lagos" and try to place the order.
Verify the message "Enter a valid email address" is shown, the page does not show "Thank you for your order", and no "Order number:" line appears.
