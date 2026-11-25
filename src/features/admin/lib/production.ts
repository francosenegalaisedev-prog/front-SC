import type { IconName } from '../components/ui';
import type { Fonction, StatutCarte, StatutSticker } from '../../../types/admin';

// Même règle que le serveur (TRANSITIONS) : Envoyée → Traitée → Livrée.
export const CARTE_TRANSITIONS: Record<StatutCarte, StatutCarte[]> = {
  envoyee: ['traitee', 'livree'],
  traitee: ['livree', 'envoyee'],
  livree:  ['traitee'],
};
export const carteStatusOptions = (status: StatutCarte): StatutCarte[] => [
  status,
  ...CARTE_TRANSITIONS[status],
];
export const CARTE_SUIVANT: Partial<Record<StatutCarte, StatutCarte>> = {
  envoyee: 'traitee', traitee: 'livree',
};
export const PS: Record<StatutCarte, string> = { envoyee: 'Envoyée', traitee: 'Traitée', livree: 'Livrée' };
export const SS: Record<StatutSticker, string> = { a_parametrer: 'À paramétrer', parametre: 'Paramétré', teste: 'Testé', imprime: 'Imprimé', livre: 'Livré', annule: 'Annulé' };
export const FN: Record<Fonction, [string, IconName]> = {
  avis: ['Avis Google', 'check'], wifi: ['Accès Wi-Fi', 'zap'], menu: ['Notre menu', 'file'], reseaux: ['Réseaux sociaux', 'users'],
  contact: ['Contact WhatsApp', 'wa'], rdv: ['Rendez-vous', 'cal'], lien: ['Lien libre', 'ext'],
};
// Titre imprimé en haut du sticker
export const TITLE: Record<Fonction, string> = {
  avis: 'Laissez-nous un avis', wifi: 'Wi-Fi offert', menu: 'Notre menu', reseaux: 'Suivez-nous', contact: 'Écrivez-nous', rdv: 'Prenez rendez-vous', lien: 'Scannez-moi',
};
export const LBL: Record<string, string> = {
  etablissement: 'Établissement', lien: 'Lien', ssid: 'Réseau (SSID)', password: 'Mot de passe', security: 'Sécurité', hidden: 'Réseau masqué',
  source: 'Menu', instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', whatsapp: 'WhatsApp', message: 'Message préparé',
};
// Champs à saisir selon la fonction du sticker
export const CHAMPS: Record<Fonction, { k: string; l: string; ph?: string }[]> = {
  avis: [{ k: 'lien', l: 'Lien d’avis Google', ph: 'https://g.page/r/…' }],
  wifi: [{ k: 'ssid', l: 'Nom du réseau (SSID)' }, { k: 'password', l: 'Mot de passe' }],
  menu: [{ k: 'source', l: 'Adresse du menu', ph: 'https://…' }],
  reseaux: [{ k: 'instagram', l: 'Instagram' }, { k: 'facebook', l: 'Facebook' }, { k: 'tiktok', l: 'TikTok' }],
  contact: [{ k: 'whatsapp', l: 'Numéro WhatsApp', ph: '+221 77 …' }, { k: 'message', l: 'Message préparé' }],
  rdv: [{ k: 'lien', l: 'Lien de prise de rendez-vous', ph: 'https://…' }],
  lien: [{ k: 'lien', l: 'Adresse du lien', ph: 'https://…' }],
};
export const VAL = (v: unknown) => (v === true ? 'Oui' : v === false ? 'Non' : String(v));
export const TONE = (s: string) => (['livree', 'livre', 'teste'].includes(s) ? 'green' : ['envoyee', 'a_parametrer'].includes(s) ? 'red' : 'gold');
