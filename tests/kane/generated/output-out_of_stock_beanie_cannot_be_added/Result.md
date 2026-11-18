---
test: ../out_of_stock_beanie_cannot_be_added_test.md
status: passed
started: 2026-11-18T12:57:12.905Z
duration_s: 225
session_id: d09be957-ce2c-4aaa-b0ae-8d44a3828379
---

# Out-of-stock Wool Beanie cannot be added to the cart — Result

## Open the Wool Beanie product page ✓ passed (55.5s)
md5: f2aba697a966cfab9a41d553d7d641a3
Open the product page at /product/wool-beanie.
Verify the page shows the product name "Wool Beanie", the price $19.00, and a stock status saying it is out of stock.

## Check the Add to cart button is unavailable ✓ passed (27.9s)
md5: 580c930807fb315f90d6db3308129243
On the Wool Beanie product page, look at the "Add to cart" button.
Verify the "Add to cart" button is disabled and cannot be clicked.

## Try to add the Wool Beanie anyway ✓ passed (58.5s)
md5: eb528939a6925894e5e54509f831f450
On the Wool Beanie product page, if the "Add to cart" button is enabled, click it once. If it is disabled, do not click anything.
Verify the cart badge in the header does not show 1. It shows 0 or no item count.

## Confirm the cart is still empty ✓ passed (45.9s)
md5: e8d3f95e27ed79562ecd587b2987b757
Open the cart page at /cart.
Verify the page shows "Your cart is empty" and no "Wool Beanie" line item is listed.
