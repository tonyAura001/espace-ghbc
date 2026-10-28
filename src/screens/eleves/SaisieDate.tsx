/** Saisie de date au format français JJ/MM/AAAA (indépendante de la langue du navigateur). */
import { useEffect, useState } from 'react'
import { Saisie } from '../../ui/base'

function versFr(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return ''
  const [a, m, j] = iso.split('-')
  return `${j}/${m}/${a}`
}

export function SaisieDate({ valeur, onChange, max, autoFocus }: { valeur: string; onChange: (iso: string) => void; max?: string; autoFocus?: boolean }) {
  const [texte, setTexte] = useState(versFr(valeur))
  useEffect(() => {
    if (valeur && versFr(valeur) !== texte) setTexte(versFr(valeur))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valeur])
  const changer = (brut: string) => {
    const d = brut.replace(/\D/g, '').slice(0, 8)
    let t = d
    if (d.length > 4) t = `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
    else if (d.length > 2) t = `${d.slice(0, 2)}/${d.slice(2)}`
    setTexte(t)
    if (d.length === 8) {
      const iso = `${d.slice(4)}-${d.slice(2, 4)}-${d.slice(0, 2)}`
      const ok = !Number.isNaN(Date.parse(iso)) && Number(d.slice(2, 4)) <= 12 && Number(d.slice(0, 2)) <= 31 && (!max || iso <= max)
      onChange(ok ? iso : '')
    } else onChange('')
  }
  return <Saisie value={texte} onChange={(e) => changer(e.target.value)} placeholder="JJ/MM/AAAA" inputMode="numeric" className="tabulaire" autoFocus={autoFocus} aria-label="Date de naissance" />
}
