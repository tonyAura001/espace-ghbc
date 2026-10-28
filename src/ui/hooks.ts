/** Petits hooks partagés : latence simulée, horloge de démo, chargement de page. */
import { useCallback, useEffect, useState } from 'react'
import { useStore } from '../store'
import { minutesDemo } from '../lib/temps'

export const latence = (min = 300, max = 700) => new Promise<void>((r) => setTimeout(r, min + Math.random() * (max - min)))

/**
 * Exécute une action après une latence réaliste (300 à 700 ms), avec état « en cours ».
 * const [executer, enCours] = useAction()
 */
export function useAction(): [<T>(f: () => T | Promise<T>, delai?: [number, number]) => Promise<T>, boolean] {
  const [enCours, setEnCours] = useState(false)
  const executer = useCallback(async <T,>(f: () => T | Promise<T>, delai: [number, number] = [300, 700]) => {
    setEnCours(true)
    try {
      await latence(delai[0], delai[1])
      return await f()
    } finally {
      setEnCours(false)
    }
  }, [])
  return [executer, enCours]
}

/** Affiche un squelette pendant le premier chargement de l'écran. */
export function useChargement(ms = 380): boolean {
  const [pret, setPret] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setPret(true), ms)
    return () => clearTimeout(t)
  }, [ms])
  return pret
}

/** Horloge de la démo, rafraîchie toutes les 20 secondes. */
export function useMinutes(): number {
  const [m, setM] = useState(minutesDemo())
  useEffect(() => {
    const t = setInterval(() => setM(minutesDemo()), 20_000)
    return () => clearInterval(t)
  }, [])
  return m
}

export function useProfil() {
  return useStore((s) => s.session.profilId)
}
