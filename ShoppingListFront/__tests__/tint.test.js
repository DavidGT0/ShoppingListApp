/* global describe, test, expect */
import { withAlpha, mixOver, stationTint } from '../src/theme/tint';
import { light, dark } from '../src/theme/palettes';

describe('tint helpers', () => {
  test('withAlpha turns a hex colour into rgba', () => {
    expect(withAlpha('#4CAF50', 0.2)).toBe('rgba(76, 175, 80, 0.2)');
    expect(withAlpha('#fff', 0.35)).toBe('rgba(255, 255, 255, 0.35)');
  });

  test('mixOver blends the colour over a base into a solid hex', () => {
    expect(mixOver('#FFFFFF', 0.5, '#000000')).toBe('#808080');
    expect(mixOver('#4CAF50', 0.35, '#0B1220')).toBe('#224931');
    expect(mixOver('#4CAF50', 0, '#0B1220')).toBe('#0B1220');
    expect(mixOver('#4CAF50', 1, '#0B1220')).toBe('#4CAF50');
  });

  test('a colour that is not hex falls back to null', () => {
    expect(withAlpha('red', 0.2)).toBeNull();
    expect(mixOver(undefined, 0.2, '#000000')).toBeNull();
  });

  test('station tint: 20% over the light background, 35% over the dark one', () => {
    expect(stationTint('#4CAF50', light, false)).toBe(
      mixOver('#4CAF50', 0.2, light.background),
    );
    expect(stationTint('#4CAF50', dark, true)).toBe(
      mixOver('#4CAF50', 0.35, dark.background),
    );
  });

  test('station tint of an unknown colour uses a theme surface', () => {
    expect(stationTint('nope', dark, true)).toBe(dark.surfaceHighlight);
    expect(stationTint(null, light, false)).toBe(light.surfaceHighlight);
  });
});
