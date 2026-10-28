import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, map, catchError } from 'rxjs';
import { Produit } from '../models/produit.model';
import { XmlUtils } from './xml-utils';

export type DataFormat = 'JSON' | 'XML';

@Injectable({
  providedIn: 'root'
})
export class ProduitService {
  // En passant par le proxy configuré dans proxy.conf.json avec /api, aucune collision avec les routes de navigation du frontend
  private readonly baseUrl = '/api/produits';

  // Format actif (JSON ou XML)
  private currentFormatSubject = new BehaviorSubject<DataFormat>('JSON');
  public currentFormat$ = this.currentFormatSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Change le format utilisé pour les requêtes et réponses
   */
  public setFormat(format: DataFormat): void {
    this.currentFormatSubject.next(format);
  }

  public get currentFormat(): DataFormat {
    return this.currentFormatSubject.value;
  }

  /**
   * Teste la connexion à l'API Spring Boot via /produits/index
   */
  public testConnection(): Observable<string> {
    return this.http.get(`${this.baseUrl}/index`, { responseType: 'text' }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupère tous les produits (compatible JSON et XML)
   */
  public getProduits(): Observable<Produit[]> {
    const format = this.currentFormat;
    const headers = new HttpHeaders({
      'Accept': format === 'XML' ? 'application/xml, text/xml' : 'application/json'
    });

    if (format === 'XML') {
      return this.http.get(`${this.baseUrl}/`, { headers, responseType: 'text' }).pipe(
        map((xmlText) => XmlUtils.parseProduitsList(xmlText)),
        catchError(this.handleError)
      );
    } else {
      return this.http.get<any>(`${this.baseUrl}/`, { headers }).pipe(
        map((data: any) => {
          if (typeof data === 'string' && (data as string).trim().startsWith('<')) {
            return XmlUtils.parseProduitsList(data);
          }
          if (Array.isArray(data)) {
            return data.map(item => this.mapToProduit(item));
          }
          return [];
        }),
        catchError(this.handleError)
      );
    }
  }

  /**
   * Récupère un produit par son ID (compatible JSON et XML)
   */
  public getProduit(id: number): Observable<Produit> {
    const format = this.currentFormat;
    const headers = new HttpHeaders({
      'Accept': format === 'XML' ? 'application/xml, text/xml' : 'application/json'
    });

    if (format === 'XML') {
      return this.http.get(`${this.baseUrl}/${id}`, { headers, responseType: 'text' }).pipe(
        map((xmlText) => XmlUtils.parseSingleProduit(xmlText)),
        catchError(this.handleError)
      );
    } else {
      return this.http.get<any>(`${this.baseUrl}/${id}`, { headers }).pipe(
        map((item: any) => {
          if (typeof item === 'string' && (item as string).trim().startsWith('<')) {
            return XmlUtils.parseSingleProduit(item);
          }
          return this.mapToProduit(item);
        }),
        catchError(this.handleError)
      );
    }
  }

  /**
   * Ajoute un produit (compatible POST avec payload JSON ou XML)
   */
  public saveProduit(produit: Produit): Observable<Produit> {
    const format = this.currentFormat;

    if (format === 'XML') {
      const headers = new HttpHeaders({
        'Content-Type': 'application/xml',
        'Accept': 'application/xml, application/json'
      });
      const xmlBody = XmlUtils.produitToXml(produit);

      return this.http.post(`${this.baseUrl}/`, xmlBody, { headers, responseType: 'text' }).pipe(
        map((resText) => {
          if (resText.trim().startsWith('<')) {
            return XmlUtils.parseSingleProduit(resText);
          }
          try {
            return this.mapToProduit(JSON.parse(resText));
          } catch {
            return produit;
          }
        }),
        catchError(this.handleError)
      );
    } else {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      });
      return this.http.post<any>(`${this.baseUrl}/`, produit, { headers }).pipe(
        map((res) => this.mapToProduit(res)),
        catchError(this.handleError)
      );
    }
  }

  /**
   * Modifie un produit (compatible PUT avec payload JSON ou XML)
   */
  public updateProduit(produit: Produit): Observable<Produit> {
    const format = this.currentFormat;

    if (format === 'XML') {
      const headers = new HttpHeaders({
        'Content-Type': 'application/xml',
        'Accept': 'application/xml, application/json'
      });
      const xmlBody = XmlUtils.produitToXml(produit);

      return this.http.put(`${this.baseUrl}/`, xmlBody, { headers, responseType: 'text' }).pipe(
        map((resText) => {
          if (resText.trim().startsWith('<')) {
            return XmlUtils.parseSingleProduit(resText);
          }
          try {
            return this.mapToProduit(JSON.parse(resText));
          } catch {
            return produit;
          }
        }),
        catchError(this.handleError)
      );
    } else {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      });
      return this.http.put<any>(`${this.baseUrl}/`, produit, { headers }).pipe(
        map((res) => this.mapToProduit(res)),
        catchError(this.handleError)
      );
    }
  }

  /**
   * Supprime un produit par son ID.
   * Utilise le endpoint GET /produits/delete/{id} défini dans ProduitRESTController.
   */
  public deleteProduit(id: number): Observable<void> {
    return this.http.get<void>(`${this.baseUrl}/delete/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recherche par désignation
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
   * Convertit un objet brut reçu en instance de Produit
   */
  private mapToProduit(item: any): Produit {
    return new Produit(
      item.id,
      item.designation,
      item.prix,
      item.quantite,
      item.actif,
      item.dateAchat,
      item.categorie
    );
  }

  /**
   * Gestion centralisée des erreurs HTTP
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Une erreur inattendue est survenue.';
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client ou réseau
      errorMessage = `Erreur réseau : ${error.error.message}`;
    } else {
      // Erreur renvoyée par le backend Spring Boot
      if (error.status === 0) {
        errorMessage = 'Impossible de contacter le serveur Spring Boot. Vérifiez que le backend et XAMPP (MySQL) sont bien démarrés sur le port 8080.';
      } else {
        errorMessage = `Erreur serveur (${error.status}) : ${error.statusText || ''} - ${error.error?.message || error.message || ''}`;
      }
    }
    console.error('Erreur ProduitService:', error);
    return throwError(() => new Error(errorMessage));
  }
}
