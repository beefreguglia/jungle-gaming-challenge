/**
 * Passwords are never stored in clear, not even in the mock database: SHA-256 over a
 * per-user salt. Good enough for a simulation; a real backend would use a slow KDF.
 */
export async function hashPassword(salt: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function verifyPassword(
  record: { salt: string; passwordHash: string },
  password: string,
): Promise<boolean> {
  return (await hashPassword(record.salt, password)) === record.passwordHash
}

export function createSalt(): string {
  return crypto.randomUUID()
}
