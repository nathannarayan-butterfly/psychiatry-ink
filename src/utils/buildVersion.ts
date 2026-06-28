/**
 * The build id baked into THIS running bundle at build time.
 *
 * `__APP_BUILD_ID__` is replaced by the `psyink-version-stamp` Vite plugin with
 * the same value published to `/version.json` (see `vite.config.ts`). The
 * `typeof` guard keeps this safe if the define is ever absent (e.g. an unusual
 * test runner): referencing an undeclared identifier with `typeof` yields
 * `'undefined'` instead of throwing, so we fall back to the dev sentinel.
 */
export const LOADED_BUILD_ID: string =
  typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : 'dev'

/**
 * The semantic app version from `package.json`, injected at build time via the
 * `psyink-version-stamp` Vite plugin (`__APP_VERSION__`). The `typeof` guard
 * mirrors `LOADED_BUILD_ID`: an unusual runner without the define falls back to
 * a sentinel instead of throwing on an undeclared identifier.
 */
export const APP_VERSION: string =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'
