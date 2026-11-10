/** The text typed into the named field of a form; empty when there is no such field. */
export function readField(form: HTMLFormElement, name: string): string {
  return (form.elements.namedItem(name) as HTMLInputElement | null)?.value ?? ''
}

/** Whether the named checkbox is ticked. */
export function readCheckbox(form: HTMLFormElement, name: string): boolean {
  return (form.elements.namedItem(name) as HTMLInputElement | null)?.checked ?? false
}
