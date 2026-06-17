---
name: pdfkit esbuild bundling
description: pdfkit and fontkit must be externalized in the esbuild config or runtime will fail with missing @swc/helpers dep
---

## Rule
In `artifacts/api-server/build.mjs`, add `"pdfkit"` and `"fontkit"` to the `external` array. Do not let esbuild bundle them.

**Why:** `fontkit` (pdfkit's font dependency) requires `@swc/helpers/cjs/_define_property.cjs` at runtime via a CJS dynamic require. This package is listed in esbuild's external list as `@swc/*`, so it won't be bundled — but if fontkit itself gets bundled, its `require("@swc/helpers/...")` call runs inside the ESM bundle where the CJS resolution fails. Externalizing pdfkit (and fontkit) avoids this.

**How to apply:** Whenever pdfkit is imported in the api-server, confirm `"pdfkit"` and `"fontkit"` are present in the `external` array in `build.mjs`. This also applies to other packages that transitively depend on `@swc/helpers` via CJS dynamic requires.
