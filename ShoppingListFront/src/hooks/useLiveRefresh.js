import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

// רענון תקופתי רק כשהמסך בפוקוס, האפליקציה בחזית והרענון לא מושהה.
// setTimeout שרשורי: הטיימר הבא נקבע רק אחרי שהקריאה הנוכחית הסתיימה.
export default function useLiveRefresh(refresh, intervalMs, options = {}) {
  const paused = !!options.paused;
  const refreshRef = useRef(refresh);
  const inFlight = useRef(false);
  const settleRef = useRef(() => {});

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  const effect = useCallback(() => {
    if (paused) {
      return undefined;
    }
    let cancelled = false;
    let active = false; // האם הלולאה מורשית לרוץ (חזית)
    let rerun = false; // להריץ מיד אחרי שהקריאה שבתהליך תסתיים
    let timer = null;

    const clear = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const schedule = () => {
      clear();
      timer = setTimeout(tick, intervalMs);
    };

    const afterSettle = () => {
      if (cancelled || !active) {
        return;
      }
      if (rerun) {
        rerun = false;
        tick();
      } else {
        schedule();
      }
    };

    async function tick() {
      timer = null;
      if (cancelled || !active) {
        return;
      }
      if (inFlight.current) {
        rerun = true;
        return;
      }
      inFlight.current = true;
      try {
        await refreshRef.current();
      } catch (e) {
        // שגיאות רענון נבלעות, הניסיון הבא יקרה בזמנו
      } finally {
        inFlight.current = false;
      }
      // הריצה האחרונה היא זו שמחליטה מה קורה אחרי סיום קריאה
      settleRef.current();
    }

    const start = () => {
      active = true;
      clear();
      if (inFlight.current) {
        rerun = true;
      } else {
        tick();
      }
    };

    const stop = () => {
      active = false;
      rerun = false;
      clear();
    };

    settleRef.current = afterSettle;
    if (AppState.currentState === 'active') {
      start();
    }
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        start();
      } else {
        stop();
      }
    });

    return () => {
      cancelled = true;
      stop();
      sub.remove();
    };
  }, [intervalMs, paused]);

  useFocusEffect(effect);
}
