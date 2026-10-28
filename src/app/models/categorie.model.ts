export class Categorie {
  id?: number;
  code: string;
  libelle: string;

  constructor(id?: number, code: string = '', libelle: string = '') {
    this.id = id;
    this.code = code;
    this.libelle = libelle;
  }
}
