export const PUBLIC_ROUTES = ['/', '/inscription', '/onboarding', '/demo', '/presse', '/offres', '/legal'] as const;

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((p) => (p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(`${p}/`)));
}
