import { Routes } from '@angular/router';
import { ProduitListComponent } from './components/produit-list/produit-list.component';
import { ProduitFormComponent } from './components/produit-form/produit-form.component';

export const routes: Routes = [
  { path: '', redirectTo: 'produits', pathMatch: 'full' },
  { path: 'produits', component: ProduitListComponent },
  { path: 'produits/nouveau', component: ProduitFormComponent },
  { path: 'produits/modifier/:id', component: ProduitFormComponent },
  { path: '**', redirectTo: 'produits' }
];
