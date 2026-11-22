"""דפי HTML שהשרת מגיש ישירות: מחיקת חשבון ומדיניות פרטיות (נדרשים ע"י Google Play)."""

APP_NAME = "ShopLi"
CONTACT_EMAIL = "david.app.programing@gmail.com"

_STYLE = """
  body { margin: 0; background: #F8F9FA; color: #212529;
         font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.7; }
  header { background: #5B8DEE; color: #fff; padding: 32px 24px 40px;
           border-bottom-left-radius: 32px; border-bottom-right-radius: 32px; }
  header h1 { margin: 0; font-size: 26px; }
  header p { margin: 4px 0 0; opacity: .8; }
  main { max-width: 640px; margin: -20px auto 40px; padding: 0 16px; }
  .card { background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
  h2 { font-size: 19px; margin: 24px 0 6px; }
  h2:first-child { margin-top: 0; }
  label { display: block; font-weight: 600; margin: 16px 0 6px; }
  input { width: 100%; box-sizing: border-box; padding: 12px; font-size: 16px;
          border: 1px solid #DEE2E6; border-radius: 8px; background: #F8F9FA; }
  button { margin-top: 20px; width: 100%; padding: 14px; font-size: 17px; font-weight: 700;
           color: #fff; background: #F44336; border: 0; border-radius: 10px; cursor: pointer; }
  .warning { background: #FFF3E0; border-radius: 8px; padding: 12px; margin-top: 8px; }
  .error { background: #FDECEA; color: #B71C1C; border-radius: 8px; padding: 12px; margin-bottom: 8px; }
  .success { background: #E8F5E9; color: #1B5E20; border-radius: 8px; padding: 12px; }
  a { color: #4A7BCF; }
  small { color: #6C757D; }
"""


def _page(title: str, subtitle: str, body: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} | {APP_NAME}</title>
<style>{_STYLE}</style>
</head>
<body>
<header><h1>{title}</h1><p>{subtitle}</p></header>
<main><div class="card">
{body}
</div></main>
</body>
</html>"""


def delete_account_form(error: str = "") -> str:
    error_html = f'<div class="error">{error}</div>' if error else ""
    body = f"""
{error_html}
<p>בדף זה ניתן למחוק את החשבון שלך באפליקציה {APP_NAME} גם ללא האפליקציה עצמה.
אפשר למחוק את החשבון גם מתוך האפליקציה: <b>הגדרות ← מחיקת חשבון</b>.</p>
<div class="warning">
  <b>מה יימחק לצמיתות:</b> המשתמש שלך (שם משתמש, אימייל וסיסמה), כל רשימות הקניות שיצרת
  וכל המוצרים שבהן, והגישה שלך לרשימות ששותפו איתך. לא ניתן לשחזר את המידע לאחר המחיקה.
</div>
<form method="post" action="/delete-account">
  <label for="username">שם משתמש</label>
  <input id="username" name="username" autocomplete="username" required>
  <label for="password">סיסמה</label>
  <input id="password" name="password" type="password" autocomplete="current-password" required>
  <button type="submit">מחק את החשבון שלי לצמיתות</button>
</form>
"""
    return _page("מחיקת חשבון", APP_NAME, body)


def delete_account_done() -> str:
    body = """
<div class="success"><b>החשבון נמחק.</b> המשתמש, הרשימות והמוצרים שלך נמחקו לצמיתות.</div>
<p>אם האפליקציה עדיין מותקנת אצלך, אפשר להסיר אותה מהמכשיר.</p>
"""
    return _page("מחיקת חשבון", APP_NAME, body)


def privacy_policy() -> str:
    body = f"""
<p><small>עודכן לאחרונה: נובמבר 2026</small></p>
<p>מדיניות זו מסבירה איזה מידע האפליקציה {APP_NAME} (אפליקציה לניהול רשימות קניות) אוספת, למה,
ואיך ניתן למחוק אותו.</p>

<h2>איזה מידע נאסף</h2>
<ul>
  <li><b>פרטי חשבון:</b> שם משתמש, כתובת אימייל וסיסמה. הסיסמה נשמרת מוצפנת (hash) בלבד, ואיננו יכולים לראות אותה.</li>
  <li><b>תוכן שאתה יוצר:</b> רשימות קניות, המוצרים שבהן (שם, כמות, סימון "נקנה", סדר), ואילו משתמשים שותפו ברשימה.</li>
  <li><b>מידע שנשמר רק במכשיר שלך:</b> מפתח ההתחברות (כדי שלא תצטרך להתחבר בכל פעם) והעדפות מסך ההגדרות.</li>
</ul>
<p>האפליקציה אינה אוספת מיקום, אנשי קשר, תמונות או מידע פיננסי, ואינה מציגה פרסומות.</p>

<h2>למה המידע משמש</h2>
<p>אך ורק כדי להפעיל את השירות: לזהות אותך בהתחברות, לשמור את הרשימות שלך ולאפשר שיתוף רשימות עם משתמשים אחרים.</p>

<h2>שיתוף מידע</h2>
<p>איננו מוכרים ואיננו משתפים את המידע שלך עם צדדים שלישיים לצורכי פרסום או שיווק.
המידע נשמר בשרת ובמסד נתונים אצל ספקי אחסון ענן, המשמשים רק לתפעול השירות.
ספקים אלה עשויים לרשום מידע טכני כגון כתובת IP ביומני השרת. כאשר אתה משתף רשימה עם משתמש אחר,
אותו משתמש יראה את תוכן הרשימה.</p>

<h2>אבטחה</h2>
<p>התקשורת בין האפליקציה לשרת מוצפנת (HTTPS), והסיסמאות נשמרות מוצפנות בלבד.</p>

<h2>שמירת המידע ומחיקתו</h2>
<p>המידע נשמר כל עוד החשבון קיים. ניתן למחוק את החשבון וכל המידע הקשור אליו בכל עת:</p>
<ul>
  <li>מתוך האפליקציה: <b>הגדרות ← מחיקת חשבון</b></li>
  <li>או בדף האינטרנט: <a href="/delete-account">מחיקת חשבון</a></li>
</ul>
<p>במחיקה נמחקים לצמיתות המשתמש, כל הרשימות שיצרת והמוצרים שבהן, והגישה שלך לרשימות ששותפו איתך.</p>

<h2>ילדים</h2>
<p>האפליקציה אינה מיועדת לילדים מתחת לגיל 13, ואיננו אוספים ביודעין מידע מילדים.</p>

<h2>שינויים במדיניות</h2>
<p>אם המדיניות תשתנה, הגרסה המעודכנת תפורסם בדף זה עם תאריך עדכון חדש.</p>

<h2>יצירת קשר</h2>
<p>לשאלות בנושא פרטיות: <a href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a></p>
"""
    return _page("מדיניות פרטיות", APP_NAME, body)
