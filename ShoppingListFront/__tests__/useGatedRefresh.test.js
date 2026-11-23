/* global describe, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import useGatedRefresh from '../src/hooks/useGatedRefresh';

const { act } = ReactTestRenderer;

// רכיב בדיקה: חושף את ערך ה-hook ומונה ציורים
const mount = () => {
  const probe = { renders: 0, value: null };
  const Probe = () => {
    probe.renders += 1;
    probe.value = useGatedRefresh();
    return null;
  };
  let tree;
  act(() => {
    tree = ReactTestRenderer.create(<Probe />);
  });
  const fire = (name, y) =>
    act(() => {
      probe.value.scrollHandlers[name]({
        nativeEvent: { contentOffset: { x: 0, y } },
      });
    });
  return { probe, fire, tree };
};

describe('useGatedRefresh', () => {
  test('idle at the top: pull-to-refresh is enabled', () => {
    const { probe } = mount();
    expect(probe.value.enabled).toBe(true);
    expect(Object.keys(probe.value.scrollHandlers).sort()).toEqual([
      'onMomentumScrollBegin',
      'onMomentumScrollEnd',
      'onScrollBeginDrag',
      'onScrollEndDrag',
    ]);
  });

  test('a fling from mid-list that reaches the top does not refresh', () => {
    const { probe, fire } = mount();
    fire('onScrollBeginDrag', 0);
    fire('onScrollEndDrag', 40);
    fire('onMomentumScrollBegin', 40);
    // ... גלילה ארוכה למטה ואז הטלה חזקה חזרה למעלה
    fire('onMomentumScrollEnd', 600);
    fire('onScrollBeginDrag', 600);
    expect(probe.value.enabled).toBe(false);
    fire('onScrollEndDrag', 450);
    fire('onMomentumScrollBegin', 450);
    // התנופה מגיעה לראש הרשימה בזמן שהיא עוד נעה - עדיין חסום
    expect(probe.value.enabled).toBe(false);
    // נעצרה בראש: אין אצבע על המסך, ומשיכה חדשה מותרת
    fire('onMomentumScrollEnd', 0);
    expect(probe.value.enabled).toBe(true);
  });

  test('a drag that began mid-list stays blocked when it reaches the top with the finger down', () => {
    const { probe, fire } = mount();
    fire('onScrollBeginDrag', 0);
    fire('onScrollEndDrag', 300);
    expect(probe.value.enabled).toBe(false);
    fire('onScrollBeginDrag', 300);
    // האצבע עדיין על המסך והתוכן כבר בראש - אין אירוע, הערך נשאר חסום
    expect(probe.value.enabled).toBe(false);
    fire('onScrollEndDrag', 0);
    expect(probe.value.enabled).toBe(true);
  });

  test('a new touch that starts at the top and pulls down refreshes', () => {
    const { probe, fire } = mount();
    fire('onScrollBeginDrag', 300);
    fire('onScrollEndDrag', 0);
    fire('onScrollBeginDrag', 0);
    expect(probe.value.enabled).toBe(true);
  });

  test('momentum blocks even at the top, until it ends', () => {
    const { probe, fire } = mount();
    fire('onMomentumScrollBegin', 0);
    expect(probe.value.enabled).toBe(false);
    fire('onMomentumScrollEnd', 0);
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
});
