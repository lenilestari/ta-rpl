const ROLE_ROUTE_PREFIXES: Record<string, 'admin' | 'dosen' | 'mahasiswa'> = {
  '/admin': 'admin',
  '/dosen': 'dosen',
  '/mahasiswa': 'mahasiswa',
}

export function matchRoleRoutePrefix(path: string): string | null {
  return Object.keys(ROLE_ROUTE_PREFIXES).find((prefix) => path.startsWith(prefix)) ?? null
}

export function isRoleAllowedForPath(path: string, role: string | null): boolean {
  const prefix = matchRoleRoutePrefix(path)
  if (!prefix) return true
  return role === ROLE_ROUTE_PREFIXES[prefix]
}
