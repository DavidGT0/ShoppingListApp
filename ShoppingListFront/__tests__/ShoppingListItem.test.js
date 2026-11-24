/* global jest, describe, test, expect, afterEach */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('react-native-gesture-handler', () => {
  const { TouchableOpacity } = require('react-native');
  return { TouchableOpacity };
});
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

import ShoppingListItem from '../src/components/ShoppingListItem/ShoppingListItem';

const { act } = ReactTestRenderer;

const render = async (item, extra = {}) => {
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <ShoppingListItem
        item={{ id: 1, name: 'עגבניות', amount: 2, purchased: false, ...item }}
        onTogglePurchased={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onUpdateAmount={jest.fn()}
        {...extra}
      />,
    );
  });
  trees.push(tree);
  const find = id => tree.root.findAllByProps({ testID: id });
  return { tree, find };
};

const textOf = nodes => nodes[0].props.children;

const trees = [];
afterEach(() => {
  trees.splice(0).forEach(t => act(() => t.unmount()));
});

test('amount shows with its unit, or alone without one', async () => {
  let r = await render({ unit: 'ק״ג' });
  expect(textOf(r.find('item_amount'))).toBe('2 ק״ג');
  r = await render({ unit: null });
  expect(textOf(r.find('item_amount'))).toBe('2');
});

test('note is shown under the name, hidden when empty', async () => {
  let r = await render({ note: 'שרי' });
  expect(textOf(r.find('item_note'))).toBe('שרי');
  r = await render({ note: null });
  expect(r.find('item_note')).toHaveLength(0);
});

test('added-by: shown only for another member with showAddedBy', async () => {
  const item = { added_by: 'dana' };
  let r = await render(item, { showAddedBy: true, currentUsername: 'omer' });
  expect(textOf(r.find('item_added_by')).join('')).toBe('נוסף ע״י dana');
  // showAddedBy off
  r = await render(item, { showAddedBy: false, currentUsername: 'omer' });
  expect(r.find('item_added_by')).toHaveLength(0);
  // own item
  r = await render(item, { showAddedBy: true, currentUsername: 'dana' });
  expect(r.find('item_added_by')).toHaveLength(0);
  // legacy trailing-space username of the same user
  r = await render(
    { added_by: 'dana ' },
    { showAddedBy: true, currentUsername: 'dana' },
  );
  expect(r.find('item_added_by')).toHaveLength(0);
  // no adder
  r = await render(
    { added_by: null },
    { showAddedBy: true, currentUsername: 'omer' },
  );
  expect(r.find('item_added_by')).toHaveLength(0);
});

test('a disabled row disables the amount buttons', async () => {
  const { tree } = await render({}, { disabled: true });
  const disabledFlags = tree.root
    .findAll(n => n.props.android_ripple?.radius === 16 && !!n.props.onPress)
    .map(p => !!p.props.disabled);
  expect(disabledFlags).toEqual([true, true]);
});

test('an enabled row keeps the amount buttons active', async () => {
  const { tree } = await render({});
  const disabledFlags = tree.root
    .findAll(n => n.props.android_ripple?.radius === 16 && !!n.props.onPress)
    .map(p => !!p.props.disabled);
  expect(disabledFlags).toEqual([false, false]);
});

test('the check circle is a checkbox that toggles purchased', async () => {
  const onTogglePurchased = jest.fn();
  const r = await render({ id: 7 }, { onTogglePurchased });
  const [circle] = r.find('item_check_7');
  expect(circle.props.accessibilityRole).toBe('checkbox');
  expect(circle.props.accessibilityState.checked).toBe(false);
  expect(circle.props.accessibilityLabel).toBe('עגבניות');
  await act(async () => circle.props.onPress());
  expect(onTogglePurchased).toHaveBeenCalledTimes(1);
});

test('a bought row shows a checked circle that un-buys', async () => {
  const onTogglePurchased = jest.fn();
  const r = await render({ id: 7, purchased: true }, { onTogglePurchased });
  const [circle] = r.find('item_check_7');
  expect(circle.props.accessibilityState.checked).toBe(true);
  await act(async () => circle.props.onPress());
  expect(onTogglePurchased).toHaveBeenCalledTimes(1);
});

test('the trash deletes and has a Hebrew label', async () => {
  const onDelete = jest.fn();
  const r = await render({ id: 7 }, { onDelete });
  const [trash] = r.find('item_delete_7');
  expect(trash.props.accessibilityRole).toBe('button');
  expect(trash.props.accessibilityLabel).toBe('מחק את עגבניות');
  await act(async () => trash.props.onPress());
  expect(onDelete).toHaveBeenCalledTimes(1);
});

test('tapping the name opens edit', async () => {
  const onEdit = jest.fn();
  const r = await render({ id: 7 }, { onEdit });
  const [name] = r.find('item_name_7');
  expect(name.props.accessibilityRole).toBe('button');
  expect(name.props.accessibilityHint).toBe('לחיצה לעריכה');
  await act(async () => name.props.onPress());
  expect(onEdit).toHaveBeenCalledTimes(1);
});

test('offline: circle, trash and name stay pressable and not a11y-disabled', async () => {
  const fns = {
    onTogglePurchased: jest.fn(),
    onDelete: jest.fn(),
    onEdit: jest.fn(),
  };
  const r = await render({ id: 7 }, { disabled: true, ...fns });
  for (const id of ['item_check_7', 'item_delete_7', 'item_name_7']) {
    const [n] = r.find(id);
    expect(n.props.accessibilityState?.disabled).toBeUndefined();
    expect(n.props.disabled).toBeFalsy();
    await act(async () => n.props.onPress());
  }
  Object.values(fns).forEach(f => expect(f).toHaveBeenCalledTimes(1));
});

test('offline: circle and trash tell TalkBack they are unavailable', async () => {
  const offline = await render({ id: 7 }, { disabled: true });
  for (const id of ['item_check_7', 'item_delete_7']) {
    const [n] = offline.find(id);
    expect(n.props.accessibilityHint).toBe('לא זמין ללא חיבור לאינטרנט');
  }
  const online = await render({ id: 8 });
  for (const id of ['item_check_8', 'item_delete_8']) {
    const [n] = online.find(id);
    expect(n.props.accessibilityHint).toBeUndefined();
  }
});

test('there is no swipe container and no pencil any more', async () => {
  const { tree } = await render({ id: 7 });
  expect(
    tree.root.findAll(n => n.props.name === 'pencil-outline'),
  ).toHaveLength(0);
  const src = require('fs').readFileSync(
    require('path').join(
      __dirname,
      '../src/components/ShoppingListItem/ShoppingListItem.js',
    ),
    'utf8',
  );
  expect(src).not.toMatch(/Swipeable/);
});

test('drag handle shows only when onDrag is given', async () => {
  let r = await render({ id: 7 });
  expect(
    r.tree.root.findAll(n => n.props.accessibilityLabel === 'גרור לסידור מחדש'),
  ).toHaveLength(0);
  r = await render({ id: 7 }, { onDrag: jest.fn() });
  expect(
    r.tree.root.findAll(n => n.props.accessibilityLabel === 'גרור לסידור מחדש')
      .length,
  ).toBeGreaterThan(0);
});

// שורות כרטיס "עכשיו במחלקה": עיגול גדול, טקסט לבן ופח לבן על הצבע הראשי
describe('focus variant', () => {
  const { StyleSheet } = require('react-native');
  const { light } = require('../src/theme/palettes');
  const hostOf = (tree, id) =>
    tree.root.findAll(
      n => n.props.testID === id && typeof n.type === 'string',
    )[0];
  const press = (tree, id) =>
    tree.root
      .findAll(n => n.props.testID === id && n.props.onPress)[0]
      .props.onPress();

  test('the check circle is at least 28dp and the text is inverse', async () => {
    const { tree } = await render({ id: 7, note: 'שרי' }, { variant: 'focus' });
    const circle = StyleSheet.flatten(hostOf(tree, 'item_check_7').props.style);
    expect(circle.width).toBeGreaterThanOrEqual(28);
    expect(circle.height).toBeGreaterThanOrEqual(28);
    expect(circle.borderColor).toBe(light.text.inverse);
    const name = tree.root.findAll(
      n => n.type === 'Text' && n.props.children === 'עגבניות',
    )[0];
    expect(StyleSheet.flatten(name.props.style).color).toBe(light.text.inverse);
    const note = hostOf(tree, 'item_note');
    expect(StyleSheet.flatten(note.props.style).color).toBe(light.text.inverse);
  });

  test('the trash icon is inverse and every control keeps working', async () => {
    const fns = {
      onTogglePurchased: jest.fn(),
      onEdit: jest.fn(),
      onDelete: jest.fn(),
    };
    const { tree } = await render({ id: 7 }, { variant: 'focus', ...fns });
    const trash = hostOf(tree, 'item_delete_7').findAll(
      n => n.props.name === 'trash-can-outline',
    )[0];
    expect(trash.props.color).toBe(light.text.inverse);
    press(tree, 'item_check_7');
    press(tree, 'item_name_7');
    press(tree, 'item_delete_7');
    Object.values(fns).forEach(f => expect(f).toHaveBeenCalledTimes(1));
  });

  test('the default row keeps its normal circle without the variant', async () => {
    const { tree } = await render({ id: 7 });
    const circle = StyleSheet.flatten(hostOf(tree, 'item_check_7').props.style);
    expect(circle.width).toBe(26);
    expect(circle.borderColor).toBe(light.text.secondary);
  });
});

// סדר השורה כמו בעיצוב: מימין לשמאל עיגול, שם, כמות, פח, ובקצה השמאלי ידית הגרירה
describe('row layout (device fix)', () => {
  const { StyleSheet } = require('react-native');
  const { light } = require('../src/theme/palettes');
  const flat = node => StyleSheet.flatten(node.props.style) || {};
  const hostOf = (tree, id) =>
    tree.root.findAll(
      n => n.props.testID === id && typeof n.type === 'string',
    )[0];
  const hasDesc = (json, pred) =>
    !!json &&
    typeof json === 'object' &&
    (pred(json) || (json.children || []).some(c => hasDesc(c, pred)));
  // מזהה כל ילד ישיר של השורה
  const order = tree => {
    const root = tree.toJSON();
    return root.children.map(c => {
      if (hasDesc(c, n => n.props.testID === 'item_check_7')) return 'check';
      if (hasDesc(c, n => n.props.testID === 'item_name_7')) return 'name';
      if (hasDesc(c, n => n.props.testID === 'item_amount')) return 'amount';
      if (hasDesc(c, n => n.props.testID === 'item_delete_7')) return 'trash';
      if (hasDesc(c, n => n.props.accessibilityLabel === 'גרור לסידור מחדש'))
        return 'drag';
      if (hasDesc(c, n => n.props.testID === 'item_dot')) return 'dot';
      return '?';
    });
  };

  test('the row is row-reverse: circle, name, amount, trash, then the handle at the far left', async () => {
    const { tree } = await render(
      { id: 7, categoryColor: '#123456' },
      { onDrag: jest.fn() },
    );
    expect(flat(tree.toJSON()).flexDirection).toBe('row-reverse');
    expect(order(tree)).toEqual(['dot', 'check', 'name', 'amount', 'trash', 'drag']);
  });

  test('the category dot shows only in the default (manual) row', async () => {
    let r = await render({ id: 7, categoryColor: '#123456' });
    expect(r.find('item_dot').length).toBeGreaterThan(0);
    r = await render({ id: 7, categoryColor: '#123456' }, { variant: 'route' });
    expect(r.find('item_dot')).toHaveLength(0);
    r = await render({ id: 7, categoryColor: '#123456' }, { variant: 'focus' });
    expect(r.find('item_dot')).toHaveLength(0);
  });

  test('the name takes the free width, the controls never grow or shrink', async () => {
    const { tree } = await render({ id: 7, unit: 'חבילה' });
    const name = flat(hostOf(tree, 'item_name_7'));
    expect(name.flex).toBe(1);
    expect(name.minWidth).toBe(0);
    expect(flat(hostOf(tree, 'item_check_7')).flexShrink).toBe(0);
    expect(flat(hostOf(tree, 'item_delete_7')).flexShrink).toBe(0);
    // הפקד: ה-View המצויר הקרוב ביותר מעל טקסט הכמות
    let amount = hostOf(tree, 'item_amount').parent;
    while (typeof amount.type !== 'string') amount = amount.parent;
    expect(flat(amount).flexShrink).toBe(0);
    expect(flat(amount).flexGrow || 0).toBe(0);
  });

  test('the name wraps only between words', async () => {
    const { tree } = await render({ id: 7, name: 'גבינה משולשת' });
    const text = tree.root.findAll(
      n => n.type === 'Text' && n.props.children === 'גבינה משולשת',
    )[0];
    expect(text.props.textBreakStrategy).toBe('simple');
    expect(text.props.android_hyphenationFrequency).toBe('none');
    expect(flat(text).textAlign).toBe('right');
  });

  test('a clear gap separates the circle from the name', async () => {
    const { tree } = await render({ id: 7 });
    // ב-row-reverse השם משמאל לעיגול
    expect(flat(hostOf(tree, 'item_check_7')).marginLeft).toBeGreaterThanOrEqual(10);
  });

  test('the amount control is compact and keeps its text on one line', async () => {
    const { tree } = await render({ id: 7, unit: 'חבילה' });
    const buttons = tree.root.findAll(
      n =>
        typeof n.type === 'string' &&
        ['הפחת כמות', 'הוסף כמות'].includes(n.props.accessibilityLabel),
    );
    expect(buttons).toHaveLength(2);
    buttons.forEach(b => expect(flat(b).width).toBeLessThanOrEqual(30));
    const amount = hostOf(tree, 'item_amount');
    expect(amount.props.numberOfLines).toBe(1);
    expect(flat(amount).fontSize).toBeLessThanOrEqual(13);
  });

  const target = node => {
    const s = flat(node);
    const h = node.props.hitSlop || {};
    return {
      w: s.width + (h.left || 0) + (h.right || 0),
      h: s.height + (h.top || 0) + (h.bottom || 0),
    };
  };

  test('the circle and the trash are at least 44dp tap targets', async () => {
    for (const variant of [undefined, 'focus']) {
      const { tree } = await render({ id: 7 }, { variant });
      [hostOf(tree, 'item_check_7'), hostOf(tree, 'item_delete_7')].forEach(n => {
        const t = target(n);
        expect(t.w).toBeGreaterThanOrEqual(44);
        expect(t.h).toBeGreaterThanOrEqual(44);
      });
    }
  });

  test('muted circle border and trash in the normal row', async () => {
    const { tree } = await render({ id: 7 });
    expect(flat(hostOf(tree, 'item_check_7')).borderColor).toBe(
      light.text.secondary,
    );
    const trash = hostOf(tree, 'item_delete_7').findAll(
      n => n.props.name === 'trash-can-outline',
    )[0];
    expect(trash.props.color).toBe(light.text.secondary);
  });

  test('no no-op margins remain on the name', async () => {
    const { tree } = await render({ id: 7 });
    expect(flat(hostOf(tree, 'item_name_7')).marginLeft).toBeUndefined();
  });
});
