# Espace GHBC : maquette de démonstration

Maquette interactive haute fidélité de la plateforme de gestion scolaire du **Groupe Scolaire Hadja Bountouraby Camara** (crèche, maternelle, primaire, collège). Toutes les données sont **fictives** et générées dans le navigateur : il n’y a ni serveur, ni base de données, ni appel à internet.

## Lancer la démonstration

```bash
npm install
npm run dev          # http://localhost:5180
```

- Mot de passe de l’écran d’accès : `ghbc2026` (modifiable dans `src/config.ts`).
- Écran de connexion : choisissez un profil dans « Accès rapide » (double-clic pour entrer directement), ou cliquez « Recevoir le code » puis « Saisir le code reçu ».

> L’écran de mot de passe est une **simple simulation côté client** : il évite qu’un visiteur tombe par hasard sur la démo, mais il ne protège rien. Le site est en plus marqué `noindex` (en-tête `X-Robots-Tag` et `robots.txt`). Ne mettez jamais de vraies données dans cette maquette.

## Touches du mode présentation

| Touche | Effet |
|---|---|
| **P** | Ouvre ou ferme la barre de présentation (texte « À dire », gestes, minuteur) |
| **→** ou **Espace** | Étape suivante (ou deuxième temps de l’étape) |
| **←** | Étape précédente |
| **R** | Remet toute la démo à zéro, sans recharger |
| **T** | Masque ou affiche le minuteur |
| **D** | Masque ou affiche le badge « Démo » |
| **V** | Vue double : ordinateur et téléphone de la maman côte à côte |
| **L** | Coupe ou relance le flux d’événements simulés (paiements, arrivées) |
| **Ctrl K** / **⌘ K** | Recherche globale |

Le déroulé complet est dans [`scenario.md`](scenario.md) ; la version de secours (une page par étape avec capture) est `secours-scenario.pdf`.

## Modifier les données

- **Paramètres** (école, pays, ville, date de démo, effectif, couleurs, mot de passe, URL publique) : `src/config.ts`.
  - `DATE_DEMO: 'auto'` prend la date du jour ; mettez par exemple `'2026-11-18'` pour figer tous les chiffres.
  - `HEURE_DEMO: 'auto'` suit l’heure réelle (entre 9 h 45 et 17 h) ; `'10:30'` fige l’heure.
  - `PAYS: 'Sénégal'` bascule niveaux, monnaie (FCFA), noms, téléphones et mobile money.
- **Grille tarifaire** : `src/config.ts` (`PAYS_DATA.tarifs`), ou à l’écran dans Paramètres.
- **Volumes, noms, comportements de paiement, notes, présences** : `src/data/generer.ts` (graine `CONFIG.GRAINE`). Même graine et même date : mêmes données.
- **Listes de noms et quartiers** : `src/data/noms.ts`. **Matières, compétences, jalons** : `src/data/referentiel.ts`.
- **Textes du scénario** : `src/presentation/scenario.ts` (valeurs calculées entre accolades, par exemple `{encaisseAujourdhui}`).

Contrôle rapide des volumes générés : `npx tsx scripts/stats.ts`.

## Construire

```bash
npm run build           # dist/ prêt pour Vercel
npm run build:offline   # ghbc-demo.html : un seul fichier, s’ouvre par double-clic, sans internet
npm run test:e2e        # joue tout le scénario au clavier, deux fois, avec R entre les deux
npm run secours         # régénère secours-scenario.pdf (captures de chaque étape)
```

## Déployer sur Vercel, pas à pas

La démo est déjà en ligne : **https://espace-ghbc.vercel.app** (mot de passe `ghbc2026`), et `URL_PUBLIQUE` est renseignée. Pour redéployer après une modification : `vercel deploy --prod`. Pour repartir de zéro sur un autre compte :

1. Créez un compte sur [vercel.com](https://vercel.com) (gratuit) et installez l’outil : `npm i -g vercel@latest`.
2. Dans ce dossier, connectez-vous : `vercel login`.
3. Premier déploiement de prévisualisation : `vercel`. Répondez :
   - *Set up and deploy?* : **Y**
   - *Which scope?* : votre compte
   - *Link to existing project?* : **N**
   - *Project name* : `espace-ghbc` (ou autre)
   - *In which directory is your code located?* : `./`
   - Les réglages détectés (Vite, `npm run build`, `dist`) sont les bons : validez.
4. Mise en production : `vercel --prod`. Notez l’adresse obtenue, par exemple `https://espace-ghbc.vercel.app`.
5. **Important pour les QR codes** : copiez cette adresse dans `src/config.ts`, champ `URL_PUBLIQUE`, puis redéployez avec `vercel --prod`. Les QR des reçus et des cartes pointeront alors vers cette adresse : scannés avec un vrai téléphone, ils ouvrent la page « Reçu authentique » ou « Carte authentique ».
6. Vérifiez : ouvrez l’adresse, entrez le mot de passe, imprimez un reçu, scannez son QR avec votre téléphone.

`vercel.json` ajoute l’en-tête `X-Robots-Tag: noindex, nofollow, noarchive` sur toutes les pages, et `public/robots.txt` interdit l’indexation.

## Organisation du code

```
src/config.ts          paramètres (un seul fichier)
src/data/              types, générateur déterministe, référentiels, noms
src/store/             store Zustand (actions + audit), sélecteurs, profils et droits
src/ui/                design system : composants, cadres téléphone / tablette, QR, documents imprimables
src/shell/             coquille : navigation par rôle, en-tête, recherche, notifications, profils
src/screens/           écrans de l’école, par module
src/parent/ src/eleve/ espace parent et espace élève (téléphone)
src/public/            pages publiques : vérification de reçu et de carte, pré-inscription
src/presentation/      mode présentation et scénario
scripts/               captures, statistiques, PDF de secours, copie de la version hors ligne
e2e/                   test de bout en bout du scénario
```
