/** Connexion par numéro de téléphone + code à 6 chiffres (simulé), avec accès rapide aux profils de démo. */
import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, MessageSquareText } from 'lucide-react'
import { useStore } from '../store'
import { PROFILS, profilParId } from '../store/profils'
import { nomPersonnel, indexPersonnel, indexFamilles } from '../store/selecteurs'
import { CONFIG } from '../config'
import { Avatar, Bouton, Saisie, cx } from '../ui/base'
import { latence } from '../ui/hooks'
import { ID } from '../data/generer'

export default function Connexion() {
  const s = useStore()
  const connecter = useStore((st) => st.connecter)
  const nav = useNavigate()
  const [profilId, setProfilId] = useState<string>('direction')
  const [etape, setEtape] = useState<'tel' | 'code'>('tel')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [codeEnvoye, setCodeEnvoye] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const telDe = (id: string) => {
    const p = profilParId(id)
    if (p.role === 'parent') return indexFamilles(s.familles)[ID.famille].mere!.tel
    if (p.role === 'eleve') return indexFamilles(s.familles)[ID.famille].mere!.tel.replace(/(\d\d)$/, '91')
    return indexPersonnel(s.personnel)[p.userId]?.tel ?? ''
  }
  const [tel, setTel] = useState(() => telDe('direction'))

  const groupes = useMemo(
    () => [
      { titre: 'Direction', ids: ['promoteur', 'direction', 'comptable', 'responsable_cycle'] },
      { titre: 'Administration et accueil', ids: ['secretariat', 'caissier', 'portail', 'admin_tech'] },
      { titre: 'Équipe pédagogique', ids: ['educatrice', 'enseignant', 'professeur', 'vie_scolaire', 'infirmier', 'cantine_transport'] },
      { titre: 'Familles', ids: ['parent', 'eleve'] },
    ],
    [],
  )

  const choisir = (id: string) => {
    setProfilId(id)
    setTel(telDe(id))
    setEtape('tel')
    setCode(['', '', '', '', '', ''])
    setErreur(null)
  }

  const envoyer = async () => {
    setEnCours(true)
    await latence(450, 700)
    setEnCours(false)
    const c = String(100000 + Math.floor(Math.random() * 900000))
    setCodeEnvoye(c)
    setEtape('code')
    setTimeout(() => refs.current[0]?.focus(), 50)
  }
  const valider = async (valeur = code.join('')) => {
    if (valeur.length < 6) return setErreur('Saisissez les 6 chiffres reçus par SMS.')
    if (valeur !== codeEnvoye) return setErreur('Ce code ne correspond pas. Vérifiez le SMS ou demandez un nouveau code.')
    setEnCours(true)
    await latence(400, 650)
    setEnCours(false)
    connecter(profilId)
    nav(profilParId(profilId).accueil)
  }
  const remplir = () => {
    const c = codeEnvoye.split('')
    setCode(c)
    valider(codeEnvoye)
  }

  return (
    <div className="min-h-dvh bg-brume grid min-[64rem]:grid-cols-[minmax(22rem,30rem)_1fr]">
      <div className="bg-white border-r border-ligne flex flex-col justify-between p-[clamp(1.5rem,3vw,3rem)]">
        <div className="w-full max-w-xl max-[63.99rem]:mx-auto">
          <img src={CONFIG.LOGO_COULEUR} alt={CONFIG.ECOLE} className="h-16 w-auto" />
          <h1 className="text-[1.9rem] mt-8">Bienvenue sur {CONFIG.NOM_PLATEFORME}</h1>
          <p className="text-encre-2 mt-2">Connectez-vous avec votre numéro de téléphone. Un code à 6 chiffres vous est envoyé par SMS.</p>

          {etape === 'tel' ? (
            <form onSubmit={(e) => { e.preventDefault(); envoyer() }} className="mt-8 space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-encre-2">Numéro de téléphone</span>
                <div className="relative mt-1.5">
                  <Phone className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-encre-3" />
                  <Saisie value={tel} onChange={(e) => setTel(e.target.value)} className="pl-9 text-lg tabulaire" inputMode="tel" />
                </div>
              </label>
              <Bouton type="submit" taille="lg" className="w-full" chargement={enCours}>Recevoir le code</Bouton>
            </form>
          ) : (
            <div className="mt-8 space-y-4">
              <div className="rounded-xl bg-bleu-clair text-bleu px-4 py-3 flex gap-3 items-start">
                <MessageSquareText className="size-5 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">SMS envoyé au {tel}</div>
                  <div className="text-encre">« {CONFIG.SIGLE} : votre code de connexion est {codeEnvoye.slice(0, 3)} {codeEnvoye.slice(3)}. Il expire dans 5 minutes. »</div>
                </div>
              </div>
              <div>
                <span className="text-sm font-semibold text-encre-2">Code reçu</span>
                <div className="flex gap-2 mt-1.5">
                  {code.map((c, i) => (
                    <input
                      key={i}
                      ref={(el) => { refs.current[i] = el }}
                      value={c}
                      inputMode="numeric"
                      maxLength={1}
                      aria-label={`Chiffre ${i + 1}`}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '').slice(-1)
                        const n = [...code]
                        n[i] = v
                        setCode(n)
                        setErreur(null)
                        if (v && i < 5) refs.current[i + 1]?.focus()
                        if (v && i === 5) valider(n.join(''))
                      }}
                      onKeyDown={(e) => { if (e.key === 'Backspace' && !code[i] && i > 0) refs.current[i - 1]?.focus() }}
                      className="w-12 h-14 text-center text-2xl chiffre rounded-lg border border-ligne focus:border-bleu focus:outline-none focus:ring-3 focus:ring-bleu/15"
                    />
                  ))}
                </div>
                {erreur && <p className="text-rouge text-sm mt-2">{erreur}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Bouton taille="lg" onClick={() => valider()} chargement={enCours}>Se connecter</Bouton>
                <Bouton variante="secondaire" taille="lg" onClick={remplir} data-testid="code-auto">Saisir le code reçu</Bouton>
              </div>
              <button onClick={() => setEtape('tel')} className="text-bleu font-semibold hover:underline">Changer de numéro</button>
            </div>
          )}
        </div>
        <div className="text-sm text-encre-3 mt-10 w-full max-w-xl max-[63.99rem]:mx-auto">
          {CONFIG.ECOLE} · {CONFIG.VILLE}
          {CONFIG.SIGNATURE && <div className="mt-1">{CONFIG.SIGNATURE}</div>}
        </div>
      </div>

      <div className="p-[clamp(1.5rem,3vw,3rem)] overflow-y-auto">
        <h2 className="text-xl">Accès rapide aux profils de démonstration</h2>
        <p className="text-encre-2 mt-1">Chaque profil voit uniquement ce que son rôle permet.</p>
        <div className="mt-6 space-y-6">
          {groupes.map((g) => (
            <div key={g.titre}>
              <div className="text-encre-2 font-semibold mb-2">{g.titre}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-2">
                {g.ids.map((id) => {
                  const p = PROFILS.find((x) => x.id === id)!
                  const nom = nomPersonnel(s, p.userId)
                  const [a, b] = nom.split(' ')
                  return (
                    <button
                      key={id}
                      onClick={() => choisir(id)}
                      onDoubleClick={() => { connecter(id); nav(p.accueil) }}
                      data-testid={`profil-${id}`}
                      className={cx('flex items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left transition-colors', profilId === id ? 'border-bleu ring-2 ring-bleu/20' : 'border-ligne hover:border-bleu-ligne')}
                    >
                      <Avatar prenom={a ?? ''} nom={b ?? ''} taille={40} />
                      <span className="min-w-0">
                        <span className="block font-semibold truncate">{nom}</span>
                        <span className="block text-encre-2 text-sm">{p.libelle}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
