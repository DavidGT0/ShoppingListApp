/* global describe, test, expect */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const glyphs = require('react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json');

const walk = dir =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith('.js') ? [full] : [];
  });

const EXPECTED = [
  'format-list-checks',
  'cog',
  'cart-outline',
  'dots-vertical',
  'account-group',
];

describe('vector icons', () => {
  test('every icon name used in the source exists in the glyph map', () => {
    const files = [...walk(path.join(ROOT, 'src')), path.join(ROOT, 'App.js')];
    const used = new Set(EXPECTED);
    files.forEach(f => {
      const text = fs.readFileSync(f, 'utf8');
      const re = /<Icon\b[^>]*?\bname=["']([^"']+)["']/gs;
      let m;
      while ((m = re.exec(text))) used.add(m[1]);
    });
    const missing = [...used].filter(n => !(n in glyphs));
    expect(missing).toEqual([]);
  });

  test('App.js tab bar uses vector icons instead of emoji', () => {
    const app = fs.readFileSync(path.join(ROOT, 'App.js'), 'utf8');
    expect(app).toContain('format-list-checks');
    expect(app).toContain('"cog"');
    expect(app).not.toMatch(/📋|⚙/u);
  });
});
