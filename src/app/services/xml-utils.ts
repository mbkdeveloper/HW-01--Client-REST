import { Produit } from '../models/produit.model';
import { Categorie } from '../models/categorie.model';

export class XmlUtils {
  /**
   * Récupère le contenu textuel d'un enfant direct sans risquer de cibler
   * un sous-élément de même nom (ex: categorie -> id vs produit -> id).
   */
  private static getDirectChildText(parent: Element, tagName: string): string {
    const target = tagName.toLowerCase();
    for (let i = 0; i < parent.children.length; i++) {
      const child = parent.children[i];
      if (child.tagName.toLowerCase() === target) {
        return child.textContent?.trim() ?? '';
      }
    }
    return '';
  }

  /**
   * Récupère un élément enfant direct par son nom de balise.
   */
  private static getDirectChildElement(parent: Element, tagName: string): Element | null {
    const target = tagName.toLowerCase();
    for (let i = 0; i < parent.children.length; i++) {
      const child = parent.children[i];
      if (child.tagName.toLowerCase() === target) {
        return child;
      }
    }
    return null;
  }

  /**
   * Convertit un élément XML (ex: <item> ou <Produit>) en instance de Produit
   */
  public static elementToProduit(el: Element): Produit {
    const idStr = this.getDirectChildText(el, 'id');
    const id = idStr ? Number(idStr) : undefined;
    const designation = this.getDirectChildText(el, 'designation');
    const prix = Number(this.getDirectChildText(el, 'prix') || 0);
    const quantite = Number(this.getDirectChildText(el, 'quantite') || 0);
    const actifStr = this.getDirectChildText(el, 'actif');
    const actif = actifStr === 'true';

    // Date d'achat : support ISO, date brute YYYY-MM-DD ou timestamp numérique
    const dateRaw = this.getDirectChildText(el, 'dateAchat');
    let dateAchat: string | undefined = undefined;
    if (dateRaw) {
      if (!isNaN(Number(dateRaw)) && Number(dateRaw) > 100000000) {
        dateAchat = new Date(Number(dateRaw)).toISOString().split('T')[0];
      } else if (dateRaw.includes('T')) {
        dateAchat = dateRaw.split('T')[0];
      } else {
        dateAchat = dateRaw;
      }
    }

    // Catégorie
    let categorie: Categorie | undefined = undefined;
    const catEl = this.getDirectChildElement(el, 'categorie');
    if (catEl) {
      const catIdStr = this.getDirectChildText(catEl, 'id');
      const catCode = this.getDirectChildText(catEl, 'code');
      const catLibelle = this.getDirectChildText(catEl, 'libelle');
      if (catIdStr || catCode || catLibelle) {
        categorie = new Categorie(
          catIdStr ? Number(catIdStr) : undefined,
          catCode,
          catLibelle
        );
      }
    }

    return new Produit(id, designation, prix, quantite, actif, dateAchat, categorie);
  }

  /**
   * Parse une chaîne XML retournée par Spring Boot Jackson XML représentant une liste de produits
   * Structure type : <List><item>...</item><item>...</item></List> ou <ArrayList><item>...</item></ArrayList>
   */
  public static parseProduitsList(xmlText: string): Produit[] {
    if (!xmlText || typeof DOMParser === 'undefined') return [];
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');

      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        console.error('Erreur parsing XML liste:', parserError.textContent);
        return [];
      }

      const root = doc.documentElement;
      if (!root) return [];

      const produits: Produit[] = [];

      // Si le conteneur racine contient des enfants <item> ou <Produit>
      const children = Array.from(root.children);
      for (const child of children) {
        const tag = child.tagName.toLowerCase();
        if (tag === 'item' || tag === 'produit') {
          produits.push(this.elementToProduit(child));
        }
      }

      // Si aucun n'a été reconnu comme 'item' ou 'produit' mais qu'il y a des enfants
      if (produits.length === 0 && children.length > 0) {
        if (root.tagName.toLowerCase() === 'produit' || root.tagName.toLowerCase() === 'item') {
          produits.push(this.elementToProduit(root));
        } else {
          for (const child of children) {
            produits.push(this.elementToProduit(child));
          }
        }
      }

      return produits;
    } catch (e) {
      console.error('Erreur lors du parsing XML des produits:', e);
      return [];
    }
  }

  /**
   * Parse une chaîne XML retournée par Spring Boot représentant un seul Produit
   * Structure type : <Produit><id>...</id><designation>...</designation>...</Produit>
   */
  public static parseSingleProduit(xmlText: string): Produit {
    if (!xmlText || typeof DOMParser === 'undefined') {
      return new Produit();
    }
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');

      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        console.error('Erreur parsing XML produit unique:', parserError.textContent);
        return new Produit();
      }

      const root = doc.documentElement;
      if (!root) return new Produit();

      if (root.tagName.toLowerCase() === 'produit' || root.tagName.toLowerCase() === 'item') {
        return this.elementToProduit(root);
      }

      const candidate = root.querySelector('item, Produit, produit');
      if (candidate) {
        return this.elementToProduit(candidate);
      }

      return this.elementToProduit(root);
    } catch (e) {
      console.error('Erreur lors du parsing XML du produit unique:', e);
      return new Produit();
    }
  }

  /**
   * Convertit un objet Produit en XML pour Jackson XML (@RequestBody Produit p)
   */
  public static produitToXml(p: Produit): string {
    let xml = '<Produit>';
    if (p.id !== undefined && p.id !== null) {
      xml += `<id>${p.id}</id>`;
    }
    xml += `<designation>${this.escapeXml(p.designation || '')}</designation>`;
    xml += `<prix>${p.prix ?? 0}</prix>`;
    xml += `<quantite>${p.quantite ?? 0}</quantite>`;
    xml += `<actif>${p.actif ? 'true' : 'false'}</actif>`;

    if (p.dateAchat) {
      const d = typeof p.dateAchat === 'string'
        ? p.dateAchat.split('T')[0]
        : (p.dateAchat instanceof Date ? p.dateAchat.toISOString().split('T')[0] : p.dateAchat);
      xml += `<dateAchat>${d}</dateAchat>`;
    }

    if (p.categorie && (p.categorie.id != null || p.categorie.code || p.categorie.libelle)) {
      xml += '<categorie>';
      if (p.categorie.id != null) {
        xml += `<id>${p.categorie.id}</id>`;
      }
      if (p.categorie.code) {
        xml += `<code>${this.escapeXml(p.categorie.code)}</code>`;
      }
      if (p.categorie.libelle) {
        xml += `<libelle>${this.escapeXml(p.categorie.libelle)}</libelle>`;
      }
      xml += '</categorie>';
    }

    xml += '</Produit>';
    return xml;
  }

  private static escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }
}
