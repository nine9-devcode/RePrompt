import { Routes } from '@angular/router';
import { PromptListComponent } from './features/prompt-list/prompt-list.component';
import { PromptFormComponent } from './features/prompt-form/prompt-form.component';
import { SettingsComponent } from './features/settings/settings.component';

export const routes: Routes = [
    { path: '', component: PromptListComponent },
    { path: 'new', component: PromptFormComponent },
    { path: 'edit/:id', component: PromptFormComponent },
    { path: 'settings', component: SettingsComponent },
    { path: '**', redirectTo: '' }
];
