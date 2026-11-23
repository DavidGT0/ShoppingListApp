import { useCallback, useMemo, useRef, useState } from 'react';

// גובה הגלילה שנחשב "בראש הרשימה"
const TOP = 1;

const offsetOf = event => {
  const y = event?.nativeEvent?.contentOffset?.y;
  return typeof y === 'number' ? y : 0;
};

const initialState = () => ({
  offset: 0,
  dragging: false,
  dragFromTop: true,
  momentum: false,
  viewport: 0,
  content: 0,
});

// משיכה לריענון רק במשיכה חדשה מראש הרשימה.
// מחזיר enabled (ל-RefreshControl, אנדרואיד), scrollHandlers לרשימה הנגללת, ו-reset.
//
// פתוח כש: הגלילה במנוחה בראש הרשימה (y <= 1), ואין גרירה שהתחילה באמצע הרשימה.
// - גרירה מאמצע שמגיעה לראש כשהאצבע עוד על המסך - סגור עד שהאצבע עוזבת
// - הטלה מאמצע: המיקום הידוע הוא באמצע עד שהתנופה נעצרת, ובלי אצבע אי אפשר לרענן
// - מגע חדש בראש - פתוח, ומשיכה מרעננת
//
// שינוי של enabled באמצע מגע מבטל באנדרואיד את המשיכה ומסתיר את הספינר, ולכן:
// - תנופה לא סוגרת את הפקד בעצמה (אנדרואיד שולח אירועי תנופה גם אחרי מגע בלי הטלה)
// - כל זמן הריענון (refreshing) הפקד פתוח
// - סגירה קורית רק בתחילת גרירה (מאמצע הרשימה) או כשהאצבע כבר עזבה
//
// המיקום נקרא רק מאירועי הגרירה והתנופה (בלי onScroll, שמיכל הגרירה המקונן דורס).
// מיקום שהתיישן מתוקן: מגע שקוטע תנופה (שאירוע הסיום שלה לא יגיע) מחזיר לראש,
// ותוכן שהתקצר מתחת לגובה החלון מצמצם את המיקום
const useGatedRefresh = (refreshing = false) => {
  const state = useRef(initialState());
  const [atRestOpen, setAtRestOpen] = useState(true);
  const openRef = useRef(true);

  const scrollHandlers = useMemo(() => {
    const update = () => {
      const s = state.current;
      const next = s.offset <= TOP && !(s.dragging && !s.dragFromTop);
      // עדכון מצב רק כשהערך משתנה
      if (next !== openRef.current) {
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
    return {
      // מגע חדש עוצר תנופה. אם הייתה תנופה בדרך, אירוע הסיום שלה עלול לא להגיע
      // והמיקום הידוע ישן - חוזרים לראש (גרירה שתתחיל תדווח את המיקום האמיתי)
      onTouchStart: () => {
        const s = state.current;
        if (s.momentum) {
          s.momentum = false;
          s.offset = 0;
        }
        s.dragging = false;
        s.dragFromTop = true;
        update();
      },
      onScrollBeginDrag: event => {
        const s = state.current;
        s.offset = offsetOf(event);
        s.momentum = false;
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
  }, []);

  // רשימה חדשה הוצגה (למשל החלפת מצב מיון): מתחילים שוב מראש הרשימה
  const reset = useCallback(() => {
    state.current = initialState();
    if (!openRef.current) {
      openRef.current = true;
      setAtRestOpen(true);
    }
  }, []);

  return { enabled: refreshing || atRestOpen, scrollHandlers, reset };
};

export default useGatedRefresh;
