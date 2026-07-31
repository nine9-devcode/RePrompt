/**
 * Production build. Relative urls assume the API is served from the same origin as
 * the app (behind a reverse proxy). Point them at an absolute origin if it is not.
 */
export const environment = {
  production: true,
  apiUrl: '/api',
  assetsUrl: '',
};
