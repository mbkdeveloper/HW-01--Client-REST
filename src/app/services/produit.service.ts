import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, map, catchError } from 'rxjs';
import { Produit } from '../models/produit.model';
import { XmlUtils } from './xml-utils';

@Injectable({
  providedIn: 'root'
})
export class ProduitService {
  // En passant par le proxy configuré dans proxy.conf.json avec /api
  private readonly baseUrl = '/api/produits';

  // Headers XML par défaut pour toutes les requêtes
  private readonly xmlHeaders = new HttpHeaders({
    'Accept': 'application/xml, text/xml'
  });

  private readonly xmlPostHeaders = new HttpHeaders({
    'Content-Type': 'application/xml',
    'Accept': 'application/xml, text/xml'
  });

  constructor(private http: HttpClient) {}

  /**
   * Teste la connexion à l'API Spring Boot via /produits/index
   */
  public testConnection(): Observable<string> {
    return this.http.get(`${this.baseUrl}/index`, { responseType: 'text' }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupère tous les produits au format XML depuis Spring Boot Jackson XML
   */
  public getProduits(): Observable<Produit[]> {
    return this.http.get(`${this.baseUrl}/`, {
      headers: this.xmlHeaders,
      responseType: 'text'
    }).pipe(
      map((xmlText) => XmlUtils.parseProduitsList(xmlText)),
      catchError(this.handleError)
    );
  }

  /**
   * Récupère un produit par son ID au format XML depuis Spring Boot Jackson XML
   */
  public getProduit(id: number): Observable<Produit> {
    return this.http.get(`${this.baseUrl}/${id}`, {
      headers: this.xmlHeaders,
      responseType: 'text'
    }).pipe(
      map((xmlText) => XmlUtils.parseSingleProduit(xmlText)),
      catchError(this.handleError)
    );
  }

  /**
   * Ajoute un nouveau produit en envoyant un payload XML à Spring Boot
   * et en consommant la réponse XML retournée par Jackson
   */
  public saveProduit(produit: Produit): Observable<Produit> {
    const xmlBody = XmlUtils.produitToXml(produit);

    return this.http.post(`${this.baseUrl}/`, xmlBody, {
      headers: this.xmlPostHeaders,
      responseType: 'text'
    }).pipe(
      map((resXml) => XmlUtils.parseSingleProduit(resXml)),
      catchError(this.handleError)
    );
  }

  /**
   * Modifie un produit existant en envoyant un payload XML à Spring Boot
   * et en consommant la réponse XML retournée par Jackson
   */
  public updateProduit(produit: Produit): Observable<Produit> {
    const xmlBody = XmlUtils.produitToXml(produit);

    return this.http.put(`${this.baseUrl}/`, xmlBody, {
      headers: this.xmlPostHeaders,
      responseType: 'text'
    }).pipe(
      map((resXml) => XmlUtils.parseSingleProduit(resXml)),
      catchError(this.handleError)
    );
  }

  /**
   * Supprime un produit par son ID via GET /produits/delete/{id}
   */
  public deleteProduit(id: number): Observable<void> {
    return this.http.get(`${this.baseUrl}/delete/${id}`, { responseType: 'text' }).pipe(
      map(() => void 0),
      catchError(this.handleError)
    );
  }

  /**
   * Recherche par désignation parmi les produits récupérés en XML
   */
  public searchByDesignation(keyword: string): Observable<Produit[]> {
    return this.getProduits().pipe(
      map(produits => {
        if (!keyword || !keyword.trim()) return produits;
        const term = keyword.toLowerCase().trim();
        return produits.filter(p => p.designation && p.designation.toLowerCase().includes(term));
      })
    );
  }

  /**
   * Gestion centralisée des erreurs HTTP
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Une erreur inattendue est survenue.';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erreur réseau : ${error.error.message}`;
    } else {
      if (error.status === 0) {
        errorMessage = 'Impossible de contacter le serveur Spring Boot. Vérifiez que le backend et MySQL sont bien démarrés sur le port 8080.';
      } else {
        errorMessage = `Erreur serveur (${error.status}) : ${error.statusText || ''} - ${error.error?.message || error.message || ''}`;
      }
    }
    console.error('Erreur ProduitService:', error);
    return throwError(() => new Error(errorMessage));
  }
}
