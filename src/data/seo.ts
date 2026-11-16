/**
 * Données SEO de toutes les pages publiques de Support Connecté.
 *
 * Un seul fichier regroupe, pour chaque page : l'adresse, le mot-clé visé,
 * le titre et la description affichés dans Google. Pour modifier le
 * référencement d'une page, on vient ici, pas dans la page elle-même.
 *
 * Utilisation dans une page :
 *
 *   import { Seo } from "../components/Seo";
 *   import { SEO } from "../data/seo";
 *
 *   <Seo {...SEO.cartes} />
 *
 * (`keyword` est ignoré par <Seo /> : il ne sert que de rappel pour nous.)
 */

/* ───────────────────────── RÉGLAGES À REMPLIR ───────────────────────── */

/**
 * Ville ou pays visé par la recherche locale (exemple : "Dakar").
 * Il est ajouté aux titres des pages produit : « Carte de visite NFC à Dakar ».
 * Laisse "" pour ne rien ajouter. Attention : un titre ne doit pas dépasser
 * environ 60 caractères, sinon Google le coupe.
 */
export const ZONE = "Saly";

/** Fragment « à Ville » ajouté aux titres, vide si ZONE est vide. */
const lieu = ZONE ? ` à ${ZONE}` : "";

/** Nom de marque affiché à la fin des titres. Garde l'accent et le « é ». */
const MARQUE = "Support Connecté";

/* ───────────────────────── TYPE ───────────────────────── */

export interface PageSeo {
  /** Adresse de la page, commençant par "/" ("" pour l'accueil). */
  path: string;
  /** Mot-clé principal visé : UN seul par page. À placer aussi dans le <h1> et le 1er paragraphe. */
  keyword: string;
  /** Titre dans Google : 50 à 60 caractères, unique par page. */
  title: string;
  /** Description sous le titre : 140 à 160 caractères, unique par page. */
  description: string;
}

/* ───────────────────────── PAGES ───────────────────────── */

export const SEO = {
  /* Page d'accueil : vise la MARQUE, pas un produit. Le mot « carte NFC »
     appartient à la page /cartes-connectees. */
  accueil: {
    path: "",
    keyword: "Support Connecté",
    title: `${MARQUE} | Cartes connectées NFC et QR codes`,
    description:
      "Support Connecté conçoit des cartes NFC, QR codes et panneaux connectés pour relier votre entreprise à ses clients, en un simple geste.",
  },

  /* Produit : cartes de visite NFC. */
  cartes: {
    path: "/cartes-connectees",
    keyword: "carte de visite NFC",
    title: `Carte de visite NFC${lieu} | ${MARQUE}`,
    description:
      "Cartes de visite NFC personnalisées : partagez vos coordonnées, votre fiche et vos avis Google d'un simple contact avec le téléphone. Demandez un devis.",
  },

  /* Produit : QR codes. */
  qrSmart: {
    path: "/qr-smart",
    keyword: "QR code entreprise",
    title: `QR code entreprise${lieu} | ${MARQUE}`,
    description:
      "QR codes professionnels personnalisés avec votre logo : dynamiques, modifiables à tout moment et suivis. Reliez vos supports papier à votre activité.",
  },

  /* Produit : panneaux et bâches. */
  panneaux: {
    path: "/panneaux-baches",
    keyword: "panneau QR code",
    title: `Panneau et bâche QR code${lieu} | ${MARQUE}`,
    description:
      "Panneaux, bâches et affiches avec QR code : transformez vos supports d'affichage en point d'accès vers votre fiche, vos offres et vos avis clients.",
  },

  /* Service : identité et supports de marque. */
  branding: {
    path: "/branding-intelligent",
    keyword: "branding digital",
    title: `Branding digital et supports connectés | ${MARQUE}`,
    description:
      "Un branding intelligent : identité visuelle, cartes, stickers et supports connectés qui racontent votre marque et mènent vos clients vers vous.",
  },

  /* Vue d'ensemble des secteurs ; chaque secteur a sa propre page plus bas. */
  secteurs: {
    path: "/secteurs",
    keyword: "solutions connectées par secteur",
    title: `Solutions connectées par secteur | ${MARQUE}`,
    description:
      "Restauration, immobilier, hôtellerie, commerce : découvrez comment les cartes NFC et les QR codes de Support Connecté servent votre métier.",
  },

  /* Secteur immobilier.
     ATTENTION : /secteurs/immobilier et /promoteur-immobilier affichent la même
     page. Garde UNE adresse principale (ici /promoteur-immobilier) et redirige
     l'autre, sinon Google voit un contenu en double. */
  immobilier: {
    path: "/promoteur-immobilier",
    keyword: "QR code immobilier",
    title: `QR code immobilier${lieu} | ${MARQUE}`,
    description:
      "Panneaux de chantier, cartes d'agent et QR codes pour programmes immobiliers : présentez vos biens et captez des contacts qualifiés en un scan.",
  },

  /* Service : production de contenu. */
  contenu: {
    path: "/creation-contenu",
    keyword: "création de contenu entreprise",
    title: `Création de contenu pour entreprise | ${MARQUE}`,
    description:
      "Photos, vidéos et contenus pour vos réseaux sociaux et votre fiche connectée : donnez à votre activité une image professionnelle et cohérente.",
  },

  /* Marque : présentation de l'entreprise. */
  apropos: {
    path: "/a-propos",
    keyword: "Support Connecté",
    title: `À propos de ${MARQUE} | Cartes connectées`,
    description:
      "Découvrez Support Connecté : notre mission, notre équipe et notre manière de connecter les entreprises à leurs clients grâce au NFC et aux QR codes.",
  },

  /* Page de contact : vise la demande de devis. */
  contact: {
    path: "/contact",
    keyword: "devis carte NFC",
    title: `Devis carte NFC et QR code | ${MARQUE}`,
    description:
      "Contactez Support Connecté pour un devis de cartes NFC, QR codes ou panneaux connectés. Décrivez votre projet, nous vous répondons rapidement.",
  },
} as const satisfies Record<string, PageSeo>;

/* ───────────────────────── PAGES PAR SECTEUR ─────────────────────────
   Pour les pages /secteurs/:sector. Chaque secteur cible sa propre recherche
   (« carte NFC pour restaurant »), plus facile à gagner qu'un mot général.

   Utilisation dans SecteursPage (focus = identifiant du secteur) :

     const seo = sectorSeo(focus, "restaurant");
     <Seo {...seo} />

   Les identifiants viennent de src/data/secteurs.ts : adapte-les. */

export function sectorSeo(id: string, metier: string): PageSeo {
  return {
    path: `/secteurs/${id}`,
    keyword: `carte NFC pour ${metier}`,
    title: `Carte NFC et QR code pour ${metier} | ${MARQUE}`,
    description: `Cartes NFC et QR codes pensés pour votre activité de ${metier} : plus de visibilité, de contacts et d'avis clients. Demandez votre devis.`,
  };
}

/* ───────────────────────── PAGES À NE PAS RÉFÉRENCER ─────────────────────────
   Page 404, connexion, inscription, espace client : utilise <Seo noindex /> avec
   un titre simple, par exemple :

     <Seo noindex title="Page introuvable | Support Connecté" description="…" />
*/
/* ───────────────────────── PAGES /secteurs/:id ─────────────────────────
   Un titre et une description propres à chaque secteur. /secteurs/immobilier
   n'y figure pas : elle redirige vers /promoteur-immobilier. */

export const SECTOR_PAGES: PageSeo[] = [
  {
    path: "/secteurs/restaurants-cafes",
    keyword: "carte NFC restaurant",
    title: `Carte NFC pour restaurant${lieu} | ${MARQUE}`,
    description:
      "Menu, avis Google et réservation en un scan : cartes NFC, QR codes de table et affiches pour restaurants et cafés. Demandez votre devis.",
  },
  {
    path: "/secteurs/hotels-residences",
    keyword: "carte NFC hôtel",
    title: `Carte NFC pour hôtel${lieu} | ${MARQUE}`,
    description:
      "Cartes NFC et QR codes pour hôtels et résidences : présentez vos services et vos chambres, et recueillez les avis de vos clients dès leur arrivée.",
  },
  {
    path: "/secteurs/commerces-boutiques",
    keyword: "carte NFC commerce",
    title: `Carte NFC pour commerce${lieu} | ${MARQUE}`,
    description:
      "Cartes NFC, QR codes et supports d'affichage pour boutiques et commerces : dirigez vos clients vers vos offres, votre fiche et vos avis Google.",
  },
  {
    path: "/secteurs/promoteurs",
    keyword: "QR code promoteur immobilier",
    title: `Carte NFC pour promoteur${lieu} | ${MARQUE}`,
    description:
      "Panneaux de chantier, bâches et QR codes pour promoteurs immobiliers : présentez vos programmes et captez des contacts qualifiés en un scan.",
  },
  {
    path: "/secteurs/tourisme-loisirs",
    keyword: "carte NFC tourisme",
    title: `Carte NFC pour tourisme et loisirs${lieu} | ${MARQUE}`,
    description:
      "Cartes NFC et QR codes pour le tourisme et les loisirs : guidez vos visiteurs, présentez vos activités et recueillez leurs avis en un geste.",
  },
  {
    path: "/secteurs/entreprises",
    keyword: "carte NFC entreprise",
    title: `Carte NFC pour entreprise${lieu} | ${MARQUE}`,
    description:
      "Cartes de visite NFC, QR codes et supports de marque pour entreprises : partagez vos coordonnées et valorisez votre image professionnelle.",
  },
  {
    path: "/secteurs/institutions-administrations",
    keyword: "carte NFC institution",
    title: `Carte NFC pour institution${lieu} | ${MARQUE}`,
    description:
      "Cartes NFC et QR codes pour institutions et administrations : orientez le public, partagez vos informations et simplifiez l'accueil au quotidien.",
  },
];

/* ───────────────────────── PAGES LÉGALES ───────────────────────── */

export const LEGAL_PAGES: PageSeo[] = [
  {
    path: "/mentions-legales",
    keyword: "mentions légales",
    title: `Mentions légales | ${MARQUE}`,
    description:
      "Mentions légales du site Support Connecté : éditeur, hébergeur, propriété intellectuelle et contact.",
  },
  {
    path: "/confidentialite",
    keyword: "politique de confidentialité",
    title: `Politique de confidentialité | ${MARQUE}`,
    description:
      "Politique de confidentialité de Support Connecté : données collectées, finalités, durée de conservation et vos droits.",
  },
];
