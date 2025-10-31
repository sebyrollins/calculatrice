/**
 * SRT Corrector Pro - Main Application Logic
 */

// État global de l'application
const AppState = {
  originalFilename: null,
  blocks: [],
  validatedCorrections: new Set()
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
  newFileBtn: null
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

  // Afficher le texte corrigé
  renderCorrectedText()

  // Afficher les validations
  renderValidations()
}

/**
 * Affiche le texte corrigé avec surlignage
 */
function renderCorrectedText() {
  DOM.correctedTextPanel.innerHTML = ''

  AppState.blocks.forEach(block => {
    const blockEl = document.createElement('div')
    blockEl.className = 'srt-block'
    blockEl.id = `block-${block.index}`

    if (block.corrections && block.corrections.length > 0) {
      blockEl.classList.add('has-corrections')
    }

    // Header
    const headerEl = document.createElement('div')
    headerEl.className = 'srt-block-header'

    const indexEl = document.createElement('span')
    indexEl.className = 'srt-block-index'
    indexEl.textContent = `Bloc #${block.index}`

    const timecodeEl = document.createElement('span')
    timecodeEl.className = 'srt-block-timecode'
    timecodeEl.textContent = block.timecode

    headerEl.appendChild(indexEl)
    headerEl.appendChild(timecodeEl)

    // Text - Original avec surlignage
    const originalEl = document.createElement('div')
    originalEl.className = 'srt-block-text srt-block-original'

    const originalLabel = document.createElement('div')
    originalLabel.className = 'srt-block-label'
    originalLabel.textContent = 'Original :'

    const originalContent = document.createElement('div')
    originalContent.className = 'srt-block-content'

    if (block.corrections && block.corrections.length > 0) {
      originalContent.innerHTML = SRTParser.applyCorrectionsWithHighlight(block.original, block.corrections)
    } else {
      originalContent.textContent = block.original
    }

    originalEl.appendChild(originalLabel)
    originalEl.appendChild(originalContent)

    // Text - Corrigé
    const correctedEl = document.createElement('div')
    correctedEl.className = 'srt-block-text srt-block-corrected'

    const correctedLabel = document.createElement('div')
    correctedLabel.className = 'srt-block-label'
    correctedLabel.textContent = 'Corrigé :'

    const correctedContent = document.createElement('div')
    correctedContent.className = 'srt-block-content'
    correctedContent.textContent = block.corrected

    correctedEl.appendChild(correctedLabel)
    correctedEl.appendChild(correctedContent)

    blockEl.appendChild(headerEl)
    blockEl.appendChild(originalEl)
    blockEl.appendChild(correctedEl)

    DOM.correctedTextPanel.appendChild(blockEl)
  })
}

/**
 * Affiche le panneau de validation
 */
function renderValidations() {
  DOM.validationsPanel.innerHTML = ''

  AppState.blocks.forEach(block => {
    if (!block.corrections || block.corrections.length === 0) {
      return
    }

    // Filtrer les corrections non-minor (les minor n'ont pas besoin de validation)
    const correctionsToValidate = block.corrections.filter(c => c.type !== 'minor')

    if (correctionsToValidate.length === 0) {
      return
    }

    correctionsToValidate.forEach((correction, corrIndex) => {
      const cardEl = document.createElement('div')
      const correctionId = `${block.index}-${corrIndex}`
      cardEl.className = `validation-card validation-${correction.type}`
      cardEl.id = `validation-${correctionId}`

      if (AppState.validatedCorrections.has(correctionId)) {
        cardEl.classList.add('validated')
      }

      // Header
      const headerEl = document.createElement('div')
      headerEl.className = 'validation-header'

      const blockNumEl = document.createElement('span')
      blockNumEl.className = 'validation-block-number'
      blockNumEl.textContent = `Bloc #${block.index}`

      const badgeEl = document.createElement('span')
      badgeEl.className = `validation-type-badge badge-${correction.type}`
      badgeEl.textContent = correction.type === 'major' ? 'Majeure' : 'Doute'

      headerEl.appendChild(blockNumEl)
      headerEl.appendChild(badgeEl)

      // Correction details
      const correctionEl = document.createElement('div')
      correctionEl.className = 'validation-correction'

      const textEl = document.createElement('div')
      textEl.className = 'validation-correction-text'
      textEl.innerHTML = `
        <span class="original">${SRTParser.escapeHtml(correction.original)}</span>
        →
        <span class="corrected">${SRTParser.escapeHtml(correction.corrected)}</span>
      `

      const reasonEl = document.createElement('div')
      reasonEl.className = 'validation-correction-reason'
      reasonEl.textContent = correction.reason

      correctionEl.appendChild(textEl)
      correctionEl.appendChild(reasonEl)

      // Actions
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

      cardEl.appendChild(headerEl)
      cardEl.appendChild(correctionEl)
      cardEl.appendChild(actionsEl)

      DOM.validationsPanel.appendChild(cardEl)
    })
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
