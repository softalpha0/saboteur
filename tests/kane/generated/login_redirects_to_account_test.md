---
mode: testing
url: http://localhost:4173
tags: [generated, auth]
max_steps: 30
---

# Signing in takes the customer to the My account page

## Open the Sign in page
Open the Sign in page at /login.
Verify the page shows the Email and Password fields and a "Sign in" button.

## Sign in and check where you land
Sign in with email "demo@saboteur.shop" and password "sabotage123". Do not navigate anywhere yourself after submitting. Stay on whatever page the shop takes you to.
Verify the page you land on right after signing in shows the heading "My account", the text "Signed in as demo@saboteur.shop", and a "Sign out" button. It must not be the home page product grid.
