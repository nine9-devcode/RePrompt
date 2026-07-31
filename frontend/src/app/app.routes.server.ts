import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Nothing is prerendered. Every route reads live data from the API, so prerendering
 * baked build-time content into the static HTML and made `ng build` fail (or silently
 * emit an error page) whenever the backend was not running.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
