import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

// רענון תקופתי רק כשהמסך בפוקוס, האפליקציה בחזית והרענון לא מושהה.
// setTimeout שרשורי: הטיימר הבא נקבע רק אחרי שהקריאה הנוכחית הסתיימה.
export default function useLiveRefresh(refresh, intervalMs, options = {}) {
  const paused = !!options.paused;
  const refreshRef = useRef(refresh);
  const inFlight = useRef(false);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  const effect = useCallback(() => {
    if (paused) {
      return undefined;
    }
    let cancelled = false;
    let timer = null;

    const stop = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const tick = async () => {
      timer = null;
      if (cancelled) {
        return;
      }
      if (inFlight.current) {
        timer = setTimeout(tick, intervalMs);
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
      if (!cancelled) {
        timer = setTimeout(tick, intervalMs);
      }
    };

    const start = () => {
      stop();
      tick();
    };

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
