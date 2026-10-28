/** Vrai QR code scannable (bibliothèque qrcode, rendu SVG net à l'impression). */
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function QR({ valeur, taille = 120, className }: { valeur: string; taille?: number; className?: string }) {
  const [svg, setSvg] = useState<string>('')
  useEffect(() => {
    let vivant = true
    QRCode.toString(valeur, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#14213D', light: '#FFFFFF' } }).then((s) => {
      if (vivant) setSvg(s)
    })
    return () => {
      vivant = false
    }
  }, [valeur])
  return (
    <div
      className={className}
      style={{ width: taille, height: taille }}
      role="img"
      aria-label="QR code de vérification"
      dangerouslySetInnerHTML={{ __html: svg.replace('<svg ', `<svg width="${taille}" height="${taille}" `) }}
    />
  )
}
