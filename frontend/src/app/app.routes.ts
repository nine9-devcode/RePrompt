import { Routes } from '@angular/router';

// Lazy loaded so the gallery's initial bundle does not carry the form (and exifr with it)
// or the settings page.
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/prompt-list/prompt-list.component').then(m => m.PromptListComponent),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./features/prompt-form/prompt-form.component').then(m => m.PromptFormComponent),
  },
  {
    path: 'edit/:id',
    loadComponent: () =>
      import('./features/prompt-form/prompt-form.component').then(m => m.PromptFormComponent),
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),
  },
  { path: '**', redirectTo: '' },
];
