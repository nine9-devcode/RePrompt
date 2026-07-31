/**
 * Development defaults. Replaced by environment.prod.ts in production builds via
 * the `fileReplacements` entry in angular.json.
 *
 * `apiUrl`    - base for API calls.
 * `assetsUrl` - origin that serves uploaded images (`/uploads/...`).
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5144/api',
  assetsUrl: 'http://localhost:5144',
};
