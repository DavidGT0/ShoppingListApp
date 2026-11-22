# שיתוף רשימות עם עדכון חי — תוכנית עבודה

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** בעלים מזמין בני משפחה לרשימה עם קוד הזמנה, וכל שינוי ברשימה מופיע אצל כל המשתתפים תוך כ-3 שניות.

**Architecture:**
- **שרת (FastAPI):** טבלה חדשה `list_invites`, ו-6 נקודות קצה חדשות ב-`main.py`. הלוגיקה של הקודים ושל הגבלת הניסיונות נמצאת בקובץ נפרד, `sharing.py`.
- **אפליקציה (React Native):** hook בשם `useLiveRefresh` מבצע בדיקה תקופתית, רק כשהמסך בפוקוס והאפליקציה בחזית. יש שני חלונות חדשים: `MembersModal` ו-`JoinListModal`.

**Tech Stack:** FastAPI + SQLAlchemy + pytest (שרת). React Native 0.86 + React Navigation 7 + Jest + react-test-renderer (אפליקציה).

**Spec:** `docs/superpowers/specs/2026-11-22-list-sharing-design.md`

## Global Constraints
- **הודעות:** כל הודעה למשתמש בעברית, גם מהשרת וגם מהאפליקציה.
- **פרטיות:** לא מחזירים מייל של משתמש באף נקודת קצה של שיתוף. רק `id`, `username` ו-`is_owner`.
- **קוד הזמנה:** 6 תווים מתוך האלפבית `ABCDEFGHJKMNPQRSTUVWXYZ23456789`, כלומר 31 תווים. נוצר עם `secrets.choice`. הקלט לא תלוי באותיות גדולות או קטנות, ורווחים מסביב מוסרים.
- **הגבלת ניסיונות:** 10 הצטרפויות עם קוד שגוי בתוך 600 שניות, לכל משתמש. מעבר לזה מוחזר 429.
- **קצב רענון:** 3000ms במסך הרשימה, 15000ms ב"הרשימות שלי". רק כשהמסך בפוקוס **וגם** `AppState === 'active'`.
- **טבלאות קיימות:** אסור לשנות. רק טבלה חדשה, כי `create_all` לא מוסיף עמודות.
- **TDD:** בדיקה שנכשלת לפני כל קוד. בסוף כל משימה כל הבדיקות ירוקות:
  - שרת: `cd ShoppingListServer && pytest`
  - אפליקציה: `cd ShoppingListFront && npx jest`
- **סופי שורות:** לשמור על הפורמט שב-git. קבצי השרת והאפליקציה הם LF. לבדוק עם `git diff --stat` לפני כל קומיט.
- **קומיטים:** קומיט **מקומי** בסוף כל משימה. דחיפה ל-GitHub רק באישור המשתמש, בסוף.

## Review Focus
1. **רענון שחוזר אחרי שהמסך נסגר:** לא קורס ולא מדפיס אזהרות. הבדיקה במשימה 5.
2. **רענון כשאין רשת או שהשרת "ישן":** שקט. בלי Alert, והנתונים האחרונים נשארים על המסך. הבדיקה במשימה 6.
3. **הדבקת כל הודעת הוואטסאפ לשדה הקוד, במקום רק הקוד:** הקוד מחולץ ממנה. הבדיקה במשימה 7.
4. **הבעלים מוחק רשימה בזמן שמשתתף בתוכה:** הרענון מקבל 404, מוצגת הודעה אחת, וחוזרים אחורה. הבדיקה במשימה 6.
5. **המשתמש סוגר את חלון השיתוף בלי לשלוח:** בלי הודעת שגיאה. הבדיקה במשימה 8.

---

## מבנה קבצים
| קובץ | אחריות |
|---|---|
| `ShoppingListServer/sharing.py` (חדש) | `generate_invite_code`, `normalize_invite_code`, `JoinAttemptLimiter` |
| `ShoppingListServer/models.py` | המודל `ListInvite`, והקשר `ShoppingList.invite` |
| `ShoppingListServer/main.py` | 6 נקודות קצה, ו-`join_limiter` ברמת המודול |
| `ShoppingListServer/tests/test_sharing.py` (חדש) | בדיקות השרת למשימות 1 עד 3 |
| `ShoppingListServer/tests/conftest.py` | איפוס `main.join_limiter` ב-fixture של `client` |
| `ShoppingListFront/src/services/api.js` | 6 פונקציות API חדשות, ו-`status` על השגיאה של `getShoppingList` |
| `ShoppingListFront/src/services/inviteCode.js` (חדש) | `extractInviteCode(text)` |
| `ShoppingListFront/src/hooks/useLiveRefresh.js` (חדש) | הבדיקה התקופתית |
| `ShoppingListFront/src/components/JoinListModal/` (חדש) | חלון ההצטרפות עם קוד, + `.styles.js` |
| `ShoppingListFront/src/components/MembersModal/` (חדש) | חלון המשתתפים, + `.styles.js` |
| `ShoppingListFront/src/screens/ShoppingListScreen/ShoppingListScreen.js` | רענון חי, כפתור 👥, אובדן גישה |
| `ShoppingListFront/src/screens/MyListsScreen/MyListsScreen.js` | רענון חי, קישור הצטרפות, העברת `isOwner` בניווט |

---

### Task 1: שרת — קוד הזמנה (יצירה, קבלה, איפוס)

**Files:**
- Create: `ShoppingListServer/sharing.py`, `ShoppingListServer/tests/test_sharing.py`
- Modify: `ShoppingListServer/models.py`, `ShoppingListServer/main.py`

**Interfaces:**
- Produces:
  - `sharing.INVITE_ALPHABET: str`, `sharing.INVITE_CODE_LENGTH = 6`
  - `sharing.generate_invite_code() -> str`
  - `sharing.normalize_invite_code(raw: str) -> str` (strip + upper)
  - `models.ListInvite(list_id PK/FK shopping_lists.id, code String(16) unique index, created_at DateTime)`
  - `ShoppingList.invite = relationship("ListInvite", uselist=False, cascade="all, delete-orphan")`
  - `POST /lists/{list_id}/invite -> {"code": str}`
  - `POST /lists/{list_id}/invite/reset -> {"code": str}`

- [ ] **Step 1: בדיקות שנכשלות** ב-`tests/test_sharing.py`:
  - `test_generated_code_uses_only_unambiguous_characters`: 200 קודים, כל אחד באורך 6, וכל תו בתוך `INVITE_ALPHABET`. אין אף אחד מהתווים `0`, `O`, `1`, `I`, `L`.
  - `test_owner_gets_a_stable_invite_code`: שתי קריאות ל-`POST /lists/{id}/invite` מחזירות 200 ואותו `code`.
  - `test_reset_replaces_the_code`: אחרי `reset` חוזר קוד שונה, ו-`invite` מחזיר את הקוד החדש.
  - `test_only_the_owner_can_get_or_reset_the_code`: משתתף שהצטרף עם `POST /lists/share` (קיים), או משתמש זר, מקבל 403 בשתי הנקודות.
  - `test_deleting_a_list_deletes_its_invite`: אחרי `DELETE /lists/{id}` אין רשומה ב-`ListInvite`.
- [ ] **Step 2: להריץ** `pytest tests/test_sharing.py`. Expected: FAIL (`ModuleNotFoundError: sharing`, ואחר כך 404).
- [ ] **Step 3: לממש** את `sharing.py`, את המודל ואת שתי הנקודות.
  - הקוד נוצר עם `secrets.choice`.
  - בהתנגשות עם קוד קיים: לנסות שוב, עד 5 פעמים.
- [ ] **Step 4: להריץ** את כל ה-`pytest`. Expected: הכול PASS.
- [ ] **Step 5: קומיט מקומי:** `Add list invite codes (server)`

### Task 2: שרת — הצטרפות עם קוד והגבלת ניסיונות

**Files:** Modify `sharing.py`, `main.py`, `tests/conftest.py`, `tests/test_sharing.py`

**Interfaces:**
- Consumes: `normalize_invite_code`, `ListInvite` (Task 1)
- Produces:
  - `sharing.JoinAttemptLimiter(max_failures=10, window_seconds=600)` עם המתודות:
    - `.is_blocked(user_id: int, now: float) -> bool`
    - `.record_failure(user_id: int, now: float) -> None`
    - `.reset() -> None`
  - `main.join_limiter`, מופע ברמת המודול.
  - `POST /lists/join` עם `{"code": str}`. מחזיר `ShoppingListResponse` עם `is_owner=False`.

- [ ] **Step 1: ב-`conftest.py`:** ה-fixture של `client` קורא ל-`main.join_limiter.reset()`. **בדיקות שנכשלות:**
  - `test_join_with_code_adds_me_as_member`: התשובה מכילה `{"id": list_id, "is_owner": False}`, והרשימה מופיעה ב-`GET /lists` של המצטרף עם `is_owner False`.
  - `test_join_ignores_case_and_spaces`: הקוד באותיות קטנות, עם רווחים מסביב, מחזיר 200.
  - `test_joining_twice_does_not_duplicate`: אחרי שתי הצטרפויות יש שורה אחת בטבלה `shared_lists`.
  - `test_owner_joining_own_list_gets_400`: `detail == "זו הרשימה שלך"`.
  - `test_unknown_code_gets_404`: `detail == "קוד ההזמנה לא נמצא"`.
  - `test_old_code_stops_working_after_reset`: 404.
  - `test_too_many_wrong_codes_get_429`: 10 קודים שגויים מחזירים 404. ה-11 מחזיר 429 עם `detail == "יותר מדי ניסיונות, נסה שוב בעוד כמה דקות"`, **גם עם קוד נכון**. משתמש אחר לא חסום.
  - `test_limiter_forgets_old_failures`: בדיקת יחידה של `JoinAttemptLimiter`, עם `now` מוזרק. אחרי 601 שניות המשתמש כבר לא חסום.
- [ ] **Step 2: להריץ.** Expected: FAIL.
- [ ] **Step 3: לממש.** סדר הבדיקות בנקודה:
  1. חסום: מחזירים 429.
  2. הקוד לא נמצא: רושמים כישלון ומחזירים 404.
  3. המצטרף הוא הבעלים: 400.
  4. אחרת: מוסיפים אותו ל-`shared_users` אם הוא עוד לא שם.
- [ ] **Step 4: להריץ את כל ה-`pytest`.** Expected: PASS.
- [ ] **Step 5: קומיט מקומי:** `Join a list with an invite code (server)`

### Task 3: שרת — משתתפים, הוצאה ועזיבה

**Files:** Modify `main.py`, `tests/test_sharing.py`

**Interfaces:**
- Produces:
  - `GET /lists/{list_id}/members -> [{"id": int, "username": str, "is_owner": bool}]`. הבעלים ראשון, אחריו המשתתפים לפי `username`.
  - `DELETE /lists/{list_id}/members/{user_id} -> {"message": str}`. רק לבעלים.
  - `POST /lists/{list_id}/leave -> {"message": str}`. רק למשתתף.

- [ ] **Step 1: בדיקות שנכשלות:**
  - `test_members_lists_owner_first_without_emails`: לכל פריט יש בדיוק את המפתחות `{"id", "username", "is_owner"}`. גם הבעלים וגם המשתתף יכולים לקרוא. זר מקבל 403.
  - `test_owner_removes_member`: מחזיר 200. אחרי זה המשתתף מקבל 403 ב-`GET /items?list_id=` והרשימה לא מופיעה ב-`/lists` שלו.
  - `test_member_cannot_remove_others`: 403.
  - `test_member_leaves`: מחזיר 200, ואז 403 על `/items`.
  - `test_owner_cannot_leave`: 400 עם `detail == "הבעלים לא יכול לעזוב את הרשימה"`.
  - `test_deleting_owner_account_removes_lists_invites_and_memberships`: משלים את הבדיקות הקיימות. אחרי מחיקת חשבון הבעלים אין `ListInvite` ואין שורות `shared_lists` שלו.
- [ ] **Step 2: להריץ.** Expected: FAIL.
- [ ] **Step 3: לממש** את שלוש הנקודות. רשימה שלא קיימת מחזירה 404, עם ההודעה הקיימת בקוד.
- [ ] **Step 4: להריץ את כל ה-`pytest`.** Expected: PASS.
- [ ] **Step 5: קומיט מקומי:** `List members, remove member and leave list (server)`

### Task 4: אפליקציה — פונקציות API לשיתוף וחילוץ קוד

**Files:**
- Modify: `src/services/api.js`
- Create: `src/services/inviteCode.js`, `__tests__/api.sharing.test.js`

**Interfaces:**
- Produces:
  - **ב-`api.js`:** כל הפונקציות זורקות `Error` עם הודעה מ-`readErrorMessage`, ומוסיפות את המאפיין `status`.
    - `getInviteCode(listId) -> Promise<string>`
    - `resetInviteCode(listId) -> Promise<string>`
    - `joinListByCode(code) -> Promise<{id, name, owner_id, is_owner}>`
    - `getListMembers(listId) -> Promise<Array<{id, username, is_owner}>>`
    - `removeListMember(listId, userId) -> Promise<void>`
    - `leaveList(listId) -> Promise<void>`
  - `getShoppingList` זורק שגיאה עם `error.status`, כלומר קוד התשובה של השרת.
  - **ב-`inviteCode.js`:** `extractInviteCode(text: string) -> string`. מחזיר את המופע **האחרון** של `[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}`, כמילה שלמה, בתוך `text.toUpperCase()`. אם אין התאמה, מחזיר את הטקסט אחרי trim והמרה לאותיות גדולות.

- [ ] **Step 1: בדיקות שנכשלות** (ה-fetch במוק, כמו ב-`auth.test.js`):
  - `joinListByCode posts the code to /lists/join`
  - `joinListByCode throws the server's Hebrew message`: 404 עם `detail` "קוד ההזמנה לא נמצא".
  - `getShoppingList error carries the HTTP status`: 403 מוביל ל-`status === 403`.
  - `getListMembers returns the array`.
  - `extractInviteCode finds the code inside the full WhatsApp message`: על טקסט ההודעה מה-spec, עם `K7M2Q9`, מחזיר `"K7M2Q9"`. המילה SHOPLI לא נתפסת, כי יש בה I, L ו-O.
  - `extractInviteCode accepts a lowercase code with spaces`: `" k7m2q9 "` מחזיר `"K7M2Q9"`.
- [ ] **Step 2: להריץ** `npx jest __tests__/api.sharing.test.js`. Expected: FAIL.
- [ ] **Step 3: לממש.**
- [ ] **Step 4: להריץ את כל ה-`npx jest`.** Expected: PASS.
- [ ] **Step 5: קומיט מקומי:** `Sharing API calls and invite code parsing (app)`

### Task 5: אפליקציה — `useLiveRefresh`

**Files:** Create `src/hooks/useLiveRefresh.js`, `__tests__/useLiveRefresh.test.js`

**Interfaces:**
- Produces: `useLiveRefresh(refresh: () => Promise<void>, intervalMs: number, options?: { paused?: boolean }) -> void`
  - כשהמסך עובר לפוקוס, או כשהאפליקציה חוזרת ל-`active`: קורא ל-`refresh` מיד, ואחר כך כל `intervalMs`.
  - כשהמסך יוצא מפוקוס, כשהאפליקציה עוברת ל-`background` או `inactive`, או כש-`paused`: עוצר.
  - לא קורא שוב לפני שהקריאה הקודמת הסתיימה.
  - בולע שגיאות של `refresh`.

- [ ] **Step 1: בדיקות שנכשלות** (שעון מדומה, מוק ל-`useFocusEffect` כך שירוץ כמו `useEffect`, ומוק ל-`AppState.addEventListener`):
  - `refreshes immediately and then every interval`: הקריאה הראשונה מיד, ואחרי `3*interval` יש 4 קריאות.
  - `does not stack calls while a refresh is still running`: כש-`refresh` מחזיר הבטחה שלא נגמרת, יש רק קריאה אחת.
  - `stops in background and refreshes immediately when back to active`
  - `paused stops refreshing until unpaused`
  - `unmounting during a pending refresh does not warn`: ה-spy על `console.error` לא נקרא. **(Review Focus 1)**
- [ ] **Step 2: להריץ.** Expected: FAIL (המודול לא קיים).
- [ ] **Step 3: לממש.** שימוש ב-`useFocusEffect` מ-`@react-navigation/native`, ב-`AppState`, ב-`setTimeout` שרשורי (לא `setInterval`), וב-`useRef` לדגל "קריאה בתהליך".
- [ ] **Step 4: להריץ את כל ה-`npx jest`.** Expected: PASS.
- [ ] **Step 5: קומיט מקומי:** `useLiveRefresh hook (app)`

### Task 6: אפליקציה — רענון חי במסך הרשימה

**Files:** Modify `ShoppingListScreen.js`, `__tests__/ShoppingListScreen.test.js`

**Interfaces:**
- Consumes: `useLiveRefresh` (Task 5), `getShoppingList` עם `error.status` (Task 4)
- Produces:
  - המסך קורא מ-`route.params` את `isOwner` (ברירת מחדל `true`). הוא מועבר לחלון המשתתפים במשימה 8.
  - `LIVE_REFRESH_MS = 3000`

- [ ] **Step 1: בדיקות שנכשלות** (מוק ל-`useLiveRefresh` שחושף את ה-`refresh` שקיבל, כדי שהבדיקה תפעיל אותו ידנית):
  - `a refresh shows an item another family member added`
  - `a refresh that started before my own change is discarded`: הרענון מתחיל, אחריו `onTogglePurchased` מסתיים, ואחריו הרענון חוזר עם מידע ישן. המוצר נשאר מסומן.
  - `losing access (403 or 404) shows one message and goes back`: `Alert.alert` נקרא פעם אחת עם "אין לך יותר גישה לרשימה הזו", ו-`navigation.goBack` נקרא. נבדק עם 403 ועם 404. **(Review Focus 4)**
  - `a network error during refresh is silent and keeps the items`: אין Alert, והמוצרים עדיין מוצגים. **(Review Focus 2)**
  - `refresh is paused while dragging`: `onDragBegin` מוביל ל-`useLiveRefresh` עם `paused: true`, ו-`onDragEnd` מחזיר ל-`false`.
- [ ] **Step 2: להריץ.** Expected: FAIL.
- [ ] **Step 3: לממש.**
  - `mutationVersion` ב-`useRef`: עולה בתחילת כל פעולה ובסופה. הפעולות: הוספה, סימון, כמות, עריכה, מחיקה וגרירה.
  - הרענון לוכד את הגרסה לפני הבקשה, ומתעלם מהתשובה אם הגרסה השתנתה.
  - `refreshing` ו-`onRefresh` עוברים ל-`DraggableFlatList`, למשיכה לרענון.
- [ ] **Step 4: להריץ את כל ה-`npx jest`.** Expected: PASS.
- [ ] **Step 5: קומיט מקומי:** `Live refresh on the list screen (app)`

### Task 7: אפליקציה — "הרשימות שלי": רענון חי והצטרפות עם קוד

**Files:**
- Create: `src/components/JoinListModal/JoinListModal.js` + `.styles.js`, `__tests__/JoinListModal.test.js`
- Modify: `MyListsScreen.js`, `__tests__/MyListsScreen.test.js`

**Interfaces:**
- Consumes: `joinListByCode`, `extractInviteCode` (Task 4), `useLiveRefresh` (Task 5)
- Produces:
  - `<JoinListModal visible onClose onJoined={(list) => void} />`. בתוכו `testID`: `join_code_input` ו-`join_submit_button`.
  - קישור בשם `join_list_link` ב-MyListsScreen.
  - הניווט ל-`ShoppingListItems` מעביר `{ listId, listName, isOwner: item.is_owner !== false }`.

- [ ] **Step 1: בדיקות שנכשלות:**
  - **JoinListModal:**
    - `pasting the whole WhatsApp message joins with the extracted code`: `joinListByCode` נקרא עם `"K7M2Q9"`. **(Review Focus 3)**
    - `a server error is shown and the dialog stays open`
    - `empty input shows an error without calling the server`
  - **MyListsScreen:**
    - `joining adds the list with a shared badge and opens it`: `navigate` נקרא עם `isOwner: false`.
    - `live refresh replaces the lists`: רשימה שנוספה בשרת מופיעה, ורשימה שהוסרו ממנה נעלמת.
    - `opening a list passes isOwner`
- [ ] **Step 2: להריץ.** Expected: FAIL.
- [ ] **Step 3: לממש.**
  - `useLiveRefresh(refreshLists, 15000)`.
  - `RefreshControl` ב-FlatList.
  - החלון בסגנון החלונות הקיימים.
- [ ] **Step 4: להריץ את כל ה-`npx jest`.** Expected: PASS.
- [ ] **Step 5: קומיט מקומי:** `Join a list with a code and live refresh on My Lists (app)`

### Task 8: אפליקציה — חלון המשתתפים וכפתור 👥

**Files:**
- Create: `src/components/MembersModal/MembersModal.js` + `.styles.js`, `__tests__/MembersModal.test.js`
- Modify: `ShoppingListScreen.js`, `__tests__/ShoppingListScreen.test.js`

**Interfaces:**
- Consumes: `getListMembers`, `getInviteCode`, `resetInviteCode`, `removeListMember`, `leaveList` (Task 4). `isOwner` מ-route (Task 6).
- Produces:
  - `<MembersModal visible listId listName isOwner onClose onLeft />`. בתוכו `testID`:
    - `invite_button`
    - `reset_code_button`
    - `remove_member_<id>`
    - `leave_list_button`
  - כפתור `members_button` בכותרת המסך, שמציג את מספר המשתתפים.

- [ ] **Step 1: בדיקות שנכשלות:**
  - `owner sees invite, reset and remove; member sees only leave`
  - `invite opens the share sheet with the list name and code`: `Share.share` נקרא עם `message` שמכיל את שם הרשימה ואת `K7M2Q9`.
  - `dismissing the share sheet shows no error`: `Share.share` מחזיר `{ action: Share.dismissedAction }`, ו-Alert לא נקרא. **(Review Focus 5)**
  - `remove asks for confirmation and refreshes the members`
  - `leave asks for confirmation and calls onLeft`: במסך הרשימה, `onLeft` מוביל ל-`navigation.goBack`.
  - `header shows the member count`: עם שני משתתפים, הכפתור מציג "2".
  - `closing the dialog reloads the count`: אחרי שהבעלים מוציא משתתף וסוגר את החלון, המספר יורד ל-"1".
- [ ] **Step 2: להריץ.** Expected: FAIL.
- [ ] **Step 3: לממש.**
  - **טקסט ההודעה המדויק מה-spec:**
    ```
    הצטרפו לרשימת הקניות "<שם>" שלי ב-ShopLi 🛒
    באפליקציה: הרשימות שלי ← "הצטרפות עם קוד" ← הקוד: <CODE>
    ```
  - אישור (Alert) לפני: יצירת קוד חדש, הסרת משתתף, ועזיבה.
- [ ] **Step 4: להריץ את כל ה-`npx jest`.** Expected: PASS.
- [ ] **Step 5: קומיט מקומי:** `Members dialog and invite sharing (app)`

### Task 9: אימות כולל ומסירה

- [ ] **Step 1:** `pytest` בשרת ו-`npx jest` באפליקציה. כולם PASS, ובלי אזהרות בפלט.
- [ ] **Step 2:** `npx eslint App.js src __tests__ jest.setup.js jest.config.js`. 0 שגיאות, ומספר האזהרות לא גדל מעבר ל-12.
- [ ] **Step 3:** בניית bundle (`react-native bundle`) לתיקייה זמנית, ו-`gradlew assembleRelease`. שני הצעדים מסתיימים בהצלחה.
- [ ] **Step 4:** סופי שורות זהים ל-git בכל קובץ שהשתנה. `git status` נקי.
- [ ] **Step 5:** סיכום למשתמש ובקשת אישור לדחיפה. אחרי Deploy: בדיקה בשרת החי ש-`/openapi.json` מכיל את `/lists/join`, ושהנקודות החדשות דוחות בקשה בלי התחברות (401).
