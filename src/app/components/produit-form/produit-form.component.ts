import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Produit } from '../../models/produit.model';
import { Categorie } from '../../models/categorie.model';
import { ProduitService, DataFormat } from '../../services/produit.service';

@Component({
  selector: 'app-produit-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './produit-form.component.html',
  styleUrls: ['./produit-form.component.scss']
})
export class ProduitFormComponent implements OnInit {
  produitForm!: FormGroup;
  isEditMode = false;
  produitId?: number;
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';
  activeFormat: DataFormat = 'JSON';

  // Catégories prédéfinies basées sur l'initialisation Spring Boot
  categoriesPredefinies: Categorie[] = [
    new Categorie(1, 'AL', 'Alimentaire'),
    new Categorie(2, 'PL', 'Plastique'),
    new Categorie(3, 'BR', 'BUREAUTIQUE')
  ];

  private platformId = inject(PLATFORM_ID);

  constructor(
    private fb: FormBuilder,
    private produitService: ProduitService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.activeFormat = this.produitService.currentFormat;
    this.initForm();

    // Vérifier si un ID est présent dans l'URL pour le mode édition
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEditMode = true;
      this.produitId = Number(idParam);
      if (isPlatformBrowser(this.platformId)) {
        this.loadProduit(this.produitId);
      }
    }
  }

  /**
   * Initialise le formulaire réactif avec les règles de validation strictes correspondant à Spring Boot
   */
  private initForm(): void {
    const today = new Date().toISOString().split('T')[0];

    this.produitForm = this.fb.group({
      designation: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      prix: [null, [Validators.required, Validators.min(0.1)]],
      quantite: [0, [Validators.required, Validators.min(0)]],
      actif: [true],
      dateAchat: [today, [Validators.required]],
      categorieCode: ['AL']
    });
  }

  /**
   * Charge les données d'un produit existant pour modification
   */
  private loadProduit(id: number): void {
    this.loading = true;
    this.errorMessage = '';

    this.produitService.getProduit(id).subscribe({
      next: (produit) => {
        let dateVal = '';
        if (produit.dateAchat) {
          if (typeof produit.dateAchat === 'string') {
            dateVal = produit.dateAchat.split('T')[0];
          } else if (produit.dateAchat instanceof Date) {
            dateVal = produit.dateAchat.toISOString().split('T')[0];
          }
        }

        const catCode = produit.categorie?.code || (this.categoriesPredefinies[0]?.code ?? 'AL');

        this.produitForm.patchValue({
          designation: produit.designation,
          prix: produit.prix,
          quantite: produit.quantite,
          actif: produit.actif ?? true,
          dateAchat: dateVal,
          categorieCode: catCode
        });

        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = `Impossible de charger le produit : ${err.message}`;
        this.loading = false;
      }
    });
  }

  /**
   * Soumission du formulaire (Ajout ou Modification)
   */
  onSubmit(): void {
    if (this.produitForm.invalid) {
      this.produitForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formValues = this.produitForm.value;

    // Retrouver la catégorie correspondante
    const selectedCat = this.categoriesPredefinies.find(c => c.code === formValues.categorieCode);
    const categorie = selectedCat 
      ? new Categorie(selectedCat.id, selectedCat.code, selectedCat.libelle)
      : undefined;

    const produitToSave = new Produit(
      this.isEditMode ? this.produitId : undefined,
      formValues.designation,
      Number(formValues.prix),
      Number(formValues.quantite),
      Boolean(formValues.actif),
      formValues.dateAchat,
      categorie
    );

    const request$ = this.isEditMode
      ? this.produitService.updateProduit(produitToSave)
      : this.produitService.saveProduit(produitToSave);

    request$.subscribe({
      next: (saved) => {
        this.saving = false;
        this.successMessage = this.isEditMode 
          ? `Produit "${saved.designation}" modifié avec succès !`
          : `Produit "${saved.designation}" créé avec succès !`;

        setTimeout(() => {
          this.router.navigate(['/produits']);
        }, 1200);
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = `Erreur lors de l'enregistrement : ${err.message}`;
      }
    });
  }

  // Getters pour validation dans le template
  get f() {
    return this.produitForm.controls;
  }
}
