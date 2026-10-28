import { Produit } from '../models/produit.model';
import { Categorie } from '../models/categorie.model';

export class XmlUtils {
  /**
   * Convertit un élément XML en instance de Produit
   */
  public static elementToProduit(el: Element): Produit {
    const getText = (tag: string): string => {
      const node = el.getElementsByTagName(tag)[0];
      return node && node.textContent ? node.textContent.trim() : '';
    };

    const idStr = getText('id');
    const id = idStr ? Number(idStr) : undefined;
    const designation = getText('designation');
    const prix = Number(getText('prix') || 0);
    const quantite = Number(getText('quantite') || 0);
    const actifStr = getText('actif');
    const actif = actifStr === 'true';
    const dateAchat = getText('dateAchat');

    let categorie: Categorie | undefined = undefined;
    const catEl = el.getElementsByTagName('categorie')[0];
    if (catEl) {
      const getCatText = (tag: string) => {
        const n = catEl.getElementsByTagName(tag)[0];
        return n && n.textContent ? n.textContent.trim() : '';
      };
      const catId = getCatText('id');
      categorie = new Categorie(
        catId ? Number(catId) : undefined,
        getCatText('code'),
        getCatText('libelle')
      );
    }

    return new Produit(id, designation, prix, quantite, actif, dateAchat, categorie);
  }

  /**
   * Parse une chaîne XML représentant une liste de produits (<ArrayList><item>...</item></ArrayList> ou similaire)
   */
  public static parseProduitsList(xmlText: string): Produit[] {
    if (!xmlText || typeof DOMParser === 'undefined') return [];
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');
      const items = doc.querySelectorAll('item, Produit, produit');
      const produits: Produit[] = [];

      items.forEach((item) => {
        // Éviter de parser des sous-éléments s'ils ont déjà été pris
        if (item.parentElement && (item.parentElement.tagName.toLowerCase().includes('list') || item.tagName.toLowerCase() === 'item')) {
          produits.push(XmlUtils.elementToProduit(item));
        } else if (items.length === 1 || item.parentElement === doc.documentElement) {
          produits.push(XmlUtils.elementToProduit(item));
        }
      });

      // Si le sélecteur ci-dessus n'a rien trouvé, tenter sur les enfants de la racine
      if (produits.length === 0 && doc.documentElement) {
        const children = Array.from(doc.documentElement.children);
        children.forEach((child) => {
          produits.push(XmlUtils.elementToProduit(child));
        });
      }

      return produits;
    } catch (e) {
      console.error('Erreur lors du parsing XML des produits:', e);
      return [];
    }
  }

  /**
   * Parse une chaîne XML représentant un seul Produit
   */
  public static parseSingleProduit(xmlText: string): Produit {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    return XmlUtils.elementToProduit(doc.documentElement);
  }

  /**
   * Convertit un objet Produit en chaîne XML prête pour Spring Boot
   */
  public static produitToXml(p: Produit): string {
    let xml = '<Produit>';
    if (p.id) {
      xml += `<id>${p.id}</id>`;
    }
    xml += `<designation>${this.escapeXml(p.designation || '')}</designation>`;
    xml += `<prix>${p.prix ?? 0}</prix>`;
    xml += `<quantite>${p.quantite ?? 0}</quantite>`;
    xml += `<actif>${p.actif ? 'true' : 'false'}</actif>`;
    if (p.dateAchat) {
      const d = typeof p.dateAchat === 'string' 
        ? p.dateAchat 
        : p.dateAchat.toISOString().split('T')[0];
      xml += `<dateAchat>${d}</dateAchat>`;
    }
    if (p.categorie && (p.categorie.id || p.categorie.code || p.categorie.libelle)) {
      xml += '<categorie>';
      if (p.categorie.id) xml += `<id>${p.categorie.id}</id>`;
      if (p.categorie.code) xml += `<code>${this.escapeXml(p.categorie.code)}</code>`;
      if (p.categorie.libelle) xml += `<libelle>${this.escapeXml(p.categorie.libelle)}</libelle>`;
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
