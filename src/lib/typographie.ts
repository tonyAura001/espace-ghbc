/**
 * Typographie française automatique sur tout le texte affiché :
 * espace insécable avant « : », espace fine insécable avant « ; ! ? », espaces insécables dans « … ».
 * Agit uniquement sur les nœuds de texte (jamais sur les champs de saisie).
 */
const AVANT_DEUX_POINTS = /(^|[^\s\u00a0\u202f(/]) :(?=\s|$)/g
const AVANT_PONCTUATION = /(^|[^\s\u00a0\u202f]) ([;!?])(?=\s|$|»)/g
const GUILLEMET_OUVRANT = /« /g
const GUILLEMET_FERMANT = / »/g

export function corriger(t: string): string {
  return t
    .replace(AVANT_DEUX_POINTS, '$1 :')
    .replace(AVANT_PONCTUATION, '$1 $2')
    .replace(GUILLEMET_OUVRANT, '« ')
    .replace(GUILLEMET_FERMANT, ' »')
}

const IGNORER = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE'])

function traiter(n: Node) {
  if (n.nodeType === Node.TEXT_NODE) {
    const p = n.parentNode as HTMLElement | null
    if (p && IGNORER.has(p.nodeName)) return
    const v = n.nodeValue ?? ''
    if (!/[ ][:;!?»]|« /.test(v)) return
    const c = corriger(v)
    if (c !== v) n.nodeValue = c
    return
  }
  if (n.nodeType === Node.ELEMENT_NODE && IGNORER.has(n.nodeName)) return
  n.childNodes.forEach(traiter)
}

export function activerTypographie(racine: HTMLElement) {
  traiter(racine)
  new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'characterData') traiter(m.target)
      else m.addedNodes.forEach(traiter)
    }
  }).observe(racine, { subtree: true, childList: true, characterData: true })
}
