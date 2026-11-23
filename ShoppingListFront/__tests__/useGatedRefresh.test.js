/* global describe, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import useGatedRefresh from '../src/hooks/useGatedRefresh';

const { act } = ReactTestRenderer;

// רכיב בדיקה: חושף את ערך ה-hook ומונה ציורים. refreshing מגיע כ-prop
const mount = (refreshing = false) => {
  const probe = { renders: 0, value: null };
  const Probe = props => {
    probe.renders += 1;
    probe.value = useGatedRefresh(props.refreshing);
    return null;
  };
  let tree;
  act(() => {
    tree = ReactTestRenderer.create(<Probe refreshing={refreshing} />);
  });
  const h = () => probe.value.scrollHandlers;
  const fire = (name, y) =>
    act(() => {
      h()[name]({ nativeEvent: { contentOffset: { x: 0, y } } });
    });
  const touch = () => act(() => h().onTouchStart({ nativeEvent: {} }));
  const layout = height =>
    act(() => h().onLayout({ nativeEvent: { layout: { height } } }));
  const content = height => act(() => h().onContentSizeChange(0, height));
  const setRefreshing = value =>
    act(() => tree.update(<Probe refreshing={value} />));
  return { probe, fire, touch, layout, content, setRefreshing };
};

describe('useGatedRefresh', () => {
  test('idle at the top: pull-to-refresh is enabled', () => {
    const { probe } = mount();
    expect(probe.value.enabled).toBe(true);
    expect(Object.keys(probe.value.scrollHandlers).sort()).toEqual([
      'onContentSizeChange',
      'onLayout',
      'onMomentumScrollBegin',
      'onMomentumScrollEnd',
      'onScrollBeginDrag',
      'onScrollEndDrag',
      'onTouchStart',
    ]);
  });

  test('a fling from mid-list that reaches the top does not refresh', () => {
    const { probe, fire } = mount();
    fire('onScrollBeginDrag', 0);
    fire('onScrollEndDrag', 40);
    fire('onMomentumScrollBegin', 40);
    fire('onMomentumScrollEnd', 600);
    fire('onScrollBeginDrag', 600);
    expect(probe.value.enabled).toBe(false);
    fire('onScrollEndDrag', 450);
    fire('onMomentumScrollBegin', 450);
    // התנופה נעה לכיוון הראש בלי אצבע - עדיין סגור
    expect(probe.value.enabled).toBe(false);
    fire('onMomentumScrollEnd', 0);
    expect(probe.value.enabled).toBe(true);
  });

  test('a drag that began mid-list stays blocked when it reaches the top with the finger down', () => {
    const { probe, fire } = mount();
    fire('onScrollBeginDrag', 0);
    fire('onScrollEndDrag', 300);
    expect(probe.value.enabled).toBe(false);
    fire('onScrollBeginDrag', 300);
    expect(probe.value.enabled).toBe(false);
    fire('onScrollEndDrag', 0);
    expect(probe.value.enabled).toBe(true);
  });

  test('a new touch that starts at the top and pulls down refreshes', () => {
    const { probe, fire, touch } = mount();
    fire('onScrollBeginDrag', 300);
    fire('onScrollEndDrag', 0);
    touch();
    fire('onScrollBeginDrag', 0);
    expect(probe.value.enabled).toBe(true);
  });

  // תיקון: התנופה נקטעת במגע חדש ו-onMomentumScrollEnd לא מגיע לעולם
  test('a fling interrupted by a new touch at the top, then a pull, is enabled', () => {
    const { probe, fire, touch } = mount();
    fire('onScrollBeginDrag', 500);
    fire('onScrollEndDrag', 480);
    fire('onMomentumScrollBegin', 480);
    expect(probe.value.enabled).toBe(false);
    // התנופה הגיעה לראש ונקטעה במגע: אין אירוע סיום, ומשיכה בראש לא מפעילה גרירה
    touch();
    expect(probe.value.enabled).toBe(true);
  });

  test('a fling interrupted by a new drag at the top is enabled', () => {
    const { probe, fire } = mount();
    fire('onScrollEndDrag', 480);
    fire('onMomentumScrollBegin', 480);
    fire('onScrollBeginDrag', 0);
    expect(probe.value.enabled).toBe(true);
    fire('onScrollEndDrag', 0);
    expect(probe.value.enabled).toBe(true);
  });

  test('many consecutive pulls at the top stay enabled, with or without momentum ends', () => {
    const { probe, fire, touch } = mount();
    for (let i = 0; i < 12; i += 1) {
      touch();
      expect(probe.value.enabled).toBe(true);
      fire('onScrollBeginDrag', 0);
      fire('onScrollEndDrag', 0);
      // אנדרואיד שולח אירועי תנופה גם אחרי מגע בלי הטלה; לפעמים בלי סיום
      fire('onMomentumScrollBegin', 0);
      if (i % 2 === 0) fire('onMomentumScrollEnd', 0);
      expect(probe.value.enabled).toBe(true);
    }
  });

  test('momentum events at the top never close the gate', () => {
    const { probe, fire } = mount();
    const before = probe.renders;
    fire('onMomentumScrollBegin', 0);
    fire('onMomentumScrollEnd', 0);
    expect(probe.value.enabled).toBe(true);
    expect(probe.renders).toBe(before);
  });

  // ביטול הפקד בזמן ריענון מסתיר את הספינר באנדרואיד - נשאר פתוח כל זמן הריענון
  test('stays enabled while refreshing, whatever the scroll events say', () => {
    const { probe, fire, setRefreshing } = mount();
    setRefreshing(true);
    fire('onScrollBeginDrag', 300);
    fire('onMomentumScrollBegin', 300);
    expect(probe.value.enabled).toBe(true);
    setRefreshing(false);
    expect(probe.value.enabled).toBe(false);
  });

  test('content that shrinks under the viewport clamps a stale offset back to the top', () => {
    const { probe, fire, layout, content } = mount();
    layout(600);
    content(2000);
    fire('onScrollEndDrag', 900);
    expect(probe.value.enabled).toBe(false);
    content(1200);
    // 900 > 1200-600: התוכן התקצר, הגלילה ירדה ל-600 לכל היותר
    expect(probe.value.enabled).toBe(false);
    content(500);
    expect(probe.value.enabled).toBe(true);
  });

  test('state updates only when the enabled value changes', () => {
    const { probe, fire } = mount();
    const before = probe.renders;
    fire('onScrollBeginDrag', 0);
    fire('onScrollEndDrag', 0.5);
    fire('onScrollBeginDrag', 1);
    expect(probe.renders).toBe(before);
    fire('onScrollEndDrag', 200);
    const afterDisable = probe.renders;
    expect(afterDisable).toBe(before + 1);
    fire('onScrollBeginDrag', 200);
    fire('onScrollEndDrag', 150);
    fire('onMomentumScrollBegin', 150);
    expect(probe.renders).toBe(afterDisable);
  });

  test('the handlers are stable between renders', () => {
    const { probe, fire } = mount();
    const first = probe.value.scrollHandlers;
    fire('onScrollEndDrag', 200);
    expect(probe.value.scrollHandlers).toBe(first);
  });

  test('a missing event offset is read as the top', () => {
    const { probe } = mount();
    act(() => probe.value.scrollHandlers.onScrollEndDrag({}));
    expect(probe.value.enabled).toBe(true);
  });

  test('reset reopens the gate for a new list', () => {
    const { probe, fire } = mount();
    fire('onScrollEndDrag', 300);
    expect(probe.value.enabled).toBe(false);
    act(() => probe.value.reset());
    expect(probe.value.enabled).toBe(true);
  });
});
