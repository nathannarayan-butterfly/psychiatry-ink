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
