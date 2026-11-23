/* global describe, test, expect */
import fs from 'fs';
import path from 'path';
import { colors } from '../src/theme/colors';

const SRC = path.join(__dirname, '..', 'src');

const walk = dir =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith('.js') ? [full] : [];
  });

describe('theme', () => {
  test('brand colors', () => {
    expect(colors.primary).toBe('#1E6FE8');
    expect(colors.secondary).toBe('#1FC9A3');
    expect(colors.navy).toBe('#0F172A');
    expect(colors.primaryLight).toBe('#4C8DF0');
    expect(colors.primaryDark).toBe('#1557BF');
    expect(colors.success).toBe('#1FC9A3');
    expect(colors.surfaceHighlight).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  test('no color literals (hex or named) outside theme/ and services/categories.js', () => {
    const files = [...walk(SRC), path.join(SRC, '..', 'App.js')].filter(f => {
      const rel = path.relative(SRC, f).split(path.sep).join('/');
      return !rel.startsWith('theme/') && rel !== 'services/categories.js';
    });
    const offenders = files
      .filter(f =>
        /#[0-9A-Fa-f]{3,8}\b|['"](white|black|gray|grey)['"]/i.test(
          fs.readFileSync(f, 'utf8'),
        ),
      )
      .map(f => path.relative(SRC, f));
    expect(offenders).toEqual([]);
  });

  test('components and screens do not import theme/colors', () => {
    const offenders = walk(SRC)
      .filter(f => {
        const rel = path.relative(SRC, f).split(path.sep).join('/');
        return !rel.startsWith('theme/') && rel !== 'services/categories.js';
      })
      .filter(f =>
        /from\s+['"][^'"]*theme\/colors['"]/.test(fs.readFileSync(f, 'utf8')),
      )
      .map(f => path.relative(SRC, f));
    expect(offenders).toEqual([]);
  });
});

describe('placeholder colours', () => {
  test('every TextInput with a placeholder sets placeholderTextColor', () => {
    const offenders = walk(SRC)
      .filter(f => /<TextInput[\s\S]*?\/>/.test(fs.readFileSync(f, 'utf8')))
      .filter(f => {
        const blocks =
          fs.readFileSync(f, 'utf8').match(/<TextInput[\s\S]*?\/>/g) || [];
        return blocks.some(
          b => /placeholder=/.test(b) && !/placeholderTextColor=/.test(b),
        );
      })
      .map(f => path.relative(SRC, f));
    expect(offenders).toEqual([]);
  });
});
