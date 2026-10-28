import { Component, OnInit, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Produit } from '../../models/produit.model';
import { ProduitService, DataFormat } from '../../services/produit.service';

@Component({
  selector: 'app-produit-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './produit-list.component.html',
  styleUrls: ['./produit-list.component.scss']
})
export class ProduitListComponent implements OnInit, OnDestroy {
  produits: Produit[] = [];
  filteredProduits: Produit[] = [];
  
  // Recherche et filtres
  searchKeyword: string = '';
  statusFilter: 'TOUS' | 'ACTIFS' | 'INACTIFS' = 'TOUS';

  // États d'interface
  loading = false;
  errorMessage = '';
  successMessage = '';
  activeFormat: DataFormat = 'JSON';

  // Produit sélectionné pour confirmation de suppression
  produitToDelete: Produit | null = null;
  deleting = false;

  private formatSub!: Subscription;
  private platformId = inject(PLATFORM_ID);

  constructor(private produitService: ProduitService) {}

  ngOnInit(): void {
    this.activeFormat = this.produitService.currentFormat;
    // Si l'utilisateur bascule de format dans la navbar, recharger automatiquement la liste avec ce format
    this.formatSub = this.produitService.currentFormat$.subscribe((format) => {
      this.activeFormat = format;
      if (isPlatformBrowser(this.platformId)) {
        this.loadProduits();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.formatSub) {
      this.formatSub.unsubscribe();
    }
  }

  /**
   * Charge la liste des produits depuis le backend Spring Boot
   */
  loadProduits(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loading = true;
    this.errorMessage = '';
    
    this.produitService.getProduits().subscribe({
      next: (data) => {
        this.produits = data;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.message || 'Erreur lors du chargement des produits.';
        this.loading = false;
      }
    });
  }

  /**
   * Applique le filtre de recherche par désignation et par statut
   */
  applyFilters(): void {
    let result = [...this.produits];

    // Filtre par mot clé désignation
    if (this.searchKeyword && this.searchKeyword.trim() !== '') {
      const term = this.searchKeyword.toLowerCase().trim();
      result = result.filter(p => p.designation && p.designation.toLowerCase().includes(term));
    }

    // Filtre par statut actif/inactif
    if (this.statusFilter === 'ACTIFS') {
      result = result.filter(p => p.actif === true);
    } else if (this.statusFilter === 'INACTIFS') {
      result = result.filter(p => p.actif === false);
    }

    this.filteredProduits = result;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  resetFilters(): void {
    this.searchKeyword = '';
    this.statusFilter = 'TOUS';
    this.applyFilters();
  }

  /**
   * Prépare la suppression d'un produit
   */
  confirmDelete(p: Produit): void {
    this.produitToDelete = p;
  }

  cancelDelete(): void {
    this.produitToDelete = null;
  }

  /**
   * Effectue la suppression du produit sélectionné
   */
  executeDelete(): void {
    if (!this.produitToDelete || !this.produitToDelete.id) return;

    this.deleting = true;
    const id = this.produitToDelete.id;
    const designation = this.produitToDelete.designation;

    this.produitService.deleteProduit(id).subscribe({
      next: () => {
        this.successMessage = `Le produit "${designation}" (ID: ${id}) a été supprimé avec succès.`;
        this.produitToDelete = null;
        this.deleting = false;
        this.loadProduits();
        setTimeout(() => this.successMessage = '', 4000);
      },
      error: (err) => {
        this.errorMessage = `Échec de la suppression : ${err.message}`;
        this.produitToDelete = null;
        this.deleting = false;
      }
    });
  }

  /**
   * Statistiques
   */
  get totalProduits(): number {
    return this.produits.length;
  }

  get totalActifs(): number {
    return this.produits.filter(p => p.actif).length;
  }

  get totalValeurStock(): number {
    return this.produits.reduce((acc, p) => acc + (p.prix * p.quantite), 0);
  }
}
