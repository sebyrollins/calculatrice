/**
 * SRT Corrector Pro - Main Application Logic
 */

// État global de l'application
const AppState = {
  originalFilename: null,
  blocks: [],
  validatedCorrections: new Set(),
  activeFilter: null // null = tous, 'minor', 'major', 'doubt', 'none' (sans correction)
}

// Éléments DOM
const DOM = {
  uploadSection: null,
  loadingSection: null,
  editorSection: null,
  uploadForm: null,
  fileInput: null,
  fileInfo: null,
  fileName: null,
  fileSize: null,
  progressFill: null,
  progressText: null,
  correctedTextPanel: null,
  validationsPanel: null,
  statsBar: null,
  statTotal: null,
  statMinor: null,
  statMajor: null,
  statDoubt: null,
  validateAllBtn: null,
  validateMajorBtn: null,
  validateDoubtBtn: null,
  downloadSrtBtn: null,
  downloadTxtBtn: null,
  newFileBtn: null,
  blocksTableBody: null
}

/**
 * Initialisation de l'application
 */
document.addEventListener('DOMContentLoaded', () => {
  initDOM()
  initEventListeners()

  // Si un fichier a été uploadé via PHP, le traiter
  if (window.UPLOADED_FILE) {
    processUploadedFile(window.UPLOADED_FILE.content, window.UPLOADED_FILE.filename)
  }
})

/**
 * Initialise les références DOM
 */
function initDOM() {
  DOM.uploadSection = document.getElementById('uploadSection')
  DOM.loadingSection = document.getElementById('loadingSection')
  DOM.editorSection = document.getElementById('editorSection')
  DOM.uploadForm = document.getElementById('uploadForm')
  DOM.fileInput = document.getElementById('srtFile')
  DOM.fileInfo = document.getElementById('fileInfo')
  DOM.fileName = document.getElementById('fileName')
  DOM.fileSize = document.getElementById('fileSize')
  DOM.progressFill = document.getElementById('progressFill')
  DOM.progressText = document.getElementById('progressText')
  DOM.correctedTextPanel = document.getElementById('correctedTextPanel')
  DOM.validationsPanel = document.getElementById('validationsPanel')
  DOM.statsBar = document.getElementById('statsBar')
  DOM.statTotal = document.getElementById('statTotal')
  DOM.statMinor = document.getElementById('statMinor')
  DOM.statMajor = document.getElementById('statMajor')
  DOM.statDoubt = document.getElementById('statDoubt')
  DOM.validateAllBtn = document.getElementById('validateAllBtn')
  DOM.validateMajorBtn = document.getElementById('validateMajorBtn')
  DOM.validateDoubtBtn = document.getElementById('validateDoubtBtn')
  DOM.downloadSrtBtn = document.getElementById('downloadSrtBtn')
  DOM.downloadTxtBtn = document.getElementById('downloadTxtBtn')
  DOM.newFileBtn = document.getElementById('newFileBtn')
  DOM.blocksTableBody = document.getElementById('blocksTableBody')
}

/**
 * Initialise les écouteurs d'événements
 */
function initEventListeners() {
  // Upload de fichier
  if (DOM.fileInput) {
    DOM.fileInput.addEventListener('change', handleFileSelection)
  }

  if (DOM.uploadForm) {
    DOM.uploadForm.addEventListener('submit', handleFormSubmit)
  }

  // Boutons d'action
  if (DOM.validateAllBtn) {
    DOM.validateAllBtn.addEventListener('click', () => validateCorrections('all'))
  }

  if (DOM.validateMajorBtn) {
    DOM.validateMajorBtn.addEventListener('click', () => validateCorrections('major'))
  }

  if (DOM.validateDoubtBtn) {
    DOM.validateDoubtBtn.addEventListener('click', () => validateCorrections('doubt'))
  }

  if (DOM.downloadSrtBtn) {
    DOM.downloadSrtBtn.addEventListener('click', downloadSRT)
  }

  if (DOM.downloadTxtBtn) {
    DOM.downloadTxtBtn.addEventListener('click', downloadTXT)
  }

  if (DOM.newFileBtn) {
    DOM.newFileBtn.addEventListener('click', resetApp)
  }

  // Filtres de statistiques
  document.querySelectorAll('.stat-filter').forEach(filterBtn => {
    filterBtn.addEventListener('click', handleFilterClick)
  })
}

/**
 * Gestion de la sélection de fichier
 */
function handleFileSelection(event) {
  const file = event.target.files[0]

  if (file) {
    DOM.fileName.textContent = file.name
    DOM.fileSize.textContent = SRTParser.formatFileSize(file.size)
    DOM.fileInfo.style.display = 'flex'

    // Valider la taille
    if (file.size > window.APP_CONFIG.maxFileSize) {
      alert(`Le fichier est trop volumineux (max ${SRTParser.formatFileSize(window.APP_CONFIG.maxFileSize)})`)
      resetFileInput()
    }
  }
}

/**
 * Gestion de la soumission du formulaire
 */
function handleFormSubmit(event) {
  event.preventDefault()

  const file = DOM.fileInput.files[0]
  if (!file) {
    alert('Veuillez sélectionner un fichier')
    return
  }

  // Lire le fichier
  const reader = new FileReader()

  reader.onload = (e) => {
    const content = e.target.result
    processUploadedFile(content, file.name)
  }

  reader.onerror = () => {
    alert('Erreur lors de la lecture du fichier')
  }

  reader.readAsText(file)
}

/**
 * Traite un fichier uploadé
 */
async function processUploadedFile(content, filename) {
  // Valider le contenu
  const validation = SRTParser.validate(content)

  if (!validation.valid) {
    alert(`Fichier invalide : ${validation.error}`)
    return
  }

  AppState.originalFilename = filename

  // Afficher la section de chargement
  showSection('loading')

  try {
    // Envoyer au Worker Cloudflare
    updateProgress(10, 'Envoi au serveur...')

    const correctedBlocks = await sendToWorker(content, filename)

    updateProgress(90, 'Traitement des résultats...')

    // Sauvegarder les blocs
    AppState.blocks = correctedBlocks

    // Afficher l'éditeur
    updateProgress(100, 'Terminé !')

    setTimeout(() => {
      showEditor()
    }, 500)

  } catch (error) {
    console.error('Erreur lors du traitement:', error)
    alert(`Erreur : ${error.message}`)
    showSection('upload')
  }
}

/**
 * Envoie le contenu au Cloudflare Worker
 */
async function sendToWorker(content, filename) {
  // Vérifier que le Worker est configuré
  if (window.APP_CONFIG.workerUrl.includes('YOUR-SUBDOMAIN')) {
    throw new Error(`⚠️ Le Worker Cloudflare n'est pas encore configuré.\n\nÉtapes :\n1. Déployez le Worker sur Cloudflare\n2. Modifiez l'URL dans frontend/lib/config.php\n\nConsultez le README.md pour les instructions.`)
  }

  const response = await fetch(window.APP_CONFIG.workerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      srtContent: content,
      fileName: filename
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Erreur serveur: ${response.status}\n\nDétails: ${errorText}\n\nVérifiez que :\n1. Le Worker Cloudflare est déployé\n2. La clé ANTHROPIC_API_KEY est configurée\n3. L'URL du Worker est correcte dans config.php`)
  }

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.error || 'Erreur inconnue')
  }

  return result.data
}

/**
 * Affiche l'éditeur avec les résultats
 */
function showEditor() {
  showSection('editor')

  // Calculer les statistiques
  const stats = SRTParser.calculateStats(AppState.blocks)
  updateStats(stats)

  // Afficher le tableau des blocs
  renderBlocksTable()
}

/**
 * Affiche le tableau des blocs (texte + validations)
 */
function renderBlocksTable() {
  DOM.blocksTableBody.innerHTML = ''

  // Filtrer les blocs selon le filtre actif
  let blocksToDisplay = AppState.blocks

  if (AppState.activeFilter) {
    blocksToDisplay = AppState.blocks.filter(block => {
      if (!block.corrections || block.corrections.length === 0) {
        return false // Pas de corrections
      }

      // Vérifier si le bloc contient le type de correction recherché
      return block.corrections.some(c => c.type === AppState.activeFilter)
    })
  }

  blocksToDisplay.forEach(block => {
    const row = document.createElement('tr')
    row.className = 'block-row'
    row.id = `block-row-${block.index}`

    // Déterminer le type de correction dominant pour la classe CSS
    // Les blocs avec UNIQUEMENT des corrections mineures n'ont PAS de fond coloré
    let rowClass = 'row-no-correction'
    if (block.corrections && block.corrections.length > 0) {
      const hasDoubt = block.corrections.some(c => c.type === 'doubt')
      const hasMajor = block.corrections.some(c => c.type === 'major')

      if (hasDoubt) {
        rowClass = 'row-has-doubt'
      } else if (hasMajor) {
        rowClass = 'row-has-major'
      }
      // Si seulement des corrections mineures, on garde row-no-correction (pas de fond coloré)
    }
    row.classList.add(rowClass)

    // === COLONNE GAUCHE : Texte ===
    const textCell = document.createElement('td')
    textCell.className = 'cell-text'

    // Header
    const headerEl = document.createElement('div')
    headerEl.className = 'block-header'
    headerEl.innerHTML = `
      <span class="block-index">Bloc #${block.index}</span>
      <span class="block-timecode">${block.timecode}</span>
    `

    // Original - TOUJOURS afficher le vrai texte original sans modifications
    const originalEl = document.createElement('div')
    originalEl.className = 'block-section block-original'
    originalEl.innerHTML = `
      <div class="block-label">ORIGINAL :</div>
      <div class="block-content">${SRTParser.escapeHtml(block.original)}</div>
    `

    // Corrigé
    const correctedEl = document.createElement('div')
    correctedEl.className = 'block-section block-corrected'
    correctedEl.innerHTML = `
      <div class="block-label">CORRIGÉ :</div>
      <div class="block-content">${SRTParser.escapeHtml(block.corrected)}</div>
    `

    textCell.appendChild(headerEl)
    textCell.appendChild(originalEl)
    textCell.appendChild(correctedEl)

    // === COLONNE DROITE : Validations ===
    const validationCell = document.createElement('td')
    validationCell.className = 'cell-validation'

    if (!block.corrections || block.corrections.length === 0) {
      validationCell.innerHTML = `
        <div class="validation-empty">
          <span class="validation-empty-icon">✓</span>
          <span class="validation-empty-text">Aucune correction</span>
        </div>
      `
    } else {
      // Afficher TOUTES les corrections (y compris mineures)
      block.corrections.forEach((correction, corrIndex) => {
          const correctionId = `${block.index}-${corrIndex}`
          const cardEl = document.createElement('div')
          cardEl.className = `validation-card validation-${correction.type}`
          cardEl.id = `validation-${correctionId}`

          if (AppState.validatedCorrections.has(correctionId)) {
            cardEl.classList.add('validated')
          }

          cardEl.innerHTML = `
            <div class="validation-header">
              <span class="validation-type-badge badge-${correction.type}">
                ${correction.type === 'major' ? 'MAJEURE' : correction.type === 'doubt' ? 'DOUTE' : 'MINEURE'}
              </span>
            </div>
            <div class="validation-correction">
              <div class="validation-correction-text">
                <span class="original">${SRTParser.escapeHtml(correction.original)}</span>
                →
                <span class="corrected">${SRTParser.escapeHtml(correction.corrected)}</span>
              </div>
              <div class="validation-correction-reason">${SRTParser.escapeHtml(correction.reason)}</div>
            </div>
          `

          const actionsEl = document.createElement('div')
          actionsEl.className = 'validation-actions'

          const validateBtn = document.createElement('button')
          validateBtn.className = 'btn btn-success'
          validateBtn.innerHTML = '<span class="btn-icon">✓</span> Valider'
          validateBtn.onclick = () => validateSingleCorrection(block.index, corrIndex)

          const editBtn = document.createElement('button')
          editBtn.className = 'btn btn-outline'
          editBtn.innerHTML = '<span class="btn-icon">✏️</span> Modifier'
          editBtn.onclick = () => editCorrection(block.index, corrIndex)

          actionsEl.appendChild(validateBtn)
          actionsEl.appendChild(editBtn)

          cardEl.appendChild(actionsEl)
          validationCell.appendChild(cardEl)
        })
    }

    row.appendChild(textCell)
    row.appendChild(validationCell)
    DOM.blocksTableBody.appendChild(row)
  })
}

/**
 * Valide une correction unique
 */
function validateSingleCorrection(blockIndex, corrIndex) {
  const correctionId = `${blockIndex}-${corrIndex}`
  AppState.validatedCorrections.add(correctionId)

  const card = document.getElementById(`validation-${correctionId}`)
  if (card) {
    card.classList.add('validated')
  }
}

/**
 * Édite une correction
 */
function editCorrection(blockIndex, corrIndex) {
  const block = AppState.blocks.find(b => b.index === blockIndex)
  if (!block) return

  const correction = block.corrections[corrIndex]
  if (!correction) return

  const newValue = prompt(
    `Modifier la correction :\n\nOriginal : ${correction.original}\nCorrigé : ${correction.corrected}\n\nNouveau texte :`,
    correction.corrected
  )

  if (newValue !== null && newValue !== correction.corrected) {
    // Mettre à jour la correction
    correction.corrected = newValue

    // Mettre à jour le texte du bloc
    block.corrected = block.corrected.replace(correction.corrected, newValue)

    // Re-render
    renderCorrectedText()
    renderValidations()
  }
}

/**
 * Valide des corrections par type
 */
function validateCorrections(type) {
  AppState.blocks.forEach(block => {
    if (!block.corrections) return

    block.corrections.forEach((correction, corrIndex) => {
      if (type === 'all' ||
          (type === 'major' && correction.type === 'major') ||
          (type === 'doubt' && correction.type === 'doubt')) {

        const correctionId = `${block.index}-${corrIndex}`
        AppState.validatedCorrections.add(correctionId)

        const card = document.getElementById(`validation-${correctionId}`)
        if (card) {
          card.classList.add('validated')
        }
      }
    })
  })
}

/**
 * Télécharge le fichier SRT corrigé
 */
function downloadSRT() {
  const content = SRTParser.generate(AppState.blocks)
  const filename = SRTParser.generateFilename(AppState.originalFilename, '_SR')
  SRTParser.downloadFile(content, filename, 'text/plain;charset=utf-8')
}

/**
 * Télécharge le fichier TXT
 */
function downloadTXT() {
  const content = SRTParser.generateTXT(AppState.blocks)
  const filename = SRTParser.generateFilename(AppState.originalFilename, '_SR', 'txt')
  SRTParser.downloadFile(content, filename, 'text/plain;charset=utf-8')
}

/**
 * Réinitialise l'application
 */
function resetApp() {
  AppState.originalFilename = null
  AppState.blocks = []
  AppState.validatedCorrections.clear()

  resetFileInput()
  showSection('upload')
}

/**
 * Réinitialise l'input de fichier
 */
function resetFileInput() {
  if (DOM.fileInput) {
    DOM.fileInput.value = ''
  }
  if (DOM.fileInfo) {
    DOM.fileInfo.style.display = 'none'
  }
}

/**
 * Affiche une section spécifique
 */
function showSection(section) {
  DOM.uploadSection.style.display = section === 'upload' ? 'block' : 'none'
  DOM.loadingSection.style.display = section === 'loading' ? 'block' : 'none'
  DOM.editorSection.style.display = section === 'editor' ? 'block' : 'none'
}

/**
 * Met à jour la barre de progression
 */
function updateProgress(percent, text) {
  if (DOM.progressFill) {
    DOM.progressFill.style.width = `${percent}%`
  }
  if (DOM.progressText) {
    DOM.progressText.textContent = text
  }
}

/**
 * Met à jour les statistiques
 */
function updateStats(stats) {
  if (DOM.statTotal) DOM.statTotal.textContent = stats.total
  if (DOM.statMinor) DOM.statMinor.textContent = stats.minor
  if (DOM.statMajor) DOM.statMajor.textContent = stats.major
  if (DOM.statDoubt) DOM.statDoubt.textContent = stats.doubt
}

/**
 * Gère le clic sur les filtres de statistiques
 */
function handleFilterClick(event) {
  const filterBtn = event.currentTarget
  const filterType = filterBtn.dataset.filter

  // Si on clique sur le filtre actif, on le désactive
  if (AppState.activeFilter === filterType) {
    AppState.activeFilter = null
    filterBtn.classList.remove('active')
  } else {
    // Sinon, on active le nouveau filtre
    // Désactiver tous les filtres
    document.querySelectorAll('.stat-filter').forEach(btn => {
      btn.classList.remove('active')
    })

    // Activer le filtre cliqué
    AppState.activeFilter = filterType === 'all' ? null : filterType
    if (filterType !== 'all') {
      filterBtn.classList.add('active')
    }
  }

  // Re-render le tableau avec le filtre
  renderBlocksTable()
}
