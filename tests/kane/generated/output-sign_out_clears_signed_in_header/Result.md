---
test: ../sign_out_clears_signed_in_header_test.md
status: passed
started: 2026-11-19T05:34:50.271Z
duration_s: 214
session_id: 4d4e11f2-a69a-45bd-bcf6-5b65005a4199
---

# Signing out removes "Signed in as" from the header — Result

## Sign in with the test account ✓ passed (73.2s)
md5: ea8aadb3b48453aa1599388e15b3f1ba
Open the Sign in page at /login and sign in with email "demo@saboteur.shop" and password "sabotage123".
Verify the page shows the heading "My account" and the header shows "Signed in as demo@saboteur.shop".

## Sign out from the account page ✓ passed (39.9s)
md5: 7959d179966d70089169541662d59ad7
On the My account page, press "Sign out" once. Do not reload or refresh the page afterwards.
Verify the header no longer shows "Signed in as demo@saboteur.shop" and instead shows a "Sign in" link.

## Check the header on the home page ✓ passed (46s)
md5: ace54362f04ae8e23fdba32a9a122e5b
Open the home page at / using the shop's own header link (shop name), without reloading the browser.
Verify the header shows a "Sign in" link and does not show "Signed in as demo@saboteur.shop" anywhere on the page.
