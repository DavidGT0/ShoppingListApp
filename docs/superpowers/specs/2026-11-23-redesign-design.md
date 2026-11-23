# ShopLi redesign: the route with "now in the department", light or dark mode, editable departments

**Status:** direction approved by the user on 2026-11-23, through browser mockups (`.superpowers/brainstorm/.../combo-v2.html`). The detailed doc awaits approval.

## Why
- The user feels the app looks very minimalist: sparse, generic, and missing elements.
- They asked for something creative that doesn't exist in other apps, and for a design that helps in the supermarket.
- Two real problems from the device check this design also solves:
  - Swiping right and left to mark or delete triggers by accident while scrolling.
  - The swipe component swallows pull-to-refresh. That was fixed in wave 5, but the swipe is still unwanted.

## Goals
1. One list screen that combines a **route** with a **"now in the department" focus**:
   - In "by department" mode the list is drawn as a route. Each department is a station on a dashed line, with an icon and a count (e.g. "1/3").
   - The **first department that still has unbought items** is enlarged into a gradient card, "עכשיו במחלקה", with large check circles.
   - When everything in it is checked, the card moves on to the next department.
   - A department with nothing left to buy collapses into a single line with ✓.
   - The header has a **progress ring**: bought out of the total, e.g. 3/12.
2. **Light or dark mode chosen by the user:**
   - A ☀/☾ button in the list screen header switches with one tap.
   - In Settings the choice is "בהיר / כהה / לפי הטלפון".
   - The choice is saved on the device.
   - Every screen supports both modes.
3. **Marking and deleting without swipes (option C):**
   - A check circle on every item.
   - A trash icon on every item (deletion keeps the existing "בטל").
   - Tapping the item name opens edit.
   - Swipeable is removed entirely.
4. **Department editing per list, shared by all its members:**
   - rename (including built-in departments), change the icon (from a set of emoji), reorder by dragging, add a department, delete a department (long press);
   - automatic classification keeps working after a rename, because the internal key is unchanged.
5. **A matching restyle of the other screens** in the same language: My Lists, Login, Settings, the edit window, the members window, the join window and the menu.
6. **The word is "מחלקות", not "תחנות".** The user rejected "תחנות", so it is "מחלקות" everywhere: the toggle ("לפי מחלקות"), "עכשיו במחלקה", "עריכת מחלקות".

## Non-goals
- Two separate screens for home and the store. The user rejected that: everything is on one screen.
- Per-member colours or avatars (from mockup B). They weren't chosen.
- Animations beyond the basics (a soft move when the focus card switches is fine).
- Changes to how live refresh, offline mode or the stale-response guard work. They must keep working as they do.

## Anti-goals (what would make this a failure)
- Losing any capability that exists today:
  - undo
  - suggestions
  - units and notes
  - "נוסף ע״י"
  - offline blocking
  - accessibility in Hebrew
  - manual ordering by drag
  - the bought-items section with its two buttons
- Text or controls that are unreadable in dark mode.
- Marking or deleting an item by accident.

## Approaches considered
| Approach | Description | Why it was / wasn't chosen |
|---|---|---|
| A. Route | Stations on a line, and a cart that fills up | Chosen as the base |
| B. Family board | Tiles, emoji, a colour per family member | Not chosen |
| C. Supermarket mode | Dark, a ring, "now in the department" | Its elements were merged into A |
| A+C on two screens | Planning at home, plus a separate supermarket mode | **Rejected by the user**: they want one screen, with light/dark as a separate choice |
| **A+C on one screen + theme** | The route, the focus card and the ring together, in light or dark | **Approved** |

## Decisions already made
- **Department order and names** are saved per list on the server and shared by every member of the list. A family list is usually for the same supermarket.
- **Manual sort mode** stays a drag list. It has no stations and no focus card, but uses the new item design (circle and trash).
- **Bought items** stay in the collapsible section at the bottom, with the two buttons "החזר הכל לרשימה" and "מחק את מה שנקנה".
- **The focus card** in "by department" mode only. Which department it shows follows the list's department order.
- **Theme:** the default is "לפי הטלפון" (the system setting).
- **Brand colours:**
  - Primary #1E6FE8, secondary #1FC9A3, navy #0F172A.
  - Dark mode uses a background around #0B1220, surfaces around #111A2E, and the same brand blue and green for actions.
  - Contrast must meet AA in both modes.

## Technical approach (for the builder)
- **Theme infrastructure:**
  - A `ThemeContext` holds `{ mode, colors, setMode }`. Light and dark palettes are built from `theme/colors.js`.
  - Every `*.styles.js` becomes a function of `colors`, e.g. `makeStyles(colors)` with `useMemo`, so the screens re-render when the mode changes.
  - The `@theme_mode` key in AsyncStorage holds `light`, `dark` or `system`. `useColorScheme` serves "system".
- **Server: department settings per list:**
  - A new table `list_category_settings` with `list_id`, `key` (a built-in key or `custom:<id>`), `name` (an optional override), `icon` (an optional emoji), `position`, and a unique key on (`list_id`, `key`).
  - `GET /lists/{id}/categories` also returns the ordered settings.
  - `PUT /lists/{id}/categories/layout` saves order, names and icons. It is open to every member of the list.
  - Custom categories also get an `icon`.
  - New tables are created with `create_all`. Any new columns go through `schema_upgrade.ensure_columns`.
  - Duplicating a list copies the settings.
- **App:**
  - `categories.js` provides a default emoji icon for each built-in department.
  - `resolveCategory` takes the list's settings into account (name, icon, order).
  - The live refresh also pulls the settings, so a change by one member reaches everyone.
- **"Edit departments" screen:** opened from the list's ⋮ menu. It reuses `DraggableFlatList`, with the pull-to-refresh fix from wave 5.
- **Offline:** every mutation (department editing included) is blocked with the existing alert. Switching the theme is local, so it is allowed offline.

## Verification
- TDD as in every wave.
- **On the user's phone over USB:** install, then take screenshots of every screen in both modes, with the user's approval (they include their lists). There is no emulator, but there is a phone.
- **The Appium test:** not updated (the user's decision since wave 4).

## Questions from the builder check, with my decisions (please review)
1. **Built-in departments cannot be deleted.**
   - A built-in department can only be renamed, re-iconed and reordered.
   - "אחר" can be renamed, but it always stays last.
   - Custom departments can be deleted, as today: the items in a deleted department go back to automatic classification.
   - Why: you asked to edit names and order. Deleting a built-in department would break automatic classification.
2. **Bought items leave their department and appear only in the "bought" section at the bottom, as today.**
   - The department counter ("1/3") and the ring do count bought items.
   - A department whose items have all been bought collapses into a single line with ✓, with no items under it.
3. **Only departments that have items appear on the route, as today.** A new list doesn't show 11 empty stations.
   - The header line ("N מחלקות") counts only those departments.
   - When everything has been bought, the "now in the department" card is replaced by a short "הכל בעגלה 🎉" card.
4. **Saving department edits:**
   - **One save:** pressing "סיום" in the edit screen sends one `PUT .../categories/layout` request with the full order, names and icons.
   - **Conflicts:** last write wins. Keys that no longer exist are ignored. Departments missing from the request are added at the end, in the default order.
   - **New and deleted departments:** adding a department uses the existing `POST` with an emoji icon (default 🛒). Deleting one uses the existing `DELETE`. Both apply right away, as today.
5. **Colours:**
   - The background of the round icon at each station uses the department's existing colour (from `categories.js`, or the server's colour for custom departments), as a pale tint in light mode and a darker tint in dark mode.
   - The emoji sits on top of it.
   - Text colour always comes from the theme, so contrast stays AA.
6. **The "now in the department" card replaces that department's regular rows** (no duplication). The card appears in "by department" mode only.

## Left to the builder
- Exact sizes, spacing and shadows, within the mockup's language.
- The emoji set for each built-in department, and the picker for choosing one.
- The breakdown into files and components.
- The exact transition animation of the focus card, if any.
