# Phase B — Codemod Inventory

## Summary
- Files modified: 155 (codemod) + authStore.js (selectors) = 156 src files
- Bare `const { … } = useAuthStore()` calls before: 168
- Bare `const { … } = useAuthStore()` calls after: 0 ✓
- Single-field swapped to typed selector: 108 calls
- Multi-field wrapped in `useAuthStore(useShallow(…))`: 60 calls
- Files now importing `useShallow`: 59
- Files now using typed selectors: ~108

## Verification
- Babel parse-check: 155/155 PASS
- Red-flag scan (destructure-off-selector): 0 hits
- Selector pattern count (`useAuthStore((s) =>`): 160 (untouched from original 208 — diff is 48 paren-less `s =>` style calls that were already there)

## Imports kept clean
- `useAuthStore` still imported in files that retain selector-pattern OR `getState()` calls
- `useAuthStore` removed from files that became 100% typed-selector
