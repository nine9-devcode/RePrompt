/**
 * Development defaults. Replaced by environment.prod.ts in production builds via
 * the `fileReplacements` entry in angular.json.
 *
 * `apiUrl`     - base for API calls.
 * `assetsUrl`  - origin that serves uploaded images (`/uploads/...`).
 * `appVersion` - shown on the settings page. Keep in step with package.json.
 * `repoUrl`    - linked from the settings page.
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5144/api',
  assetsUrl: 'http://localhost:5144',
  appVersion: '1.0.0',
  repoUrl: 'https://github.com/nine9-devcode/RePrompt',
};
