/**
 * Titre et chaîne d'une vidéo YouTube.
 *
 * Passe par **oEmbed**, un point d'accès public : aucune clé, aucun quota,
 * rien à renouveler. Le compromis est qu'il ne renvoie que le titre et la
 * chaîne — pas la description. Celle-ci reste à coller à la main pour que la
 * lecture des quantités fonctionne.
 *
 * Pourquoi une route serveur plutôt qu'un appel depuis le navigateur : YouTube
 * n'autorise pas les requêtes croisées sur ce point d'accès. Le navigateur
 * recevrait une erreur sans même voir la réponse.
 */

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET(requete: Request) {
  const id = new URL(requete.url).searchParams.get("id") ?? "";

  // On valide la forme avant d'appeler quoi que ce soit : sans ça, la valeur
  // du client se retrouverait telle quelle dans une URL sortante.
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) {
    return Response.json({ erreur: "identifiant invalide" }, { status: 400 });
  }

  try {
    const reponse = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`,
      { next: { revalidate: 3600 } }
    );

    if (!reponse.ok) {
      // 404 : vidéo privée, supprimée, ou identifiant inexistant.
      return Response.json({ trouve: false }, { status: 200 });
    }

    const data = (await reponse.json()) as { title?: string; author_name?: string };
    return Response.json({
      trouve: true,
      titre: data.title ?? null,
      auteur: data.author_name ?? null,
    });
  } catch {
    // Une panne de YouTube ne doit pas empêcher de remplir le formulaire à la
    // main : on répond « pas trouvé », pas une erreur.
    return Response.json({ trouve: false }, { status: 200 });
  }
}
