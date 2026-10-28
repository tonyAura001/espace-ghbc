/** Planche d'impression A4 : 10 cartes CR80 par page (2 × 5), recto puis verso pour l'impression recto verso. */
import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Trash2, Eye } from 'lucide-react'
import { useStore } from '../../store'
import type { Carte } from '../../data/types'
import { Badge, Bloc, Bouton, Case, EnTetePage, Vide, Avatar, Alerte, SqueletteTableau, Liste } from '../../ui/base'
import { useChargement } from '../../ui/hooks'
import { ApercuImpression } from '../../ui/documents'
import { CarteRecto, CarteVerso, infoCarte, numeroCarte, usePlanche, LIBELLE_TYPE_CARTE } from './CarteCR80'
import { CONFIG } from '../../config'
import { dateCourte, JOUR_DEMO } from '../../lib/temps'
import { nombre } from '../../lib/format'

const PAR_PAGE = 10

export default function PlancheCartes() {
  const s = useStore()
  const pret = useChargement()
  const [params] = useSearchParams()
  const planche = usePlanche()
  const [apercu, setApercu] = useState(false)
  const [extra, setExtra] = useState<string[]>([])

  const aImprimer = useMemo(() => s.cartes.filter((c) => c.statut === 'active' && !c.imprimee), [s.cartes])

  // par défaut : les cartes non imprimées + celles choisies dans le studio
  useEffect(() => {
    const st = usePlanche.getState()
    const ajout = params.get('ajout')
    const base = new Set([...st.ids, ...aImprimer.map((c) => c.id)])
    if (ajout) base.add(ajout)
    st.definir([...base])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selection = useMemo(() => planche.ids.map((id) => s.cartes.find((c) => c.id === id)).filter((c): c is Carte => !!c && c.statut === 'active'), [planche.ids, s.cartes])
  const candidates = useMemo(() => {
    const ids = new Set(selection.map((c) => c.id))
    const autres = [...aImprimer, ...extra.map((id) => s.cartes.find((c) => c.id === id)).filter((c): c is Carte => !!c)]
    return [...selection, ...autres.filter((c, i, t) => !ids.has(c.id) && t.findIndex((x) => x.id === c.id) === i)]
  }, [selection, aImprimer, extra, s.cartes])
  const pages = Math.max(1, Math.ceil(selection.length / PAR_PAGE))

  const ajouterClasse = (classeId: string) => {
    if (!classeId) return
    const ids = s.eleves.filter((e) => e.classeId === classeId && e.statut === 'actif').map((e) => s.cartes.find((c) => c.type === 'eleve' && c.titulaireId === e.id && c.statut === 'active')?.id).filter((x): x is string => !!x)
    ids.forEach((id) => planche.ajouter(id))
    setExtra((x) => [...new Set([...x, ...ids])])
    const cl = s.classes.find((c) => c.id === classeId)
    s.toast({ titre: `${ids.length} cartes ajoutées`, texte: `Classe ${cl?.nom}, pour réimpression.`, niveau: 'succes' })
  }

  const imprimer = () => {
    s.imprimerCartes(selection.map((c) => c.id))
    s.toast({ titre: 'Planche envoyée à l’imprimante', texte: `${selection.length} carte${selection.length > 1 ? 's' : ''} au format CR80, recto et verso.`, niveau: 'succes' })
    setTimeout(() => planche.vider(), 800)
  }

  return (
    <div>
      <EnTetePage
        retour={<Link to="/cartes" className="inline-flex items-center gap-1.5 text-bleu font-semibold mb-2 hover:underline"><ArrowLeft className="size-4" /> Studio des cartes</Link>}
        titre="Planche d’impression"
        sousTitre={`Feuille A4, 10 cartes de 85,6 × 54 mm par page, traits de coupe inclus · ${nombre(selection.length)} carte${selection.length > 1 ? 's' : ''} sélectionnée${selection.length > 1 ? 's' : ''}, ${pages * 2} pages (recto puis verso)`}
        actions={
          <>
            <Bouton variante="secondaire" icone={<Trash2 className="size-4" />} onClick={() => planche.vider()} disabled={!selection.length}>Vider la planche</Bouton>
            <Bouton icone={<Eye className="size-4" />} onClick={() => setApercu(true)} disabled={!selection.length} data-testid="apercu-planche">Aperçu et impression</Bouton>
          </>
        }
      />
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(20rem,26rem)_1fr] gap-5 items-start">
        <Bloc
          titre="Cartes à imprimer"
          sansMarge
          actions={
            <Liste aria-label="Ajouter une classe entière" value="" onChange={(e) => ajouterClasse(e.target.value)} className="py-1.5! text-sm! w-auto!">
              <option value="">Ajouter une classe…</option>
              {s.classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </Liste>
          }
        >
          {!pret ? (
            <SqueletteTableau lignes={6} />
          ) : candidates.length === 0 ? (
            <Vide titre="Aucune carte en attente" texte="Toutes les cartes actives sont imprimées. Ajoutez une classe entière ci-dessus, ou une carte depuis le studio." action={<Link to="/cartes"><Bouton variante="secondaire">Ouvrir le studio</Bouton></Link>} />
          ) : (
            <ul className="max-h-[calc(100dvh-16rem)] overflow-y-auto defilement">
              {candidates.map((c) => {
                const i = infoCarte(s, c)
                const coche = planche.ids.includes(c.id)
                return (
                  <li key={c.id} className="flex items-center gap-3 px-5 py-2.5 border-t border-ligne-2">
                    <Case checked={coche} onChange={(v) => (v ? planche.ajouter(c.id) : planche.retirer(c.id))} libelle={<span className="sr-only">Sélectionner</span>} />
                    <Avatar prenom={i.prenom} nom={i.nom} taille={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold truncate">{i.prenom} {i.nom}</span>
                      <span className="block text-sm text-encre-2 truncate">{LIBELLE_TYPE_CARTE[c.type]} · {i.ligne1}</span>
                    </span>
                    {!c.imprimee ? <Badge ton="ambre">Nouvelle</Badge> : <Badge>Réimpression</Badge>}
                  </li>
                )
              })}
            </ul>
          )}
        </Bloc>
        <Bloc titre="Page 1 · recto">
          {selection.length === 0 ? (
            <Vide titre="La planche est vide" texte="Cochez des cartes dans la liste ou ajoutez-en depuis le studio." />
          ) : (
            <div className="overflow-x-auto defilement">
              <div className="border border-ligne shadow-sm overflow-hidden" style={{ width: 'calc(210mm * 0.62)', height: 'calc(297mm * 0.62)' }}>
                <div style={{ transform: 'scale(0.62)', transformOrigin: 'top left', width: '210mm' }}>
                  <Feuille cartes={selection.slice(0, PAR_PAGE)} face="recto" page={1} total={pages * 2} />
                </div>
              </div>
            </div>
          )}
          <div className="mt-3">
            <Alerte ton="bleu" titre="Conseil d’impression">Imprimez à 100 % (sans « ajuster à la page »), sur papier cartonné 250 g, puis plastifiez. Le verso est inversé pour l’impression recto verso bord long.</Alerte>
          </div>
        </Bloc>
      </div>

      <ApercuImpression ouvert={apercu} onFermer={() => setApercu(false)} titre={`Planche de ${selection.length} carte${selection.length > 1 ? 's' : ''}`} onImprimer={imprimer} actions={<span className="text-white/70 text-sm mr-2 hidden xl:inline">{pages * 2} pages</span>}>
        {Array.from({ length: pages }).map((_, p) => {
          const lot = selection.slice(p * PAR_PAGE, (p + 1) * PAR_PAGE)
          return (
            <Fragment key={p}>
              <Feuille cartes={lot} face="recto" page={p * 2 + 1} total={pages * 2} />
              <Feuille cartes={lot} face="verso" page={p * 2 + 2} total={pages * 2} />
            </Fragment>
          )
        })}
      </ApercuImpression>
    </div>
  )
}

/** Une feuille A4 : 2 colonnes × 5 rangées, traits de coupe autour de chaque carte. */
function Feuille({ cartes, face, page, total }: { cartes: Carte[]; face: 'recto' | 'verso'; page: number; total: number }) {
  const s = useStore()
  const cases: (Carte | null)[] = Array.from({ length: PAR_PAGE }, (_, i) => cartes[i] ?? null)
  // au verso, les colonnes sont inversées pour que chaque verso tombe derrière son recto
  const ordre = face === 'verso' ? cases.map((_, i) => cases[i % 2 === 0 ? i + 1 : i - 1]) : cases
  return (
    <div className="bg-white relative" style={{ width: '210mm', height: '297mm', boxSizing: 'border-box', padding: '7.5mm 0 0 17.4mm', breakAfter: 'page' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '85.6mm 85.6mm', columnGap: '4mm', rowGap: '3mm' }}>
        {ordre.map((c, i) => (
          <div key={i} style={{ width: '85.6mm', height: '54mm', outline: '0.2mm dashed #9AA6B8', outlineOffset: '0.9mm', borderRadius: '3.2mm' }}>
            {c && (face === 'recto' ? <CarteRecto s={s} carte={c} /> : <CarteVerso s={s} carte={c} />)}
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', left: '17.4mm', right: '17.4mm', bottom: '2.5mm', display: 'flex', justifyContent: 'space-between', fontSize: '7pt', color: '#6B7690' }}>
        <span>{CONFIG.SIGLE} · planche de cartes du {dateCourte(JOUR_DEMO)} · {face}</span>
        <span>{cartes.map(numeroCarte).slice(0, 1)}{cartes.length > 1 ? ` à ${numeroCarte(cartes[cartes.length - 1])}` : ''} · page {page} / {total}</span>
      </div>
    </div>
  )
}
