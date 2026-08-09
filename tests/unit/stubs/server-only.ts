// Vitest stub for the `server-only` package.
//
// The real package throws unconditionally unless resolved under Next.js's
// "react-server" export condition, which Vite/Vitest never sets. Aliasing
// it to this no-op lets us unit-test server modules directly without
// pulling in a full Next.js server runtime.
export {};
