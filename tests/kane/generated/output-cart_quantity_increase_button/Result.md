---
test: ../cart_quantity_increase_button_test.md
status: passed
started: 2026-11-18T12:31:27.876Z
duration_s: 168
session_id: 274b74ac-8819-488d-8b51-96dbd2851df3
---

# Increasing quantity with the + button updates the cart — Result

## Add the Canvas Tote ✓ passed (40.2s)
md5: ffa88488fdece293080260b903894c2a
Open the home page and add the Canvas Tote to the cart.
Verify the cart badge in the header shows 1.

## Open the cart ✓ passed (54.6s)
md5: 118c9806f006a0b961d186e016af87cb
Open the cart page at /cart.
Verify the cart lists "Canvas Tote" with quantity 1, the Subtotal shows $24.99 and the Total shows $29.99.

## Increase the quantity with the + button ✓ passed (40.3s)
md5: 12737f152a55709479ede13a2d3de17c
On the cart page, press the "+" (increase quantity) button for the Canvas Tote once.
Verify the Canvas Tote quantity shows 2, the Subtotal shows $49.98, Shipping shows $5.00, and the Total shows $54.98.
