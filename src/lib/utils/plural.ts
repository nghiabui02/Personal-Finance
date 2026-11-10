/** "1 transaction", "3 transactions" — English, regular nouns only. */
export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}
