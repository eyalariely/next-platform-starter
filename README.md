# Smart Folio

מערכת עצמאית לניהול, ניתוח וקבלת החלטות בתיק השקעות. Next.js + TypeScript,
Hebrew RTL, מנועי חישוב פיננסיים דטרמיניסטיים, ושכבת AI נפרדת המיועדת
להסברים בלבד (לעולם לא לחישוב).

הפרויקט בנוי בשלבים (ראו `docs/DEVELOPMENT_PLAN.md`); **שלב 1 — תשתית —
הושלם**.

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4 + shadcn/ui (רכיבי UI נכתבו ידנית — ראו "הערות" למטה)
- PostgreSQL + Prisma ORM
- Auth.js (NextAuth v5) — ראו "החלטת ארכיטקטורה: Auth" למטה
- Zod לוולידציה
- Vitest (unit) + Playwright (E2E)
- Recharts לגרפים

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

- `MARKET_DATA_API_KEY` — יחובר ב-`src/lib/market/` (שלב 2)
- `AI_API_KEY` — יחובר ב-`src/lib/ai/` (שלב 10)

## מגבלות ידועות (שלב 1)

- מסכי Portfolio/Holdings/Performance/Risk/Scenarios/Optimization/
  Watchlist/Investment Plan/Macro/Advisor הם placeholders בלבד (הניווט
  מחובר במלואו; המימוש בפועל מגיע בשלבים 2–10 לפי `docs/DEVELOPMENT_PLAN.md`).
- לא בוצע חיבור בפועל למסד נתונים/Supabase — נדרש `DATABASE_URL` אמיתי
  כדי להריץ `db:push`/`db:seed`/`dev` בפועל.
- shadcn/ui CLI לא היה נגיש מסביבת הרשת הזו (`ui.shadcn.com` חסום ע"י
  מדיניות הרשת); רכיבי `src/components/ui/*` נכתבו ידנית לפי אותה
  קונבנציה (Radix + `cva` + `cn`) כך ש-`npx shadcn add <component>` יעבוד
  כרגיל בהמשך.
- בדיקות E2E (Playwright) מוגדרות אך לא הורצו בפועל בסביבה זו (דורשות
  DB מאותחל ומחובר).

הצהרה: המערכת מספקת כלי ניתוח ותמיכה בקבלת החלטות ואינה מהווה ייעוץ
השקעות.
