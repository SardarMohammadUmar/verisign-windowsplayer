/** Pretty-print registration code (e.g. six digits → grouped segments). */
export function formatRegistrationCode(code: string): string {
  const digits = code.replace(/\D/g, '');
  if (digits.length === 6) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 6)}`;
  }
  if (digits.length > 6) {
    const parts: string[] = [];
    let i = 0;
    while (i < digits.length) {
      parts.push(digits.slice(i, i + 4));
      i += 4;
    }
    return parts.join('-');
  }
  return code.trim() || '—';
}
