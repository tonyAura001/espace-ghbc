/** Listes de noms, prénoms, quartiers et métiers selon le pays (§6 du brief). */
import { CONFIG } from '../config'

const GUINEE = {
  noms: [
    'Diallo', 'Bah', 'Barry', 'Sow', 'Condé', 'Keïta', 'Kouyaté', 'Soumah', 'Sylla', 'Bangoura', 'Touré', 'Kaba',
    'Baldé', 'Cissé', 'Kourouma', 'Traoré', 'Doumbouya', 'Fofana', 'Konaté', 'Sakho', 'Kanté', 'Diakité',
    'Chérif', 'Haïdara', 'Millimono', 'Loua', 'Guilavogui', 'Kamano', 'Yansané', 'Sangaré', 'Bérété', 'Doré',
    'Tounkara', 'Magassouba', 'Fadiga', 'Sidibé', 'Komara', 'Oularé', 'Bangaly', 'Kolié',
  ],
  // les noms les plus fréquents sont répétés pour une distribution réaliste
  nomsFrequents: ['Diallo', 'Diallo', 'Diallo', 'Bah', 'Bah', 'Barry', 'Barry', 'Sow', 'Condé', 'Keïta', 'Sylla', 'Bangoura', 'Soumah', 'Touré'],
  prenomsM: [
    'Mamadou', 'Alpha', 'Ibrahima', 'Abdoulaye', 'Ousmane', 'Amadou', 'Mohamed', 'Sékou', 'Lansana', 'Boubacar',
    'Thierno', 'Aboubacar', 'Mamady', 'Fodé', 'Moussa', 'Souleymane', 'Karamoko', 'Saïdou', 'Ismaël', 'Cellou',
    'Oumar', 'Alseny', 'Mory', 'Naby', 'Kabinet', 'Facinet', 'Yaya', 'Lamine', 'Sidiki', 'Abdourahmane',
    'Elhadj Ousmane', 'Mamadou Saliou', 'Mamadou Aliou', 'Ibrahima Sory', 'Amara', 'Seydouba', 'Daouda', 'Habib',
  ],
  prenomsF: [
    'Mariama', 'Fatoumata', 'Kadiatou', 'Aïssatou', 'Hawa', 'Mariame', 'Fanta', 'Aminata', 'Djénabou', 'Oumou',
    'Ramatoulaye', 'Kadija', 'Nènè', 'Bintou', 'Saran', 'Makalé', 'Fatou', 'Asmaou', 'Safiatou', 'Mabinty',
    'Hadiatou', 'Halimatou', 'Salématou', 'M’Balia', 'Sira', 'Kankou', 'Diaka', 'Tenin', 'Fatoumata Binta',
    'Mariama Ciré', 'Aïssata', 'Rouguiatou', 'Hassanatou', 'Adama', 'Nafissatou', 'Zénab', 'Mamata', 'Sadio',
  ],
  quartiers: [
    'Kipé', 'Nongo', 'Lambanyi', 'Kaloum', 'Dixinn', 'Taouyah', 'Cosa', 'Hamdallaye', 'Bambeto', 'Kaporo',
    'Sonfonia', 'Matoto', 'Kagbelen', 'Cimenterie', 'Camayenne', 'Minière', 'Koloma', 'Dar es Salam', 'Yimbaya',
    'Ratoma Centre', 'Kobaya', 'Lansanaya', 'Simbaya', 'Enco 5',
  ],
  prefixesTel: ['620', '621', '622', '623', '624', '625', '626', '627', '628', '660', '661', '662', '664', '666', '669', '610', '611'],
}

const SENEGAL = {
  noms: [
    'Diop', 'Ndiaye', 'Fall', 'Sow', 'Ba', 'Sy', 'Gueye', 'Faye', 'Sarr', 'Mbaye', 'Thiam', 'Seck', 'Diallo', 'Cissé',
    'Ndao', 'Kane', 'Dieng', 'Niang', 'Diouf', 'Sall', 'Wade', 'Mbengue', 'Ly', 'Camara', 'Touré', 'Diagne', 'Lo',
    'Sène', 'Badji', 'Sagna', 'Tall', 'Kâ',
  ],
  nomsFrequents: ['Diop', 'Diop', 'Ndiaye', 'Ndiaye', 'Fall', 'Sow', 'Ba', 'Gueye', 'Sarr', 'Faye'],
  prenomsM: [
    'Mamadou', 'Moussa', 'Ibrahima', 'Cheikh', 'Abdoulaye', 'Ousmane', 'Modou', 'Serigne', 'Pape', 'Babacar',
    'Aliou', 'Mouhamed', 'Alioune', 'Khadim', 'Assane', 'Lamine', 'Malick', 'Saliou', 'Omar', 'Idrissa', 'Souleymane',
    'Amadou', 'El Hadji', 'Djibril', 'Moustapha', 'Seydou', 'Birame', 'Ndiaga', 'Matar', 'Elimane',
  ],
  prenomsF: [
    'Fatou', 'Aminata', 'Awa', 'Mariama', 'Fatoumata', 'Khady', 'Aïssatou', 'Ndèye', 'Coumba', 'Astou', 'Bineta',
    'Rokhaya', 'Seynabou', 'Mame Diarra', 'Adja', 'Khadija', 'Yacine', 'Ndeye Fatou', 'Maimouna', 'Sokhna', 'Penda',
    'Dieynaba', 'Oumou', 'Ramatoulaye', 'Anta', 'Ngoné', 'Marème', 'Nafissatou', 'Codou', 'Salimata',
  ],
  quartiers: [
    'Mermoz', 'Sacré-Cœur', 'Ouakam', 'Yoff', 'Point E', 'Fann', 'Liberté 6', 'Grand Yoff', 'Parcelles Assainies',
    'Médina', 'Plateau', 'Almadies', 'Ngor', 'HLM', 'Sicap Baobab', 'Castors', 'Dieuppeul', 'Hann Maristes', 'Keur Massar',
  ],
  prefixesTel: ['77', '78', '76', '70', '75'],
}

export const NOMS = CONFIG.PAYS === 'Sénégal' ? SENEGAL : GUINEE

export const PROFESSIONS_H = [
  'Commerçant', 'Enseignant', 'Fonctionnaire', 'Médecin', 'Ingénieur', 'Comptable', 'Chauffeur', 'Transitaire',
  'Banquier', 'Entrepreneur', 'Juriste', 'Agent d’ONG', 'Mécanicien', 'Informaticien', 'Pharmacien', 'Militaire',
  'Agent minier', 'Architecte', 'Gendarme', 'Électricien',
]
export const PROFESSIONS_F = [
  'Commerçante', 'Enseignante', 'Fonctionnaire', 'Infirmière', 'Couturière', 'Sage-femme', 'Comptable', 'Pharmacienne',
  'Banquière', 'Coiffeuse', 'Juriste', 'Agent d’ONG', 'Restauratrice', 'Secrétaire', 'Entrepreneure', 'Médecin',
  'Assistante administrative', 'Femme au foyer', 'Esthéticienne', 'Journaliste',
]

/** Numéro de téléphone formaté selon le pays (espaces insécables : le numéro ne se coupe jamais). */
export function formatTel(prefix: string, digits: number[]): string {
  if (CONFIG.PAYS === 'Sénégal') {
    // +221 7X XXX XX XX
    const d = digits.join('')
    return `+221 ${prefix} ${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)}`.replace(/ /g, '\u00a0')
  }
  // +224 6XX XX XX XX
  const d = digits.join('')
  return `+224 ${prefix} ${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 6)}`.replace(/ /g, '\u00a0')
}
