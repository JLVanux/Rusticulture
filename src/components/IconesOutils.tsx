/**
 * Icônes des outils, au trait, dans le style de la navigation.
 *
 * `CHARTE.md` interdit les émojis dans l'interface — « une icône dessinée, ou
 * rien ». Ces tracés sont volontairement pauvres : trois ou quatre traits,
 * aucune dépendance, et ils suivent la couleur du texte.
 */
const trait = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconeCloche() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" {...trait}>
      <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function IconeGenes() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" {...trait}>
      <path d="M6 3c0 5 12 7 12 12" />
      <path d="M18 3c0 5-12 7-12 12" />
      <path d="M7 8h10M8 16h8" />
    </svg>
  );
}

export function IconeCadre() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" {...trait}>
      <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8" />
      <path d="M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8" />
      <path d="M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16" />
      <path d="M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
      <path d="M4 12h16" />
    </svg>
  );
}

export function IconePousse() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" {...trait}>
      <path d="M12 21V10" />
      <path d="M12 13c-4 0-6-2-6-6 4 0 6 2 6 6Z" />
      <path d="M12 12c3 0 5-2 5-5-3 0-5 2-5 5Z" />
    </svg>
  );
}

export function IconeTasse() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" {...trait}>
      <path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z" />
      <path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17" />
      <path d="M8 3v2M12 3v2" />
    </svg>
  );
}

export function IconeExplosion() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" {...trait}>
      <path d="m12 3 2.2 4.6L19 6l-1.6 4.6L22 12l-4.6 1.4L19 18l-4.8-1.6L12 21l-2.2-4.6L5 18l1.6-4.6L2 12l4.6-1.4L5 6l4.8 1.6L12 3Z" />
    </svg>
  );
}

export function IconeHorloge() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...trait}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

export function IconePanier() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...trait}>
      <path d="M3 8h18l-2 11H5L3 8Z" />
      <path d="M8 8V6a4 4 0 0 1 8 0v2" />
    </svg>
  );
}
