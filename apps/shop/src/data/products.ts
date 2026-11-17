export type Product = {
  slug: string;
  name: string;
  priceCents: number;
  inStock: boolean;
  blurb: string;
};

export const PRODUCTS: Product[] = [
  { slug: 'canvas-tote', name: 'Canvas Tote', priceCents: 2499, inStock: true, blurb: 'A sturdy everyday bag.' },
  { slug: 'ceramic-mug', name: 'Ceramic Mug', priceCents: 1450, inStock: true, blurb: 'Holds a generous coffee.' },
  { slug: 'linen-apron', name: 'Linen Apron', priceCents: 3499, inStock: true, blurb: 'For serious cooking.' },
  { slug: 'wool-beanie', name: 'Wool Beanie', priceCents: 1900, inStock: false, blurb: 'Warm and soft.' },
  { slug: 'desk-plant', name: 'Desk Plant', priceCents: 2999, inStock: true, blurb: 'Hard to kill.' },
];

export function findProduct(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}
