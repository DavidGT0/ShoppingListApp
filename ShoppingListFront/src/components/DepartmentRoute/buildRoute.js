// תכנית המסלול "לפי מחלקות" מתוך המוצרים הגלויים ({item, cat} לכל מוצר).
// - רק מחלקות שיש בהן מוצרים, בסדר הפריסה של הרשימה (cat.order)
// - המונה סופר גם את מה שנקנה; בשורות נשארים רק המוצרים שעוד לא נקנו
// - הכרטיס "עכשיו במחלקה" הוא המחלקה הראשונה בסדר שעוד יש בה מה לקנות
export const buildRoute = (entries = []) => {
  const byKey = new Map();
  const stations = [];
  (entries || []).forEach(({ item, cat }) => {
    if (!item || !cat) return;
    let station = byKey.get(cat.key);
    if (!station) {
      station = { ...cat, items: [], bought: 0, total: 0 };
      byKey.set(cat.key, station);
      stations.push(station);
    }
    station.total += 1;
    if (item.purchased) station.bought += 1;
    else station.items.push(item);
  });
  stations.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  stations.forEach(station => {
    station.complete = station.items.length === 0;
  });
  const focus = stations.find(station => !station.complete);
  return {
    stations,
    focusKey: focus ? focus.key : null,
    // הכל נקנה (ויש בכלל מוצרים): במקום הכרטיס מוצג "הכל בעגלה"
    allDone: stations.length > 0 && !focus,
  };
};
