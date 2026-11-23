import { useCallback, useMemo, useRef, useState } from 'react';

// גובה הגלילה שנחשב "בראש הרשימה"
const TOP = 1;

const offsetOf = event => {
  const y = event?.nativeEvent?.contentOffset?.y;
  return typeof y === 'number' ? y : 0;
};

// משיכה לריענון רק במשיכה חדשה מראש הרשימה.
// מחזיר enabled (ל-RefreshControl, אנדרואיד) ו-scrollHandlers לרשימה הנגללת.
// מותר לרענן רק כש:
// - הגלילה בראש (y <= 1)
// - אין תנופה (הטלה) בתנועה
// - הגרירה הנוכחית התחילה בראש. גרירה שהתחילה באמצע הרשימה והגיעה לראש
//   כשהאצבע עוד על המסך לא מרעננת
// הגלילה נקראת רק מאירועי הגרירה והתנופה (שיש בהם contentOffset), בלי onScroll:
// מיכל הגרירה המקונן דורס onScroll, ולכן אין לגעת בו
const useGatedRefresh = () => {
  const [enabled, setEnabled] = useState(true);
  const enabledRef = useRef(true);
  const state = useRef({
    offset: 0,
    momentum: false,
    dragging: false,
    dragFromTop: true,
  });

  const scrollHandlers = useMemo(() => {
    const update = () => {
      const s = state.current;
      const next =
        s.offset <= TOP && !s.momentum && (!s.dragging || s.dragFromTop);
      // עדכון מצב רק כשהערך משתנה
      if (next !== enabledRef.current) {
        enabledRef.current = next;
        setEnabled(next);
      }
    };
    return {
      onScrollBeginDrag: event => {
        const s = state.current;
        s.offset = offsetOf(event);
        s.dragging = true;
        s.dragFromTop = s.offset <= TOP;
        update();
      },
      onScrollEndDrag: event => {
        const s = state.current;
        s.offset = offsetOf(event);
        s.dragging = false;
        s.dragFromTop = true;
        update();
      },
      onMomentumScrollBegin: event => {
        const s = state.current;
        s.offset = offsetOf(event);
        s.momentum = true;
        update();
      },
      onMomentumScrollEnd: event => {
        const s = state.current;
        s.offset = offsetOf(event);
        s.momentum = false;
        update();
      },
    };
  }, []);

  // רשימה חדשה הוצגה (למשל החלפת מצב מיון): מתחילים שוב מראש הרשימה
  const reset = useCallback(() => {
    state.current = {
      offset: 0,
      momentum: false,
      dragging: false,
      dragFromTop: true,
    };
    if (!enabledRef.current) {
      enabledRef.current = true;
      setEnabled(true);
    }
  }, []);

  return { enabled, scrollHandlers, reset };
};

export default useGatedRefresh;
