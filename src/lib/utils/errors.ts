/**
 * Turns an unknown thrown value into a sentence worth showing a person.
 *
 * Written out at each catch site, this drifted: most places kept
 * `err.message` whatever it held, so an Error carrying an empty string showed
 * an empty box. The check for a non-empty message existed in exactly one copy.
 */
export function errorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  return err instanceof Error && err.message ? err.message : fallback
}
