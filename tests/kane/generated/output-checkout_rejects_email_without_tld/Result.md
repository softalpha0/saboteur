---
test: ../checkout_rejects_email_without_tld_test.md
status: passed
started: 2026-11-18T14:12:29.697Z
duration_s: 213
session_id: 6ca7ddcd-6624-422a-b8eb-a929df2c8a5c
---

# Checkout rejects an email with no dot-domain part (buyer@example) — Result

## Add the Canvas Tote ✓ passed (46.8s)
md5: ffa88488fdece293080260b903894c2a
Open the home page and add the Canvas Tote to the cart.
Verify the cart badge in the header shows 1.

## Go to checkout ✓ passed (52.6s)
md5: d9c7c5559a3e04c80d2743165387af49
Open the cart page at /cart and continue to checkout.
Verify the checkout page shows the Full name, Email and Address fields and an order summary Total of $29.99.

## Try to place the order with an email missing its .tld ✓ passed (56.7s)
md5: 80622c1618f8e1e7b0b271da539f036d
Fill Full name "Test Buyer", Email "buyer@example" (exactly this, with no dot and nothing after "example"), Address "12 Test Street, Lagos" and press "Place order" once.
Verify the shop's own error message "Enter a valid email address" is shown on the checkout page.

## Confirm no order was placed ✓ passed (32.9s)
md5: 94356c9e123bf54e6891c6aa0e95c4d6
Look at the page you are on after trying to place the order.
Verify you are still on the checkout page, the page does not show "Thank you for your order", and no "Order number:" line with an SAB- number appears.
