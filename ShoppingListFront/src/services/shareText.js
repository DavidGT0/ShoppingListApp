// בניית טקסט לשליחה מרשימה: רק מוצרים שעוד לא נקנו. null כשאין מה לשלוח
export const buildListShareText = (listName, items) => {
  const pending = (items || []).filter(item => !item.purchased);
  if (pending.length === 0) return null;
  const lines = pending.map(item =>
    item.amount > 1 ? `• ${item.name} ×${item.amount}` : `• ${item.name}`,
  );
  return `🛒 ${listName}\n${lines.join('\n')}`;
};
