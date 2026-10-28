# Espace GHBC : règles pour les sessions suivantes

Maquette interactive haute fidélité de la plateforme de gestion scolaire du Groupe Scolaire Hadja Bountouraby Camara (crèche, maternelle, primaire, collège), présentée au promoteur et à la Direction. Le brief complet est dans `docs/BRIEF-maquette-GHBC.md`.

## Règles non négociables

1. **Leur école, partout** : logo, couleurs (#0249A2, #02A73A) et nom sur l’interface, les documents, les cartes, les reçus, les messages.
2. **Réalisme total** : noms, téléphones, montants, moyens de paiement et vocabulaire du pays (`src/config.ts`), année 2026-2027, dates cohérentes avec `DATE_DEMO`.
3. **Cohérence absolue des chiffres** : un seul store (`src/store`). Tout chiffre affiché sort d’un sélecteur (`src/store/selecteurs.ts`), jamais écrit en dur dans un composant.
4. **Tout fonctionne** : chaque action modifie l’état et tout ce qui en dépend se met à jour en direct.
5. **Zéro bouton mort** : aucun lorem ipsum, aucun mot d’anglais visible, aucun « TODO », aucun « bientôt disponible ».
6. **Sensation de vrai logiciel** : latence simulée de 300 à 700 ms (`useAction`), squelettes (`useChargement`), confirmations, notifications.
7. **Traçabilité visible** : chaque action passe par une action du store qui écrit dans le journal d’audit (ajout seul).
8. **Parents sur téléphone** : l’espace parent s’affiche dans `CadreTelephone`, en plein écran sur un vrai téléphone.
9. **Honnêteté discrète** : données fictives, jamais de photo (initiales), badge « Démo » masquable (touche D), ne jamais utiliser « Hadja Bountouraby Camara » pour un personnage.

## Repères techniques

- Vite + React + TypeScript + Tailwind 4, HashRouter, Zustand, Recharts, lucide-react, Motion, qrcode, date-fns `fr`.
- 100 % front-end, aucune ressource distante à l’exécution (polices @fontsource, sous-ensemble latin).
- Données générées au démarrage par `src/data/generer.ts` (graine fixe) ; `reinitialiser()` régénère sans recharger.
- Typographie française : apostrophe ’, guillemets « », espaces insécables (` `, ` `) avant : ; ! ? et dans les nombres ; virgule décimale.
- Unités fluides, pas de hauteur fixe qui coupe le contenu ; vérifier à 1920×1080, 1536×864, 1366×768, 1280×720 et 390×844.
- QR : le QR ne contient qu’un jeton signé (`src/lib/jeton.ts`, `src/lib/verif.ts`) ; les pages `/verifier/...` sont publiques.
- Vérifier : `npx tsc -p tsconfig.app.json --noEmit`, `npm run captures`, `npm run test:e2e`.
