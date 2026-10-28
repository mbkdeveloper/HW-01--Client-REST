import { Categorie } from './categorie.model';

export class Produit {
  id?: number;
  designation: string;
  prix: number;
  quantite: number;
  actif: boolean;
  dateAchat?: string | Date;
  categorie?: Categorie;

  constructor(
    id?: number,
    designation: string = '',
    prix: number = 0,
    quantite: number = 0,
    actif: boolean = true,
    dateAchat?: string | Date,
    categorie?: Categorie
  ) {
    this.id = id;
    this.designation = designation;
    this.prix = prix;
    this.quantite = quantite;
    this.actif = actif;
    this.dateAchat = dateAchat;
    this.categorie = categorie;
  }
}
