

## Fix: Duplicate React Instance Crash (`useRef` is null)

### Problem
The app crashes with a blank screen because `useRef` is called on a `null` React instance. This happens when multiple React copies exist in the bundle — Radix UI's `TooltipProvider` gets a different React instance than the app.

### Root Cause
`vite.config.ts` lacks a `resolve.dedupe` setting, so Vite bundles separate React copies from different dependencies (likely `@tiptap/*` or Radix UI packages).

### Plan

**Single change — `vite.config.ts`:**
Add `resolve.dedupe: ["react", "react-dom", "react/jsx-runtime"]` to force all dependencies to share one React instance.

```typescript
resolve: {
  alias: {
    "@": path.resolve(__dirname, "./src"),
  },
  dedupe: ["react", "react-dom", "react/jsx-runtime"],
},
```

No other files need changes. This is a well-known Vite + Radix UI issue.

