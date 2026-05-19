# Phase A — Consumer Category Breakdown

## Call-site totals

- Total `useAuthStore(...)` call sites: **376** across **262 files**
- Selector-pattern calls (`useAuthStore((s) => s.foo)`): **208** ✓ already efficient
- Bare-destructuring calls (`const { ... } = useAuthStore()`): **168** ⚠ storm contributor
- Typed-selector hook usage (useAuthUser, useAuthProfile, …): **0**

## Bare-destructuring breakdown (the 168)

| Destructured fields | Count | Recommended replacement |
|---|---|---|
| `{ profile }` | 87 | `useAuthProfile()` |
| `{ profile, studentData }` | 39 | keep bare + add `shallow` (or two selector calls) |
| `{ studentData }` | 12 | `useAuthStudentData()` |
| `{ user }` | 8 | `useAuthUser()` |
| `{ user, profile }` | 4 | shallow OR two selector calls |
| `{ profile, trainerData }` | 3 | shallow |
| `{ profile, impersonation }` | 3 | shallow |
| `{ user, studentData }` | 1 | shallow |
| `{ user, profile, studentData, signOut }` | 1 | keep bare (action + 3 fields) |
| `{ user, profile, loading: authLoading }` | 1 | shallow |
| `{ user, profile, _realProfile }` | 1 | shallow |
| `{ startImpersonation, impersonation }` | 1 | keep bare (action + field) |
| `{ profile: currentUser }` | 1 | `useAuthProfile()` (rename at use) |
| `{ profile, user }` | 1 | shallow |
| `{ profile, studentData, signOut }` | 1 | keep bare |
| `{ profile, studentData, fetchProfile, user }` | 1 | keep bare |
| `{ profile, studentData, fetchProfile }` | 1 | keep bare |
| `{ profile, signOut }` | 1 | keep bare |
| `{ profile, impersonation, _realProfile }` | 1 | keep bare |
| **TOTAL** | **168** | |

## Aggregate categorization

- **Single-field, swap to existing typed selector**: 108 calls (87 + 12 + 8 + 1)
- **Two-field, candidate for `shallow` or split**: 51 calls (39 + 4 + 3 + 3 + 1 + 1)
- **Action-bearing or 3+ field — keep bare with `shallow`**: 9 calls
