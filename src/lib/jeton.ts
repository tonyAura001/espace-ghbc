/**
 * Jetons des QR codes. Le QR ne contient qu'un jeton opaque : les données sont brouillées
 * et signées (somme de contrôle), ce qui permet à la page publique de vérifier un reçu ou une carte
 * sur n'importe quel téléphone, sans serveur. Simulation de démonstration, pas de la cryptographie.
 */
const SECRET = 'GHBC-2026-2027-espace'

function fnv(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36).toUpperCase().padStart(7, '0')
}

function b64urlEncode(bytes: Uint8Array): string {
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlDecode(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4))
  return Uint8Array.from(b, (c) => c.charCodeAt(0))
}

function brouiller(bytes: Uint8Array): Uint8Array {
  const k = new TextEncoder().encode(SECRET)
  return bytes.map((b, i) => b ^ k[i % k.length] ^ (i * 31) & 0xff)
}

export function encoderJeton(data: Record<string, unknown>): string {
  const json = JSON.stringify(data)
  const corps = b64urlEncode(brouiller(new TextEncoder().encode(json)))
  return `${corps}.${fnv(corps + SECRET)}`
}

export function decoderJeton<T = Record<string, unknown>>(jeton: string): T | null {
  try {
    const [corps, sig] = jeton.split('.')
    if (!corps || !sig || fnv(corps + SECRET) !== sig) return null
    const json = new TextDecoder().decode(brouiller(b64urlDecode(corps)))
    return JSON.parse(json) as T
  } catch {
    return null
  }
}
