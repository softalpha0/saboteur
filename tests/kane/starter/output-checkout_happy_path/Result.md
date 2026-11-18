---
test: ../checkout_happy_path_test.md
status: passed
started: 2026-11-18T01:20:37.120Z
duration_s: 169
session_id: 1637b277-1558-4336-98e6-747922ce17be
---

# Checkout happy path — Result

## Add the apron ✓ passed (44s)
md5: 5e83b4ab5450cdc919062b45e806cf51
Open the home page and add the Linen Apron to the cart.
Verify the cart badge in the header shows 1.

## Go to checkout ✓ passed (44.7s)
md5: fc525c35e54b94fc60c8c57bf1f9b2b9
Open the cart and continue to checkout.
Verify the checkout page shows the Full name, Email and Address fields.

## Place the order ✓ passed (53.6s)
md5: 2ae4a558f947c8478c7142162ad70d61
Fill Full name "Test Buyer", Email {{smart.random_email}}, Address "12 Test Street, Lagos" and place the order.
Verify the page shows "Thank you for your order".
