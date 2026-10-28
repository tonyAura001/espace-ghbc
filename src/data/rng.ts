/** Générateur pseudo-aléatoire déterministe (mulberry32) : même graine = mêmes données. */
export class Rng {
  private s: number
  constructor(seed: number) {
    this.s = seed >>> 0
  }
  next(): number {
    let t = (this.s += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)]
  }
  chance(p: number): boolean {
    return this.next() < p
  }
  /** Tirage pondéré : [[valeur, poids], …] */
  weighted<T>(items: [T, number][]): T {
    const total = items.reduce((a, [, w]) => a + w, 0)
    let r = this.next() * total
    for (const [v, w] of items) {
      r -= w
      if (r <= 0) return v
    }
    return items[items.length - 1][0]
  }
  /** Loi approximativement normale (somme de 3 uniformes). */
  normal(mean: number, sd: number): number {
    const u = (this.next() + this.next() + this.next() - 1.5) / 0.5
    return mean + u * sd
  }
  shuffle<T>(arr: T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  token(len = 12): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let s = ''
    for (let i = 0; i < len; i++) s += alphabet[Math.floor(this.next() * alphabet.length)]
    return s
  }
}
