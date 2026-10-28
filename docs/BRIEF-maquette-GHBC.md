# Brief Claude Code — Maquette interactive « Espace GHBC »

Tu es à la fois lead designer produit et développeur front-end senior. Tu construis la maquette interactive haute fidélité d'une plateforme de gestion scolaire complète pour le **Groupe Scolaire Hadja Bountouraby Camara (GHBC)** : crèche, maternelle, primaire et collège.

Elle sera présentée au promoteur et à la direction de l'école pour remporter le projet. Pendant la démonstration, ils doivent avoir l'impression d'utiliser la vraie plateforme, déjà en service chez eux.

---

## 0. Paramètres (vérifie-les avant de commencer)

```
ECOLE              = Groupe Scolaire Hadja Bountouraby Camara
SIGLE              = GHBC
NOM_PLATEFORME     = Espace GHBC
PAYS               = Guinée          # ou Sénégal (voir §6) — À CONFIRMER
VILLE              = Conakry         # à confirmer
ANNEE_SCOLAIRE     = 2026-2027
DATE_DEMO          = auto            # date du jour, ou une date fixe AAAA-MM-JJ pour figer les chiffres
EFFECTIF_TOTAL     = 820             # à ajuster aux vrais effectifs de l'école si on les connaît
LOGO_COULEUR       = assets/logo-ghbc.png
LOGO_BLANC         = assets/logo-ghbc-blanc.png   # pour les fonds foncés
BLEU_MARQUE        = #0249A2         # relevé sur le logo
VERT_MARQUE        = #02A73A         # relevé sur le logo
NOM_DIRECTION      =                 # vide → « la Direction » ; sinon ex. « M. Diallo »
MOT_DE_PASSE_DEMO  = ghbc2026
URL_PUBLIQUE       =                 # à remplir après le 1er déploiement Vercel (sert aux QR codes)
SIGNATURE          =                 # optionnel : « Conçu par … » en pied de l'écran de connexion
```

Tous ces paramètres vivent dans un seul fichier : `src/config.ts`.

---

## 1. Le public et ce qu'il doit ressentir

Public : le promoteur, la direction, le ou la comptable. Peu technophiles, très attentifs à cinq choses :

1. **l'argent** : encaissements, impayés, fraude aux reçus ;
2. **la sécurité des enfants** : qui entre, qui sort, qui récupère qui ;
3. **l'image de l'école** auprès des parents ;
4. **le temps gagné** : bulletins, inscriptions, relances ;
5. **le contrôle** : savoir qui a fait quoi.

Critère de réussite : au bout de deux minutes, ils oublient que c'est une maquette et demandent quand on commence.

---

## 2. Règles de persuasion (non négociables)

1. **Leur école, partout.** Logo, couleurs et nom sur l'interface, les en-têtes de documents, les cartes, les reçus, les messages aux parents.
2. **Réalisme total.** Noms, numéros de téléphone, montants, moyens de paiement et vocabulaire du pays ; année 2026-2027 ; toutes les dates cohérentes avec `DATE_DEMO`.
3. **Cohérence absolue des chiffres.** Toutes les données viennent d'un seul store. Chaque chiffre affiché est calculé par un sélecteur, jamais écrit en dur dans un composant. Le total des effectifs = la somme des classes ; l'encaissé du jour = la somme des reçus du jour ; etc.
4. **Tout fonctionne.** Chaque action modifie l'état, et tout ce qui en dépend se met à jour en direct : une note → la moyenne → le bulletin ; un paiement → le reçu → le solde de la famille → l'accueil direction → le journal d'audit.
5. **Zéro bouton mort.** Chaque clic produit un résultat crédible : écran, panneau, confirmation, aperçu d'impression. Aucun lorem ipsum, aucun mot d'anglais, aucun « TODO », aucun « bientôt disponible ».
6. **Sensation de vrai logiciel.** Latences simulées de 300 à 700 ms avec squelettes de chargement, confirmations, notifications qui arrivent, recherche globale instantanée.
7. **La traçabilité se voit.** Chaque action faite pendant la démo s'inscrit à l'instant dans le journal d'audit.
8. **Les parents sont sur téléphone.** L'espace parent s'affiche dans un cadre de téléphone pendant la présentation, et en plein écran sur un vrai téléphone.
9. **Honnêteté discrète.** Données 100 % fictives. Jamais de photo d'une personne réelle : initiales dans un cercle coloré ou avatar illustré neutre. Un petit badge « Démo » dans l'en-tête, masquable (touche D). N'utilise pas le nom « Hadja Bountouraby Camara » pour un personnage fictif.

---

## 3. Stack et contraintes techniques

- Vite + React + TypeScript + Tailwind CSS.
- React Router en **HashRouter** (fonctionne en ligne et en fichier local).
- Zustand pour l'état global, avec une réinitialisation complète.
- Recharts pour les graphiques ; lucide-react pour les icônes ; Motion (ex-Framer Motion) pour deux ou trois transitions seulement ; `qrcode` pour de vrais QR codes scannables ; date-fns en `fr`.
- 100 % front-end : aucun backend, aucune API. Les données sont générées au démarrage par un script déterministe (graine fixe) dans `src/data/`.
- Aucune ressource distante à l'exécution : polices auto-hébergées (@fontsource, woff2), icônes locales, pas de CDN, pas d'image distante.
- Montants : `Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'GNF' ou 'XOF', maximumFractionDigits: 0 })`.
- Typographie française soignée dans toute l'interface : apostrophe ’, guillemets « », espaces insécables avant : ; ! ? et dans les nombres.
- Deux sorties :
  - `npm run build` → `dist/` prêt pour Vercel ;
  - `npm run build:offline` → un seul fichier `ghbc-demo.html` autonome (vite-plugin-singlefile) qui s'ouvre par double-clic, sans internet.
- Vercel : `vercel.json` avec l'en-tête `X-Robots-Tag: noindex, nofollow, noarchive`, un `robots.txt` qui interdit tout, et un écran de mot de passe (simple simulation côté client, présentée comme telle dans le README).
- **Règle préventive Mac / Windows** : unités fluides (rem, clamp), aucune hauteur fixe qui coupe du contenu, piles de polices de secours, points de rupture 1280 / 1440 / 1920. L'interface doit rester impeccable avec la mise à l'échelle Windows à 125 % et 150 % (fenêtres effectives 1536×864 et 1280×720).

---

## 4. Direction artistique

Commence par un plan de design : 4 à 6 couleurs nommées avec leur hex, les typographies et leurs rôles, le principe de mise en page, les principes. Relis-le avant de coder et corrige tout ce qui ressemble aux clichés des interfaces générées : fond crème avec accent terracotta, fond noir avec accent fluo, grille de cartes identiques avec la même ombre grise, dégradés décoratifs, petites étiquettes en majuscules espacées au-dessus des titres.

- **Ton** : le sérieux d'une banque, la chaleur d'une école. Fond clair (blanc et bleu-gris très léger).
- **Couleurs** : bleu de marque pour la navigation et les actions principales ; vert de marque pour ce qui est acquis (payé, présent, validé) ; ambre pour l'attention ; rouge pour le blocage. Contraste AA minimum, pensé pour un vidéoprojecteur.
- **Code couleur des cycles**, toujours le même, en petites pastilles et filets (jamais en grands aplats) : Crèche = corail doux, Maternelle = jaune soleil, Primaire = bleu, Collège = vert.
- **Typographie** : deux familles nettement distinctes, par exemple Lexend pour les titres et chiffres clés (conçue pour la lisibilité, lien naturel avec l'école) et Source Sans 3 pour le texte et les tableaux (chiffres tabulaires). Un autre choix est possible s'il est justifié. Corps ≥ 15 px, chiffres clés ≥ 28 px : lisible à trois mètres.
- **Mise en page** : barre latérale par module ; en-tête avec recherche globale (Ctrl/⌘ K), année scolaire, notifications et sélecteur de profil ; tableaux denses mais aérés ; une hiérarchie claire plutôt qu'une mosaïque de cartes.
- **L'élément mémorable** : l'accueil de la direction, « Aujourd'hui à GHBC », une vue vivante de l'école (présents par cycle, encaissé depuis le matin, alertes, dernières actions) qui bouge pendant la démo. Tout le reste reste sobre.
- **Mouvement** : une transition soignée au changement de profil et un comptage animé des chiffres de l'accueil ; ailleurs, seulement des réponses aux actions. Respecte `prefers-reduced-motion`.
- **Rédaction** : phrases courtes, verbes d'action, une action garde le même nom de bout en bout (« Encaisser » → « Paiement encaissé »). Pas de flèche « → » dans les boutons. Les erreurs disent comment corriger.

---

## 5. Données fictives

- **Volumes** (à caler sur `EFFECTIF_TOTAL`) : environ 820 élèves — crèche 36 (3 groupes), maternelle 150 (6 classes), primaire 384 (12 classes), collège 256 (8 classes) ; environ 70 membres du personnel ; environ 600 familles (fratries de 1 à 4 enfants).
- Noms, prénoms et numéros de téléphone typiques du pays (§6). Âges cohérents avec le niveau, quelques redoublants. Matricule `AAAA-NNNNN`, conservé à vie.
- **Finance** : grille tarifaire du §6 ; échéancier d'octobre à juin (9 mensualités) ; historique des paiements jusqu'à `DATE_DEMO` ; recouvrement global autour de 80 %, variable selon les classes ; 6 à 8 % de familles en retard ; modes réalistes (mobile money majoritaire, puis espèces, virement, chèque) ; remise fratrie de 10 % dès le 2e enfant ; quelques bourses.
- **Pédagogie** : évaluations du 1er trimestre avec quelques cases vides ; compétences en maternelle ; journal du jour de la crèche rempli jusqu'à l'heure courante ; présences depuis la rentrée (moyenne autour de 93 %) ; quelques incidents au collège ; une note corrigée (v1 → v2, avec motif).
- **La famille fil rouge** (elle porte tout le scénario) :
  - Guinée : famille Bah. Kadiatou Sow, la mère, utilise l'espace parent ; Alpha Bah, le père ; Mamadou Bah, l'oncle, autorisé à récupérer les enfants. Trois enfants : Mariama, 2 ans, crèche (groupe des Grands) ; Ibrahima, 9 ans, 4e année ; Fatoumata, 14 ans, 9e année, avec une mensualité en retard.
  - Sénégal : famille Diop, même composition (Ibrahima en CE2, Fatoumata en 3e).

---

## 6. Adaptation au pays (selon `PAYS`)

| | Guinée | Sénégal |
|---|---|---|
| Primaire | 1re à 6e année | CI, CP, CE1, CE2, CM1, CM2 |
| Collège | 7e à 10e année | 6e, 5e, 4e, 3e |
| Fin du primaire | Examen d'entrée en 7e année | CFEE et entrée en 6e |
| Fin du collège | BEPC | BFEM |
| Monnaie | GNF | FCFA (XOF) |
| Mobile money | Orange Money et autres portefeuilles | Wave, Orange Money |
| Téléphones | +224 6XX XX XX XX | +221 7X XXX XX XX |
| Noms courants | Diallo, Bah, Barry, Sow, Condé, Keïta, Kouyaté, Soumah, Sylla, Bangoura, Touré, Kaba | Diop, Ndiaye, Fall, Sow, Ba, Sy, Gueye, Faye, Sarr, Mbaye, Thiam, Seck |

Grille tarifaire **fictive** (à remplacer par la vraie grille de l'école dès qu'on l'a) :

| Frais | Guinée (GNF) | Sénégal (FCFA) |
|---|---|---|
| Inscription | 500 000 | 50 000 |
| Réinscription | 300 000 | 30 000 |
| Crèche, par mois | 900 000 | 75 000 |
| Maternelle, par mois | 450 000 | 35 000 |
| Primaire, par mois | 500 000 | 40 000 |
| Collège, par mois | 650 000 | 50 000 |
| Cantine, par mois | 250 000 | 20 000 |
| Transport, par mois | 300 000 | 20 000 |
| Tenue | 250 000 | 15 000 |
| Frais d'examen | 150 000 | 10 000 |

Trimestres dans tous les cycles ; notes sur 10 au primaire, sur 20 au collège ; rang affiché (désactivable dans Paramètres).

---

## 7. Règles métier (issues de la modélisation du système)

- **Structure** : établissement → année → cycle → niveau → classe. L'**inscription** (un élève, une classe, une année) est le pivot : elle porte le contrat financier, les notes, les présences et les bulletins.
- **Traçabilité** : rien ne s'efface (on annule ou on archive, avec un motif) ; chaque action garde qui, quand, quoi, avant et après ; une case vide n'est jamais un zéro ; corriger une note publiée crée une nouvelle version ; reçus numérotés sans trou, un reçu annulé reste dans la série ; périodes et journées de caisse clôturées verrouillées ; double validation pour une remise exceptionnelle, une annulation de reçu, une correction après conseil, une radiation ; ouvrir une fiche santé est journalisé ; le journal d'audit est en ajout seul.
- **Crèche** : groupes Bébés, Trotteurs, Grands ; journal du jour (arrivée, repas, sieste, change, soin, incident, activité, départ) ; ratio enfants par adulte en direct ; remise de l'enfant uniquement à un adulte autorisé (carte accompagnateur) ; jalons de développement, sans note.
- **Maternelle** : PS, MS, GS ; compétences par domaine (Acquis, En cours, Pas encore, Non évalué) ; livret trimestriel ; ni note ni rang.
- **Primaire** : domaine → discipline → évaluation → note ; moyennes recalculées à chaque saisie (discipline, domaine, générale) ; bulletin trimestriel validé par la direction ; examen de fin de cycle.
- **Collège** : enseignement = classe × matière × professeur × coefficient ; emploi du temps avec conflits signalés ; appel à chaque cours ; moyenne de matière = (moyenne des devoirs + composition) ÷ 2 ; moyenne générale = Σ(moyenne × coefficient) ÷ Σ coefficients des matières notées ; conseil de classe (distinctions, avertissements, décisions) ; discipline graduée ; examen de fin de cycle.
- **Finance** : grille → contrat → échéances (à venir, due, en retard, partielle, payée) → paiement ventilé sur une ou plusieurs échéances, éventuellement de plusieurs enfants → reçu numéroté avec QR → clôture de caisse (comptage par billets et pièces, écart justifié) → rapprochement mobile money. Annuler = écriture inverse + motif + validation. Relances journalisées ; le système alerte, la direction décide.
- **Carte** : trois types (élève, accompagnateur, personnel) ; le QR ne contient qu'un jeton ; une carte perdue est désactivée puis remplacée ; chaque scan est journalisé.
- **Rôles** (séparation des tâches) : promoteur, direction générale, responsable de cycle, vie scolaire, secrétariat, comptable, caissier, enseignant, éducatrice, infirmier, agent du portail, cantine et transport, parent, élève (collège), administrateur technique. Celui qui encaisse n'annule pas ; celui qui note ne publie pas le bulletin.

---

## 8. Écrans à construire

### Priorité 1 — parfaits (ils portent le scénario)

- Écran de mot de passe, puis connexion par numéro de téléphone + code à 6 chiffres (simulé), avec accès rapide aux profils de démo.
- Accueil direction « Aujourd'hui à GHBC ».
- Liste des élèves (recherche ; filtres par cycle, classe, statut, impayés) et fiche élève à onglets : identité, famille, scolarité, notes ou compétences, présences, santé (accès journalisé), finance, carte, documents, historique.
- Inscription d'un nouvel élève en 4 étapes → matricule, contrat, échéancier, carte.
- Carte : studio recto / verso, planche d'impression A4 de 10 cartes au format CR80, écran du portail (scan simulé, résultat autorisé ou refusé, alerte).
- Crèche : tableau du jour (présents, adultes, ratio), journal du jour sur tablette (saisie en deux touches), remise de l'enfant.
- Primaire : grille de saisie des notes (recalcul instantané), aperçu A4 du bulletin, imprimable.
- Collège : emploi du temps de la semaine, appel du cours sur téléphone, conseil de classe.
- Caisse : encaisser (famille → échéances → ventilation → mode → reçu) ; reçu imprimable (A5 et ticket 80 mm) avec QR ; annulation avec double validation ; clôture de caisse.
- Impayés et relances : par classe, relance groupée WhatsApp / SMS avec aperçu du message, plan de paiement.
- Journal d'audit en direct : filtres par utilisateur, élève, type d'action ; détail avant / après.
- Espace parent sur téléphone : accueil des enfants, journée de crèche, notes et bulletins (avec historique des versions), absences à justifier, paiement mobile money avec reçu, messages, autorisations.
- Pages publiques de vérification d'un reçu et d'une carte (ouvertes par le QR).

### Priorité 2 — complètes et crédibles

- Maternelle : grille de compétences par pastilles, livret trimestriel.
- Tableau de bord financier (encaissements par jour, recouvrement par cycle et par classe, échéances à venir, dépenses par catégorie, résultat par cycle) et dépenses avec pièce jointe.
- Vie scolaire : absences du jour, justificatifs, discipline.
- Communication : messages, annonces, cahier de liaison, autorisations parentales.
- Pré-inscription en ligne (page publique aux couleurs de GHBC) et suivi des demandes d'inscription.
- Espace élève (collège) : emploi du temps, devoirs, notes.

### Priorité 3 — présentes, simples mais réalistes

- Santé et infirmerie, cantine, transport (circuits, arrêts), garderie, personnel (dossiers, pointage, remplacements), paramètres (année, grille tarifaire, matrice des rôles), rapprochement mobile money, exports.

---

## 9. Les moments qui emportent la décision

1. **Le QR qui se vérifie pour de vrai** : sur l'URL publique, le QR d'un reçu ouvre la page « Reçu authentique » sur le téléphone du promoteur.
2. **Le paiement en direct** : en vue double (ordinateur et téléphone côte à côte), la mère paie par mobile money ; le reçu arrive sur son téléphone et l'accueil direction bouge à l'instant.
3. **La sortie sécurisée** : un adulte non autorisé se présente pour récupérer Mariama ; écran d'alerte, la mère est prévenue, l'incident est journalisé.
4. **Le bulletin en un clic** : aperçu A4 impeccable à l'en-tête de GHBC.
5. **Le reçu qu'on ne peut pas effacer** : la suppression n'existe pas ; l'annulation part en validation chez la direction.
6. **La journée du bébé** : la mère voit sur son téléphone le repas, la sieste et l'activité de Mariama.
7. **La relance qui part seule** : aperçu du message WhatsApp reçu par la famille.

La vue double et les cadres (téléphone, tablette) affichent le même composant dans le même arbre React, avec le même store — **pas d'iframe** — pour que chaque action se répercute instantanément.

---

## 10. Mode présentation et scénario (environ 12 minutes)

Touches : **P** ouvre ou ferme une barre discrète en bas de l'écran ; **→** ou **Espace** avance ; **←** recule ; **R** remet toute la démo à zéro sans recharger ; **T** masque le minuteur ; **D** masque le badge Démo ; **V** bascule la vue double ; **L** coupe ou relance le flux d'événements simulés de l'accueil (arrivées, paiements).

Chaque étape change de profil et d'écran avec la transition prévue, puis affiche le texte « À dire », les gestes à faire et le temps cible. Les textes peuvent contenir des valeurs calculées (`{presentsAujourdhui}`, `{encaisseAujourdhui}`) pour rester justes quelle que soit la date.

| # | Étape | Profil | Cible | À dire |
|---|---|---|---|---|
| 1 | Accueil « Aujourd'hui à GHBC » | Direction | 1:00 | « Voici votre école ce matin : {presentsAujourdhui} enfants présents, {encaisseAujourdhui} encaissés depuis 8 h, et les points qui demandent votre attention. Tout se met à jour en direct. » |
| 2 | Inscrire un nouvel élève | Secrétariat | 1:30 | « Une famille se présente : en trois minutes, l'enfant est inscrit, son échéancier est prêt et sa carte part à l'impression. Plus de registre, plus de double saisie. » |
| 3 | Carte et sortie sécurisée | Agent du portail | 1:15 | « Chaque enfant a sa carte. Au portail, un scan suffit. Et si quelqu'un qui n'est pas autorisé vient chercher un enfant, l'école le sait aussitôt et la maman est prévenue. » |
| 4 | La journée de la crèche | Éducatrice, puis parent | 1:00 | « L'éducatrice note la journée en quelques touches : repas, sieste, soins. La maman la reçoit sur son téléphone. C'est ce qui fait choisir une crèche. » |
| 5 | Notes et bulletin | Maître (primaire) | 1:30 | « Le maître saisit ses notes, la moyenne se calcule seule — une case vide n'est jamais un zéro — et le bulletin est prêt en un clic. » |
| 6 | Appel et conseil de classe | Professeur, puis surveillant | 1:15 | « Au collège, chaque professeur fait l'appel depuis son téléphone ; le surveillant voit les absences en direct et les parents sont prévenus. » |
| 7 | Le parent paie | Parent (vue double) | 1:30 | « La maman paie la mensualité depuis chez elle. Le reçu lui arrive aussitôt, et votre tableau de bord vient de bouger. » |
| 8 | Caisse et reçus | Caissier, puis direction | 1:15 | « Au guichet, chaque paiement donne un reçu numéroté. Scannez ce QR code : il confirme que le reçu est authentique. Un reçu ne se supprime jamais ; une annulation passe par vous. » |
| 9 | Impayés et relances | Comptable | 1:00 | « Les impayés, classe par classe. Une relance part en un clic par WhatsApp, et elle est tracée. Le système alerte, vous décidez. » |
| 10 | Traçabilité | Promoteur | 1:00 | « Tout ce que nous venons de faire est ici : qui, quand, quoi, avant et après. Personne, même un administrateur, ne peut effacer cette trace. » |

Durée totale visée : environ 12 minutes.

---

## 11. Livrables

- Code source propre et commenté ; `README.md` en français (lancer, touches, modifier les données dans `src/data/`, déployer sur Vercel).
- `scenario.md` : l'aide-mémoire papier des 10 étapes (gestes, texte, temps).
- `secours-scenario.pdf` : une page par étape avec sa capture d'écran, générée avec Playwright, au cas où le matériel lâche.
- `ghbc-demo.html` : la version hors ligne en un seul fichier.
- Configuration Vercel prête ; je lancerai le déploiement moi-même : guide-moi pas à pas.
- Un `CLAUDE.md` court qui reprend les règles non négociables, pour les sessions suivantes.

---

## 12. Méthode de travail

1. Lis tout ce brief. Présente-moi en 20 lignes maximum le plan de design (couleurs nommées, typographies, principe de mise en page, élément mémorable) et l'arborescence du projet. **Attends mon feu vert**, puis enchaîne en autonomie.
2. Construis dans cet ordre : configuration et design system (jetons, composants, cadres téléphone et tablette) → générateur de données et store → coquille (navigation, profils, recherche, notifications, journal d'audit) → écrans de priorité 1 dans l'ordre du scénario → mode présentation → priorité 2 → priorité 3 → builds et livrables. Si le temps manque, une priorité 1 parfaite passe avant tout le reste.
3. Après chaque bloc : lance le serveur, fais des captures Playwright en 1920×1080, 1536×864, 1366×768, 1280×720 et 390×844 (espace parent). Regarde-les d'un œil de client exigeant (débordements, alignements, lisibilité à distance, chiffres incohérents, textes génériques) et corrige avant de continuer.
4. Écris un test de bout en bout qui joue tout le scénario au clavier (P, →, actions de chaque étape) et vérifie que R remet tout à zéro, sans aucune erreur en console.

---

## 13. Contrôle final (tout doit être coché)

- [ ] Le scénario se joue de bout en bout sans accroc, deux fois de suite, avec R entre les deux.
- [ ] Aucun chiffre ne se contredit d'un écran à l'autre.
- [ ] Aucun bouton mort, aucun mot d'anglais, aucun texte de remplissage.
- [ ] Le logo est net partout, y compris sur les impressions (bulletin, reçu, carte).
- [ ] Les QR codes se scannent avec un vrai téléphone.
- [ ] Rendu impeccable aux cinq tailles d'écran et à 125 % / 150 % sous Windows.
- [ ] `ghbc-demo.html` fonctionne sans internet.
- [ ] Le journal d'audit contient toutes les actions faites pendant la démo.
