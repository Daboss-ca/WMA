/** Convert legacy bundled kiosk asset URLs saved in APIs or browser storage. */
export function normalizeImagePath(value: string): string {
  return value.replace(
    /(?:^|\/)src\/client\/assets\/catalogs\/kiosk\/([^?#]+)/i,
    (_match, filePath: string) => `/kiosk/${filePath}`,
  );
}
