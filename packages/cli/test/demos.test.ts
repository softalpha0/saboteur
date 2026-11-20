import { describe, expect, it } from 'vitest';
import { notFoundPage, renderSwitcher } from '../src/demos.ts';

describe('live demo pages', () => {
  it('lists the clean build first, then each bug with its patch, escaped', () => {
    const html = renderSwitcher('Shop', [
      { id: 'clean', title: 'The correct app', impact: 'No bug' },
      { id: 'M01', title: 'Total <wrong>', impact: 'Charged less', diff: '-a\n+b' },
    ]);
    expect(html).toContain('href="clean/"');
    expect(html).toContain('href="M01/"');
    expect(html).toContain('Total &lt;wrong&gt;');
    expect(html.indexOf('clean/')).toBeLessThan(html.indexOf('M01/'));
    expect(html).not.toMatch(/<script/);
  });

  it('404 page sends a deep link back into its demo build', () => {
    expect(notFoundPage).toContain('/demo/');
    expect(notFoundPage).toContain("'?p='");
  });
});
