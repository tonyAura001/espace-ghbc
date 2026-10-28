import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { activerTypographie } from './lib/typographie'

const racine = document.getElementById('root')!
createRoot(racine).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
// les fenêtres en portail (aperçus d'impression) sont rattachées à body : on surveille tout le document
activerTypographie(document.body)
