---
mode: testing
url: http://localhost:4173
tags: [generated, auth]
max_steps: 30
---

# Signing out removes "Signed in as" from the header

## Sign in with the test account
Open the Sign in page at /login and sign in with email "demo@saboteur.shop" and password "sabotage123".
Verify the page shows the heading "My account" and the header shows "Signed in as demo@saboteur.shop".

## Sign out from the account page
On the My account page, press "Sign out" once. Do not reload or refresh the page afterwards.
Verify the header no longer shows "Signed in as demo@saboteur.shop" and instead shows a "Sign in" link.

## Check the header on the home page
Open the home page at / using the shop's own header link (shop name), without reloading the browser.
Verify the header shows a "Sign in" link and does not show "Signed in as demo@saboteur.shop" anywhere on the page.
