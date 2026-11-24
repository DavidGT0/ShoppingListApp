import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// גובה הגלילה שנחשב "בראש הרשימה"
const TOP = 1;

const offsetOf = event => {
  const y = event?.nativeEvent?.contentOffset?.y;
  return typeof y === 'number' ? y : 0;
};

const initialState = () => ({
  offset: 0,
  dragging: false,
  dragAtTop: true,
  momentum: false,
  viewport: 0,
  content: 0,
});

// משיכה לריענון רק במשיכה חדשה מראש הרשימה.
// מחזיר enabled (ל-RefreshControl, אנדרואיד), scrollHandlers לרשימה הנגללת,
// scrollTracking (onScroll לרשימות רגילות), onOffset (למיכל המקונן) ו-reset.
//
// פתוח כש: הגלילה במנוחה בראש הרשימה (y <= 1), ואין גרירה שלא נשארה כל הזמן בראש.
// - גרירה מאמצע שמגיעה לראש כשהאצבע עוד על המסך - סגור עד שהאצבע עוזבת
// - גרירה שמתחילה בראש, מגלגלת את התוכן הלאה וחוזרת לראש - סגור מהרגע שהתוכן
//   עזב את הראש ועד שהאצבע עוזבת (אין אז משיכה בתהליך, כי התוכן זז)
// - הטלה מאמצע: המיקום הידוע הוא באמצע עד שהתנופה נעצרת, ובלי אצבע אי אפשר לרענן
// - מגע חדש בראש - פתוח, ומשיכה מרעננת
//
// שינוי של enabled באמצע מגע מבטל באנדרואיד את המשיכה ומסתיר את הספינר, ולכן:
// - תנופה לא סוגרת את הפקד בעצמה (אנדרואיד שולח אירועי תנופה גם אחרי מגע בלי הטלה)
// - כל זמן הריענון (refreshing) הפקד פתוח
// - סגירה קורית רק בתחילת גרירה (מאמצע הרשימה) או כשהאצבע כבר עזבה
//
// המיקום מגיע מאירועי הגרירה והתנופה, ובאמצע גרירה גם מ-onScroll (ScrollView/FlatList)
// או מ-onOffset (המיכל המקונן דורס onScroll; NestableOffsetObserver קורא את הגלילה שלו).
// מיקום שהתיישן מתוקן: מגע שקוטע תנופה (שאירוע הסיום שלה לא יגיע) מחזיר לראש,
// ותוכן שהתקצר מתחת לגובה החלון מצמצם את המיקום
// TEMP: אבחון השער (לוג ל-logcat בתור ReactNativeJS). להסרה עם ה-revert של הקומיט הזה
const gateLog = (...args) => console.log('[gate]', ...args);

const useGatedRefresh = (refreshing = false) => {
  const state = useRef(initialState());
  const [atRestOpen, setAtRestOpen] = useState(true);
  const openRef = useRef(true);
  // TEMP: לאבחון בלבד
  const refreshingRef = useRef(refreshing);
  refreshingRef.current = refreshing;
  const counters = useRef({ scroll: 0, observer: 0 });

  const core = useMemo(() => {
    // TEMP: מצב השער אחרי כל אירוע
    const snapshot = () => {
      const s = state.current;
      const open = s.offset <= TOP && !(s.dragging && !s.dragAtTop);
      return JSON.stringify({
        offset: Math.round(s.offset * 10) / 10,
        dragging: s.dragging,
        dragFromTop: s.dragAtTop,
        leftTop: s.dragging && !s.dragAtTop,
        momentum: s.momentum,
        refreshing: refreshingRef.current,
        enabled: refreshingRef.current || open,
      });
    };
    const update = (event, detail) => {
      const s = state.current;
      const next = s.offset <= TOP && !(s.dragging && !s.dragAtTop);
      if (event) gateLog(event, detail === undefined ? '' : detail, snapshot());
      // עדכון מצב רק כשהערך משתנה
      if (next !== openRef.current) {
        gateLog('open changed ->', next, snapshot());
        openRef.current = next;
        setAtRestOpen(next);
      }
    };
    const clamp = () => {
      const s = state.current;
      if (s.viewport > 0 && s.content > 0) {
        s.offset = Math.min(s.offset, Math.max(0, s.content - s.viewport));
      }
    };
    // מיקום באמצע גרירה: תוכן שעזב את הראש סוגר את הגרירה הזו עד שהאצבע עוזבת
    const onOffset = (y, source = 'observer') => {
      if (typeof y !== 'number') return;
      const s = state.current;
      // TEMP: לוג רק כשחוצים את גבול ה-1px, או כל אירוע עשירי
      const crossed = s.offset <= TOP !== y <= TOP;
      counters.current[source] = (counters.current[source] || 0) + 1;
      const loud = crossed || counters.current[source] % 10 === 0;
      s.offset = y;
      if (s.dragging && y > TOP) s.dragAtTop = false;
      update(loud ? source : null, y);
    };
    const scrollHandlers = {
      // מגע חדש עוצר תנופה. אם הייתה תנופה בדרך, אירוע הסיום שלה עלול לא להגיע
      // והמיקום הידוע ישן - חוזרים לראש (גרירה שתתחיל תדווח את המיקום האמיתי)
      onTouchStart: () => {
        const s = state.current;
        if (s.momentum) {
          s.momentum = false;
          s.offset = 0;
        }
        s.dragging = false;
        s.dragAtTop = true;
        update('touchStart');
      },
      // TEMP: לאבחון בלבד (בלי שינוי מצב)
      onTouchEnd: () => {
        update('touchEnd');
      },
      onTouchCancel: () => {
        update('touchCancel');
      },
      onScrollBeginDrag: event => {
        const s = state.current;
        s.offset = offsetOf(event);
        s.momentum = false;
        s.dragging = true;
        s.dragAtTop = s.offset <= TOP;
        update('beginDrag', offsetOf(event));
      },
      onScrollEndDrag: event => {
        const s = state.current;
        s.offset = offsetOf(event);
        s.dragging = false;
        s.dragAtTop = true;
        update('endDrag', offsetOf(event));
      },
      onMomentumScrollBegin: event => {
        const s = state.current;
        s.offset = offsetOf(event);
        s.momentum = true;
        update('momentumBegin', offsetOf(event));
      },
      onMomentumScrollEnd: event => {
        const s = state.current;
        s.offset = offsetOf(event);
        s.momentum = false;
        update('momentumEnd', offsetOf(event));
      },
      onLayout: event => {
        const height = event?.nativeEvent?.layout?.height;
        if (typeof height !== 'number') return;
        state.current.viewport = height;
        clamp();
        update();
      },
      onContentSizeChange: (_width, height) => {
        if (typeof height !== 'number') return;
        state.current.content = height;
        clamp();
        update();
      },
    };
    return {
      scrollHandlers,
      onOffset,
      scrollTracking: {
        onScroll: event => onOffset(offsetOf(event), 'scroll'),
        scrollEventThrottle: 16,
      },
      describe: snapshot,
    };
  }, []);

  // TEMP: כל שינוי בערך הסופי של enabled (כולל refreshing)
  const finalEnabled = refreshing || atRestOpen;
  useEffect(() => {
    gateLog('enabled ->', finalEnabled, core.describe());
  }, [finalEnabled, core]);

  // רשימה חדשה הוצגה (למשל החלפת מצב מיון): מתחילים שוב מראש הרשימה
  const reset = useCallback(() => {
    state.current = initialState();
    if (!openRef.current) {
      openRef.current = true;
      setAtRestOpen(true);
    }
  }, []);

  return {
    enabled: refreshing || atRestOpen,
    scrollHandlers: core.scrollHandlers,
    scrollTracking: core.scrollTracking,
    onOffset: core.onOffset,
    reset,
    // TEMP: מצב השער ללוג של onRefresh
    describeGate: core.describe,
  };
};

export default useGatedRefresh;
