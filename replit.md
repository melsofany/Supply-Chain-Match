# TradeCore — General Supplies Procurement System

A full-stack procurement management system for a trading company. Manages the full demand-driven pipeline: Customers → Inquiries → Quotations → Customer POs → Supplier POs.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/procurement run dev` — run the frontend (port 18808)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (port via `PORT` env, base path `/api`)
- DB: PostgreSQL + Drizzle ORM
- Frontend: React + Vite + Wouter + TanStack Query + shadcn/ui
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth for API)
- `lib/api-zod/src/generated/` — generated Zod schemas (from codegen)
- `lib/api-client-react/src/generated/` — generated React Query hooks (from codegen)
- `lib/db/src/schema/` — Drizzle ORM schema (customers, suppliers, inquiries, quotations, purchase-orders)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/procurement/src/pages/` — React pages (dashboard, customers, suppliers, inquiries, quotations, customer-pos, supplier-pos)

## Architecture decisions

- Contract-first: OpenAPI spec → Zod schemas + React Query hooks via Orval codegen. Always run `pnpm --filter @workspace/api-spec run codegen` after editing the spec.
- Numeric DB columns (quantity, unitPrice, totalAmount) come back as strings from Postgres via Drizzle — always convert with `Number()` in route handlers.
- Status update handlers cast to `any` to bypass strict Zod enum literal types from generated code.
- Demand-driven (no inventory): pipeline is Inquiry → Quotation → Customer PO → Supplier PO.

## Product

- **Dashboard**: stats (open inquiries, pending quotations, active POs, revenue) + recent activity feed
- **Customers**: CRUD with search
- **Suppliers**: CRUD with category filter
- **Inquiries**: list + detail with line items; can create quotation from inquiry
- **Quotations**: list + detail with items & supplier pricing; approve/reject; create Customer PO from approved quotation
- **Customer POs**: received from customers; can create Supplier PO from a Customer PO
- **Supplier POs**: orders sent to vendors; status tracking

## User preferences

- Arabic-speaking user; business names and data can be in Arabic.

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI change before touching frontend code.
- Do not run `pnpm dev` at the workspace root — use workflows.
- `pnpm --filter @workspace/db run push` for schema changes (dev only). Use migrations in production.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
