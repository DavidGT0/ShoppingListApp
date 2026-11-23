// בניית טקסט לשליחה מרשימה: רק מוצרים שעוד לא נקנו. null כשאין מה לשלוח
export const buildListShareText = (listName, items) => {
  const pending = (items || []).filter(item => !item.purchased);
  if (pending.length === 0) return null;
  const lines = pending.map(item => {
    // הכמות מוצגת כשהיא מעל 1 או כשיש יחידה
    const showAmount = item.amount > 1 || !!item.unit;
    let line = `• ${item.name}`;
    if (showAmount) line += ` ${item.amount}`;
    if (item.unit) line += ` ${item.unit}`;
    if (item.note) line += ` (${item.note})`;
    return line;
  });
  return `🛒 ${listName}\n${lines.join('\n')}`;
};
