import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
import './workbench.css'
import { loadAtlasData, CatalogueLoadError } from './atlas-loader.js'

const container = document.querySelector('#app')
async function start() {
  container.replaceChildren()
  const status = document.createElement('p')
  status.className = 'startup-status'
  status.setAttribute('role', 'status')
  status.textContent = 'Loading your learning catalogue…'
  container.append(status)
  try {
    const { dataset, loadDetail } = await loadAtlasData({ baseUrl: `${import.meta.env.BASE_URL}atlas-data/` })
    createApp(App, { dataset, loadDetail }).mount(container)
  } catch (error) {
    status.setAttribute('role', 'alert')
    status.textContent = error instanceof CatalogueLoadError ? error.message : 'Your learning catalogue could not be loaded. Check your connection and try again.'
    const retry = document.createElement('button')
    retry.textContent = error.action === 'reload' ? 'Reload catalogue' : 'Try again'
    retry.addEventListener('click', error.action === 'reload' ? () => window.location.reload() : start, { once: true })
    container.append(retry)
    console.error(error)
  }
}
start()
