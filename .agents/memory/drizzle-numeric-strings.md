---
name: Drizzle numeric column string casting
description: Drizzle ORM requires numeric/decimal column values to be passed as strings in insert/update operations, and returns them as strings on read.
---

## Rule
All `numeric()`/`decimal()` Drizzle columns (e.g. `totalAmount`, `unitPrice`, `quantity`, `taxInsuranceRate`, `operatingCost`) must be:
- **Insert/Update**: cast to `String()` before passing to Drizzle (e.g. `String(parsedData.totalAmount)`)
- **Read**: cast to `Number()` after reading from DB

## Why
Drizzle's TypeScript types for numeric columns accept `string | SQL | Placeholder` — passing a `number` directly causes TS2345 type errors. The DB driver also returns numeric values as strings.

## How to apply
Use `any` cast on the insert/update object and convert individual numeric fields:
```ts
const ins: any = { ...parsed.data };
if (ins.totalAmount != null) ins.totalAmount = String(ins.totalAmount);
if (ins.quantity != null) ins.quantity = String(ins.quantity);
await db.insert(table).values(ins);
```
On read:
```ts
totalAmount: row.totalAmount != null ? Number(row.totalAmount) : null
```
