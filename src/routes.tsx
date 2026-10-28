/** Table des routes. Chaque écran est un fichier de src/screens (ou src/parent, src/eleve, src/public). */
import type { ReactElement } from 'react'
import Accueil from './screens/Accueil'
import VerifRecu from './public/VerifRecu'
import VerifCarte from './public/VerifCarte'
import PreInscription from './public/PreInscription'
import PageParent from './parent/PageParent'
import EspaceEleve from './eleve/EspaceEleve'
import Validations from './screens/finance/Validations'
import Audit from './screens/Audit'
import ListeEleves from './screens/eleves/ListeEleves'
import FicheEleve from './screens/eleves/FicheEleve'
import Inscription from './screens/eleves/Inscription'
import DemandesInscription from './screens/eleves/DemandesInscription'
import StudioCartes from './screens/cartes/StudioCartes'
import PlancheCartes from './screens/cartes/PlancheCartes'
import Portail from './screens/cartes/Portail'
import TableauCreche from './screens/creche/TableauCreche'
import JournalTablette from './screens/creche/JournalTablette'
import Remise from './screens/creche/Remise'
import Competences from './screens/maternelle/Competences'
import Livret from './screens/maternelle/Livret'
import SaisieNotes from './screens/primaire/SaisieNotes'
import Bulletins from './screens/primaire/Bulletins'
import BulletinApercu from './screens/primaire/BulletinApercu'
import EmploiDuTemps from './screens/college/EmploiDuTemps'
import Appel from './screens/college/Appel'
import NotesCollege from './screens/college/NotesCollege'
import Conseil from './screens/college/Conseil'
import VieScolaire from './screens/vie/VieScolaire'
import Encaisser from './screens/finance/Encaisser'
import Recus from './screens/finance/Recus'
import RecuApercu from './screens/finance/RecuApercu'
import Cloture from './screens/finance/Cloture'
import Impayes from './screens/finance/Impayes'
import TableauFinancier from './screens/finance/TableauFinancier'
import Depenses from './screens/finance/Depenses'
import Rapprochement from './screens/finance/Rapprochement'
import Communication from './screens/vie/Communication'
import Sante from './screens/services/Sante'
import Cantine from './screens/services/Cantine'
import Transport from './screens/services/Transport'
import Garderie from './screens/services/Garderie'
import Personnel from './screens/services/Personnel'
import Parametres from './screens/admin/Parametres'
import Exports from './screens/admin/Exports'

export interface DefRoute {
  path: string
  element: ReactElement
}

/** Pages publiques ouvertes par les QR codes et la pré-inscription (sans mot de passe). */
export const ROUTES_PUBLIQUES: DefRoute[] = [
  { path: '/verifier/recu/:jeton', element: <VerifRecu /> },
  { path: '/verifier/carte/:jeton', element: <VerifCarte /> },
  { path: '/preinscription', element: <PreInscription /> },
]

/** Espace parent et espace élève (plein écran, cadre de téléphone sur ordinateur). */
export const ROUTES_FAMILLES: DefRoute[] = [
  { path: '/parent', element: <PageParent /> },
  { path: '/eleve', element: <EspaceEleve /> },
]

/** Écrans de l’école (dans la coquille). */
export const ROUTES_ECOLE: DefRoute[] = [
  { path: '/accueil', element: <Accueil /> },
  { path: '/validations', element: <Validations /> },
  { path: '/audit', element: <Audit /> },
  { path: '/eleves', element: <ListeEleves /> },
  { path: '/eleves/:id', element: <FicheEleve /> },
  { path: '/eleves/:id/:onglet', element: <FicheEleve /> },
  { path: '/inscription', element: <Inscription /> },
  { path: '/inscriptions', element: <DemandesInscription /> },
  { path: '/cartes', element: <StudioCartes /> },
  { path: '/cartes/planche', element: <PlancheCartes /> },
  { path: '/portail', element: <Portail /> },
  { path: '/creche', element: <TableauCreche /> },
  { path: '/creche/journal', element: <JournalTablette /> },
  { path: '/creche/remise', element: <Remise /> },
  { path: '/maternelle', element: <Competences /> },
  { path: '/maternelle/livret/:eleveId', element: <Livret /> },
  { path: '/primaire/notes', element: <SaisieNotes /> },
  { path: '/bulletins', element: <Bulletins /> },
  { path: '/bulletin/:eleveId', element: <BulletinApercu /> },
  { path: '/college/emploi-du-temps', element: <EmploiDuTemps /> },
  { path: '/college/appel', element: <Appel /> },
  { path: '/college/notes', element: <NotesCollege /> },
  { path: '/college/conseil', element: <Conseil /> },
  { path: '/vie-scolaire', element: <VieScolaire /> },
  { path: '/caisse', element: <Encaisser /> },
  { path: '/caisse/recus', element: <Recus /> },
  { path: '/caisse/recu/:id', element: <RecuApercu /> },
  { path: '/caisse/cloture', element: <Cloture /> },
  { path: '/impayes', element: <Impayes /> },
  { path: '/finance', element: <TableauFinancier /> },
  { path: '/depenses', element: <Depenses /> },
  { path: '/rapprochement', element: <Rapprochement /> },
  { path: '/communication', element: <Communication /> },
  { path: '/sante', element: <Sante /> },
  { path: '/cantine', element: <Cantine /> },
  { path: '/transport', element: <Transport /> },
  { path: '/garderie', element: <Garderie /> },
  { path: '/personnel', element: <Personnel /> },
  { path: '/parametres', element: <Parametres /> },
  { path: '/exports', element: <Exports /> },
]
