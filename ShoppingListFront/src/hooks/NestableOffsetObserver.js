import { useNestableScrollContainerContext } from 'react-native-draggable-flatlist/src/context/nestableScrollContainerContext';
import { useAnimatedReaction, runOnJS } from 'react-native-reanimated';

// המיכל המקונן (NestableScrollContainer) דורס את onScroll בשביל ה-handler שלו, ולכן
// אי אפשר לקבל ממנו אירועי גלילה. הוא שומר את הגלילה בערך משותף של Reanimated
// (outerScrollOffset) בהקשר הפנימי שלו; הרכיב הזה, כילד בתוך המיכל, מאזין לערך
// ומעביר כל שינוי ל-onOffset ב-JS.
// ייבוא פנימי מהספרייה (src, כמו ש-Metro טוען אותה דרך השדה react-native):
// מחוץ למיכל, או אם המבנה הפנימי ישתנה, אין הקשר - והרכיב פשוט לא מדווח
const NestableOffsetObserver = ({ onOffset }) => {
  const context = useNestableScrollContainerContext();
  const offset = context ? context.outerScrollOffset : null;
  useAnimatedReaction(
    () => (offset ? offset.value : null),
    (y, previous) => {
      if (y !== null && y !== previous) runOnJS(onOffset)(y);
    },
    [offset, onOffset],
  );
  return null;
};

export default NestableOffsetObserver;
