/**
 * Adresse dérivée du pseudo.
 *
 * Supabase exige une adresse pour un compte à mot de passe. On en fabrique une
 * à partir du pseudo, jamais affichée et jamais utilisée pour écrire. C'est son
 * unicité qui garantit celle du pseudo côté authentification.
 *
 * La transformation doit être stable dans le temps : la modifier rendrait
 * inaccessibles tous les comptes existants. Ne pas y toucher sans migration.
 */
const DOMAINE = "comptes.rusticulture.app";

export function normaliserPseudo(pseudo: string): string {
  return pseudo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // accents
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function adresseDerivee(pseudo: string): string {
  return `${normaliserPseudo(pseudo)}@${DOMAINE}`;
}

/** Un pseudo est valable s'il reste au moins deux caractères après nettoyage. */
export function pseudoValable(pseudo: string): boolean {
  const p = pseudo.trim();
  return p.length >= 2 && p.length <= 32 && normaliserPseudo(p).length >= 2;
}
