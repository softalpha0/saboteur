---
test: ../login_redirects_to_account_test.md
status: passed
started: 2026-11-18T14:32:09.346Z
duration_s: 166
session_id: c5b968dd-3703-4b12-bf6c-09661e48e302
---

# Signing in takes the customer to the My account page — Result

## Open the Sign in page ✓ passed (50.8s)
md5: d6a0dab24828d9b0520d6071e838782d
Open the Sign in page at /login.
Verify the page shows the Email and Password fields and a "Sign in" button.

## Sign in and check where you land ✓ passed (92.1s)
md5: d933a70a07398e1a093a7b59c2e51a59
Sign in with email "demo@saboteur.shop" and password "sabotage123". Do not navigate anywhere yourself after submitting. Stay on whatever page the shop takes you to.
Verify the page you land on right after signing in shows the heading "My account", the text "Signed in as demo@saboteur.shop", and a "Sign out" button. It must not be the home page product grid.
