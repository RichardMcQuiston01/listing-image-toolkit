# CLAUDE.md

Project memory for Claude Code. Read this before changing anything.

## What this is

`@richardmcquiston01/listing-image-toolkit`: a browser canvas toolkit for
marketplace listing images, published to npm. Hero and Instagram templates,
photo placement, crop and thumbnail guides, background removal, PSD layer
import, and size-optimised export. Runs entirely client-side.

It was extracted from the etsy-dashboard SPA (`web/src/templates/`), where it
was already in use and tested. Consumers: etsy-dashboard, and the Maker
Toolkit desktop/Electron app.

## Layout

```
src/
  index.ts                  barrel: re-exports every module
  render.ts                 hero (4000×3000) + Instagram (1080×1080/1350) renderers,
                            photo placement, watermark layout, machine render placement
  export.ts                 downscale, JPG quality-within-budget, file size, crop guides
  crop.ts                   crop box maths, trim empty edges
  background-removal.ts     plain-background removal over RGBA arrays
  psd-layers.ts             importable layers from an ag-psd tree
  *.test.ts                 node:test + node:assert, run by `bun test`
tsup.config.ts              ESM + CJS + .d.ts/.d.cts, one entry per module
eslint.config.js            flat config, typescript-eslint
.changeset/                 Changesets (release notes, version bumps)
.github/workflows/          ci.yml (PRs, dev/main), release.yml (v*.*.* tags → npm)
```

Each module is a subpath export (`./render`, `./export`, `./crop`,
`./background-removal`, `./psd-layers`). Adding a module means adding it to
`tsup.config.ts`, `package.json` `exports` and `src/index.ts`.

## Commands (Bun only)

Bun is the package manager, script runner and test runner. Never use `npm`,
`npx` or `tsx` locally (the release workflow's `npm publish` is the one
exception: it's what does provenance).

```bash
bun install
bun run typecheck      # tsc --noEmit
bun run lint           # eslint .
bun run format         # prettier --write . (format:check in CI)
bun test
bun run build          # tsup → dist/
bun run changeset      # add a changeset for any user-facing change
```

## Hard requirements

- **ESM and CommonJS output, with types.** Keep `format: ['esm', 'cjs']` and
  the `import`/`require` conditions in `exports`. One consumer, Maker
  Toolkit's NestJS API, is CommonJS. This browser package shouldn't be
  imported there, but the desktop/Electron and etsy-dashboard consumers need
  both formats, so the dual output stays.
- **Runtime neutral.** No `Bun.*` globals in `src/` (ESLint blocks `Bun`).
  `node:*` imports belong only in tests. Library code is browser code: DOM
  types and Canvas 2D, nothing server-side.
- **ag-psd is an optional peer dependency** (and a devDependency for tests).
  `psd-layers.ts` only reads the layer tree, so it imports no ag-psd at
  runtime. Tests call ag-psd's `initializeCanvas` with a plain-array
  `createImageData`, so no canvas package is needed under Bun. Keep it so.
- **Marketplace-neutral API.** Don't add Etsy-specific (or any one
  marketplace's) naming to new API. The existing "Etsy hero" preset names
  (`ETSY_HERO_SIZE`, `renderEtsyHero`, `ETSY_*` guidance constants) are fine
  as a preset; new templates and options get neutral names. App-specific
  values (colours, fonts, name hints) are defaults that callers can override
  (`style`, `AssetKindHints`, title font candidates), not hard-coded.
- **Behaviour is tested.** Keep the pure maths pure and unit tested. Don't
  change rendering geometry without updating tests deliberately; consumers
  rely on output matching the source designs.

## TypeScript

Strict, with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
`noImplicitReturns`, `noImplicitOverride`, `verbatimModuleSyntax`,
`useUnknownInCatchVariables`. Lib is ES2023 + DOM. Typed locals where they aid
readability; descriptive names. Prettier (`.prettierrc.json`) formats
everything.

## Branch flow

- `dev` is the integration branch. Branch features off `dev`; open PRs into
  `dev`, never straight into `main`.
- Release: run `bun run version-packages` on `dev` (applies changesets), merge
  `dev` → `main`, then tag `vX.Y.Z` on `main` and push the tag. The release
  workflow checks the tag matches `package.json`, builds, tests and runs
  `npm publish --provenance --access public` with the `NPM_TOKEN` secret.

Never commit secrets or tokens.
