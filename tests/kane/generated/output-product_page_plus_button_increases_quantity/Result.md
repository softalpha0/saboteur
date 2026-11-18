---
test: ../product_page_plus_button_increases_quantity_test.md
status: passed
started: 2026-11-18T14:00:43.149Z
duration_s: 191
session_id: abb66647-908b-4107-891a-1b6ff9974c36
---

# The + button on the product page increases the quantity added to the cart — Result

## Open the Canvas Tote product page ✓ passed (56s)
md5: cfc42e280b49cfe32a305a3341c37738
Open the product page at /product/canvas-tote.
Verify the page shows the product name "Canvas Tote", the price $24.99, and the quantity stepper shows 1.

## Increase the quantity with the + button ✓ passed (42s)
md5: dcc824bcf85f4e479ac4cd706378bd1b
On the Canvas Tote product page, press the "+" (increase quantity) button once. Use only the + button and do not type into the quantity number field.
Verify the quantity stepper now shows exactly 2, not 1.

## Add to cart and check the cart ✓ passed (61s)
md5: 28e51f1c5e6faad12c96c7dc446d8b6c
Add the Canvas Tote to the cart from this product page, then open the cart page at /cart.
Verify the cart lists "Canvas Tote" with quantity 2, the Subtotal shows $49.98 (not $24.99), Shipping shows $5.00, and the Total shows $54.98 (not $29.99).
