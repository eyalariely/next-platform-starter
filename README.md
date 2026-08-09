# Smart Folio

מערכת עצמאית לניהול, ניתוח וקבלת החלטות בתיק השקעות. Next.js + TypeScript,
Hebrew RTL, מנועי חישוב פיננסיים דטרמיניסטיים, ושכבת AI נפרדת המיועדת
להסברים בלבד (לעולם לא לחישוב).

הפרויקט בנוי בשלבים (ראו `docs/DEVELOPMENT_PLAN.md`); **שלבים 1–2 הושלמו**
(תשתית + ליבת ניהול תיק/עסקאות/Holdings Engine/Market Data).

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4 + shadcn/ui (רכיבי UI נכתבו ידנית — ראו "הערות" למטה)
- PostgreSQL + Prisma ORM
- Auth.js (NextAuth v5) — ראו "החלטת ארכיטקטורה: Auth" למטה
- Zod לוולידציה
- Vitest (unit) + Playwright (E2E)
- Recharts לגרפים
- Papa Parse (CSV) + ExcelJS (XLSX) לייבוא עסקאות
- MarketDataProvider: Alpha Vantage (ברירת מחדל) + mock לפיתוח בלבד

## הרצה מקומית

```bash
npm install
cp env.example .env       # מלא DATABASE_URL ו-AUTH_SECRET לפחות
npx auth secret           # ליצירת AUTH_SECRET
npm run db:push           # יוצר את הסכמה במסד הנתונים
npm run db:seed           # (אופציונלי) יוצר משתמש פיתוח: dev@smartfolio.local / dev-password-123
npm run dev
```

## סקריפטים

| פקודה | תיאור |
|---|---|
| `npm run dev` | שרת פיתוח |
| `npm run build` | build ל-production |
| `npm run typecheck` | בדיקת TypeScript ללא emit |
| `npm run lint` | ESLint |
| `npm run test` | בדיקות Unit (Vitest) |
| `npm run test:e2e` | בדיקות E2E (Playwright) |
| `npm run db:push` / `db:migrate` / `db:studio` / `db:seed` | Prisma |

## מבנה תיקיות

```
src/
  app/            # Next.js App Router — (auth) ו-(app) route groups
  components/      # UI (shadcn-style) + רכיבי דומיין לפי מסך
  lib/             # db client, auth config, financial/risk/market/ai engines
  services/        # data-access מבודד לפי user_id
  hooks/ types/ validators/
prisma/
  schema.prisma    # סכמת מסד הנתונים המלאה (§4 בספסיפיקציה)
  seed.ts          # seed לפיתוח בלבד — לא רץ ב-production
tests/
  unit/  e2e/
```

## החלטת ארכיטקטורה: Auth

הספסיפיקציה המקורית מציינת Supabase ל-Auth "אם מתאים". לא היו זמינים
פרטי פרויקט/מפתחות Supabase בסביבה זו, ולכן נבחר **Auth.js (NextAuth v5)
עם Prisma Adapter** — פתרון self-hosted מלא שדורש רק `DATABASE_URL`
ו-`AUTH_SECRET` (שני ה-secrets נשארים Server Side בלבד, כנדרש בסעיף 62).
המעבר ל-Supabase Auth בעתיד הוא שינוי מבודד בקובץ `src/lib/auth.ts` בלבד.

## Environment Variables

ראו `env.example`. שני משתנים חסרים במכוון (מפתחות API חיצוניים לא
סופקו) אך שכבת ה-abstraction עבורם כבר קיימת במבנה התיקיות:

- `MARKET_DATA_API_KEY` — Alpha Vantage adapter מוכן, נופל בחזרה ל-mock
  בפיתוח בלבד ללא key (`src/lib/market/`)
- `AI_API_KEY` — יחובר ב-`src/lib/ai/` (שלב 10)

## מגבלות ידועות

- מסכי Performance/Risk/Scenarios/Optimization/Watchlist/Investment
  Plan/Macro/Advisor הם placeholders בלבד; `/securities/[ticker]` הוא
  Skeleton (המימוש המלא מגיע בשלבים 3–10 לפי `docs/DEVELOPMENT_PLAN.md`).
- לא בוצע חיבור בפועל למסד נתונים — נדרש `DATABASE_URL` אמיתי כדי להריץ
  `db:push`/`db:seed`/`dev` ולבדוק את הזרימה המלאה (כולל בדיקות E2E).
- shadcn/ui CLI לא היה נגיש מסביבת הרשת הזו (`ui.shadcn.com` חסום ע"י
  מדיניות הרשת); רכיבי `src/components/ui/*` נכתבו ידנית לפי אותה
  קונבנציה (Radix + `cva` + `cn`) כך ש-`npx shadcn add <component>` יעבוד
  כרגיל בהמשך.
- **XLSX**: נבחר `exceljs` במקום `xlsx` (SheetJS) — לחבילת `xlsx` בגרסת
  ה-npm הנוכחית יש שתי חולשות אבטחה בחומרה "high" (Prototype Pollution +
  ReDoS) הרלוונטיות בדיוק לניתוח קבצים שמשתמשים מעלים. `exceljs` נושא
  חולשה טרנזיטיבית "moderate" (uuid) שאינה נגישה דרך נתיב ניתוח הקובץ.
- ייבוא CSV/XLSX הוא Stateless בין שלבי ה-Wizard (השורות המפוענחות עוברות
  הלוך-חזור ב-JSON בין הלקוח לשרת, לא נשמרות ב-DB כ-"pending import") —
  פשוט ומספיק לגודל תיק אישי טיפוסי (מוגבל ל-2000 שורות), אך לא מתאים
  לקבצים ענקיים.
- Holdings Engine מניח שכל העסקאות של נייר נתון עקביות מספיק כדי לחשב
  עלות ממוצעת יחידה (`costCurrency`); עסקה במטבע שונה מטופלת ומומרת, אך
  אם חסר שער חליפין להמרה — הנייר מסומן ב-warning ולא נכלל בחישובי
  Base Currency (לעולם לא מאופס בשקט).
- בדיקות E2E (Playwright) נכתבו (`tests/e2e/`) אך לא הורצו בפועל בסביבה
  זו (דורשות DB מאותחל, seed, ושרת dev פעיל).

הצהרה: המערכת מספקת כלי ניתוח ותמיכה בקבלת החלטות ואינה מהווה ייעוץ
השקעות.
