import type { Request } from 'express'

/**
 * `@types/express` v5 types path params (and header values) as `string | string[]`
 * to support wildcard / repeated entries. Every route in this codebase uses
 * single-value, non-wildcard path params, which are always a single string at
 * runtime. These helpers normalize the static type to match that guaranteed
 * runtime shape without changing any behavior.
 */
export function pathParam(req: Request, name: string): string {
  const value = req.params[name]
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}
