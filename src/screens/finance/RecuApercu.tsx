/** Reçu : aperçu A5 ou ticket 80 mm, impression, vérification par QR, demande d'annulation. */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer, Ban, ShieldCheck, ExternalLink } from 'lucide-react'
import { useStore } from '../../store'
import { profilParId, peut } from '../../store/profils'
import { indexFamilles, nomPersonnel } from '../../store/selecteurs'
import { Badge, Bouton, EnTetePage, Segments, Vide, Alerte, SqueletteTableau } from '../../ui/base'
import { ApercuImpression } from '../../ui/documents'
import { useChargement } from '../../ui/hooks'
import { money, numeroRecu } from '../../lib/format'
import { dateHeure } from '../../lib/temps'
import { lienRecu } from '../../lib/verif'
import { DocumentRecu } from './DocumentRecu'
import { ModaleAnnulation } from './ModaleAnnulation'
import { NOM_DIRECTION } from '../../config'

export default function RecuApercu() {
  const { id } = useParams()
  const s = useStore()
  const nav = useNavigate()
  const pret = useChargement(320)
  const [format, setFormat] = useState<'A5' | 'ticket'>('A5')
  const [apercu, setApercu] = useState(false)
  const [annuler, setAnnuler] = useState(false)
  const p = s.paiements.find((x) => x.id === id)
  const role = profilParId(s.session.profilId).role
  if (!pret) return <SqueletteTableau lignes={6} />
  if (!p) return <Vide titre="Ce reçu est introuvable" texte="Vérifiez le numéro ou cherchez-le dans la liste des reçus." action={<Bouton onClick={() => nav('/caisse/recus')}>Voir les reçus</Bouton>} />
  const f = indexFamilles(s.familles)[p.familleId]
  const v = s.validations.find((x) => x.type === 'annulation_recu' && x.objetId === p.id)
  const lien = lienRecu(s, p)

  return (
    <div>
      <EnTetePage
        retour={<Link to="/caisse/recus" className="inline-flex items-center gap-1.5 text-bleu font-semibold mb-2 hover:underline"><ArrowLeft className="size-4" /> Tous les reçus</Link>}
        titre={<span className="flex items-center gap-3">Reçu {numeroRecu(p.numero)} <StatutRecu statut={p.statut} /></span>}
        sousTitre={`Famille ${f?.nom} · ${money(p.montant)} · ${dateHeure(p.date)}`}
        actions={
          <>
            <Segments className="max-sm:w-full [&>button]:max-sm:flex-1" options={[{ id: 'A5', libelle: 'Format A5' }, { id: 'ticket', libelle: 'Ticket 80 mm' }]} valeur={format} onChange={setFormat} />
            <Bouton icone={<Printer className="size-4" />} className="max-sm:flex-1" onClick={() => setApercu(true)} data-testid="imprimer-recu">Imprimer</Bouton>
            {p.statut === 'valide' && peut(role, 'demanderAnnulation') && (
              <Bouton variante="danger" icone={<Ban className="size-4" />} className="max-sm:flex-1" onClick={() => setAnnuler(true)} data-testid="demander-annulation">Demander l’annulation</Bouton>
            )}
          </>
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_20rem] 2xl:grid-cols-[1fr_22rem] gap-6 items-start">
        <div className="bg-[#e3e8ef] rounded-2xl p-3 sm:p-6">
          <AJuste>
            <div className="shadow-[0_8px_30px_rgba(1,42,94,0.18)] bg-white">
              <DocumentRecu paiement={p} format={format} />
            </div>
          </AJuste>
        </div>
        <div className="space-y-4">
          {p.statut === 'annulation_demandee' && (
            <Alerte ton="ambre" titre="Annulation en attente">
              Demandée par {nomPersonnel(s, p.annulation?.demandeurId)} : « {p.annulation?.motif} ». {NOM_DIRECTION.charAt(0).toUpperCase() + NOM_DIRECTION.slice(1)} doit valider.
            </Alerte>
          )}
          {p.statut === 'annule' && (
            <Alerte ton="rouge" titre="Reçu annulé">
              Motif : {p.annulation?.motif}. Validé par {nomPersonnel(s, p.annulation?.valideurId)}. Le reçu reste dans la série pour la traçabilité.
            </Alerte>
          )}
          {v?.statut === 'refusee' && <Alerte ton="bleu" titre="Annulation refusée">La Direction a refusé l’annulation : le reçu reste valide.</Alerte>}
          <section className="bg-white rounded-xl border border-ligne p-5">
            <h2 className="text-[1.05rem] flex items-center gap-2"><ShieldCheck className="size-5 text-vert-texte" /> Vérification par QR code</h2>
            <p className="text-encre-2 mt-1.5">Le QR code ne contient qu’un jeton signé. Scanné avec n’importe quel téléphone, il ouvre la page « Reçu authentique ».</p>
            <a href={lien} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-bleu font-semibold hover:underline">
              Ouvrir la page de vérification <ExternalLink className="size-4" />
            </a>
          </section>
          <section className="bg-white rounded-xl border border-ligne p-5">
            <h2 className="text-[1.05rem]">Pourquoi pas de bouton « Supprimer » ?</h2>
            <p className="text-encre-2 mt-1.5">Les reçus sont numérotés sans trou. Un reçu erroné s’annule par une écriture inverse, avec motif et validation de la Direction : la trace reste dans la série et dans le journal d’audit.</p>
          </section>
        </div>
      </div>
      <ApercuImpression
        ouvert={apercu}
        onFermer={() => setApercu(false)}
        titre={`Reçu ${numeroRecu(p.numero)}`}
        format={format}
        onImprimer={() => s.journaliser('Paiement', 'Reçu imprimé', `${numeroRecu(p.numero)} · ${format === 'A5' ? 'format A5' : 'ticket 80 mm'}`)}
      >
        <DocumentRecu paiement={p} format={format} />
      </ApercuImpression>
      <ModaleAnnulation paiement={annuler ? p : null} onFermer={() => setAnnuler(false)} />
    </div>
  )
}

/** Réduit le document pour qu'il tienne dans la largeur disponible (téléphone, tablette), sans jamais l'agrandir. */
function AJuste({ children }: { children: ReactNode }) {
  const cadre = useRef<HTMLDivElement>(null)
  const contenu = useRef<HTMLDivElement>(null)
  const [dim, setDim] = useState({ e: 1, l: 0, h: 0 })
  useEffect(() => {
    const c = cadre.current
    const d = contenu.current
    if (!c || !d) return
    const mesurer = () => {
      const l = d.offsetWidth
      const h = d.offsetHeight
      setDim({ e: Math.min(1, c.clientWidth / Math.max(1, l)), l, h })
    }
    mesurer()
    const ro = new ResizeObserver(mesurer)
    ro.observe(c)
    ro.observe(d)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={cadre} className="w-full">
      <div className="relative mx-auto" style={dim.l ? { width: dim.l * dim.e, height: dim.h * dim.e } : undefined}>
        <div ref={contenu} className={dim.l ? 'absolute left-0 top-0 w-max' : 'w-max mx-auto'} style={{ transform: `scale(${dim.e})`, transformOrigin: 'top left' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export function StatutRecu({ statut }: { statut: 'valide' | 'annulation_demandee' | 'annule' }) {
  if (statut === 'annule') return <Badge ton="rouge">Annulé</Badge>
  if (statut === 'annulation_demandee') return <Badge ton="ambre">Annulation demandée</Badge>
  return <Badge ton="vert">Valide</Badge>
}
