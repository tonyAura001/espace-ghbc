// Copie dist-offline/index.html vers ghbc-demo.html (fichier unique, s'ouvre par double-clic, sans internet).
import { copyFileSync, statSync } from 'node:fs'
copyFileSync('dist-offline/index.html', 'ghbc-demo.html')
const ko = Math.round(statSync('ghbc-demo.html').size / 1024)
console.log(`ghbc-demo.html généré (${ko} Ko)`)
