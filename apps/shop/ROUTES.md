# Saboteur Shop — routes and facts

This file is the spec for the demo app **and** the "ROUTES AND FACTS" Claude gets when writing tests. If you change the app, change this file in the same commit.

Base URL: `http://localhost:4173` (`vite preview --port 4173 --strictPort`)

## Pages

| Route | Shows |
|---|---|
| `/` | Product grid. Each card: name, price, "Add to cart" button (or "Out of stock" label, button disabled). Header: shop name, cart badge with item count, "Sign in" link or "Signed in as <email>" |
| `/product/:slug` | One product: name, price, stock status, quantity stepper (− / number / +), "Add to cart" |
| `/cart` | Line items (name, unit price, quantity stepper, line total, "Remove"), discount code box + "Apply", Subtotal, Discount, Shipping, **Total**, "Checkout" button. Empty cart text: "Your cart is empty" |
| `/checkout` | Fields: Full name, Email, Address. "Place order" button. Order summary with Total |
| `/order/:id` | "Thank you for your order", "Order number: SAB-123456" (SAB- + 6 digits), items and Total paid |
| `/login` | Email, Password, "Sign in" button. Wrong details: "Email or password is incorrect" |
| `/account` | Heading "My account", "Signed in as <email>", "Sign out" |

## Products

| Slug | Name | Price | Stock |
|---|---|---|---|
| `canvas-tote` | Canvas Tote | $24.99 | In stock |
| `ceramic-mug` | Ceramic Mug | $14.50 | In stock |
| `linen-apron` | Linen Apron | $34.99 | In stock |
| `wool-beanie` | Wool Beanie | $19.00 | **Out of stock** |
| `desk-plant` | Desk Plant | $29.99 | In stock |

## Rules

1. **Shipping:** $5.00 when subtotal (after discount) is under $50.00, otherwise free ("Free").
2. **Discount:** code `SAVE10` = 10% off the subtotal, rounded to the cent (half up). Any other code: "Code not recognised".
3. **Total** = subtotal − discount + shipping.
4. **Email validation (checkout):** must look like `name@domain.tld`. Otherwise show "Enter a valid email address" and don't place the order.
5. **Cart persistence:** cart is saved in `localStorage` and survives a page refresh.
6. **Login:** test account `demo@saboteur.shop` / `sabotage123`. After sign-in, go to `/account`.
7. **Quantity:** stepper min 1, max 9.

## Worked examples (correct shop)

| Cart | Subtotal | Discount | Shipping | Total |
|---|---|---|---|---|
| 1 × Canvas Tote | $24.99 | — | $5.00 | $29.99 |
| 1 × Canvas Tote + 1 × Ceramic Mug | $39.49 | — | $5.00 | $44.49 |
| 1 × Canvas Tote + 1 × Linen Apron | $59.98 | — | Free | $59.98 |
| 1 × Canvas Tote + 1 × Linen Apron, `SAVE10` | $59.98 | −$6.00 | Free | $53.98 |
| 2 × Canvas Tote | $49.98 | — | $5.00 | $54.98 |

Check these by hand in the browser before writing any mutant.
