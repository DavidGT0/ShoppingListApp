/* global describe, test, expect */
import { buildListShareText } from '../src/services/shareText';

describe('buildListShareText', () => {
  test('builds the name and a bullet per item, with amount when above 1', () => {
    const text = buildListShareText('סופר', [
      { name: 'חלב', amount: 1, purchased: false },
      { name: 'לחם', amount: 3, purchased: false },
    ]);
    expect(text).toBe('🛒 סופר\n• חלב\n• לחם ×3');
  });

  test('excludes purchased items', () => {
    const text = buildListShareText('סופר', [
      { name: 'חלב', amount: 1, purchased: true },
      { name: 'לחם', amount: 2, purchased: false },
    ]);
    expect(text).toBe('🛒 סופר\n• לחם ×2');
  });

  test('returns null when nothing is left to send', () => {
    expect(buildListShareText('סופר', [])).toBeNull();
    expect(
      buildListShareText('סופר', [{ name: 'חלב', amount: 1, purchased: true }]),
    ).toBeNull();
    expect(buildListShareText('סופר', null)).toBeNull();
  });
});
