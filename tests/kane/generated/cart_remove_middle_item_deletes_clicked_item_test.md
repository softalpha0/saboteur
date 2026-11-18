---
mode: testing
url: http://localhost:4173
tags: [generated, cart]
max_steps: 30
---

# Removing the middle item of three deletes only the clicked item

## Add the Canvas Tote
Open the home page and add the Canvas Tote to the cart.
Verify the cart badge in the header shows 1.

## Add the Ceramic Mug
From the home page, add the Ceramic Mug to the cart.
Verify the cart badge in the header shows 2.

## Add the Linen Apron
From the home page, add the Linen Apron to the cart.
Verify the cart badge in the header shows 3.

## Open the cart
Open the cart page at /cart.
Verify the cart lists "Canvas Tote", "Ceramic Mug" and "Linen Apron", and the Subtotal shows $74.48.

## Remove the Ceramic Mug
On the cart page, remove only the Ceramic Mug line item. Use the "Remove" on the Ceramic Mug row, not on the Canvas Tote or Linen Apron rows.
Verify the cart still lists both "Canvas Tote" and "Linen Apron", "Ceramic Mug" is no longer listed, the Subtotal shows $59.98, Shipping shows Free, and the Total shows $59.98.
