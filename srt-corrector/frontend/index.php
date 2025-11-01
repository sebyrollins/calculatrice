<?php
/**
 * SRT Corrector Pro
 * Application de correction professionnelle de fichiers SRT
 * Compatible PHP 8.4
 */

declare(strict_types=1);

// Gestion des erreurs pour éviter les 500
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

try {
    require_once __DIR__ . '/lib/functions.php';
} catch (Throwable $e) {
    die("Erreur de configuration : " . $e->getMessage() . "<br>Vérifiez que tous les fichiers sont présents.");
}

// Traitement de l'upload si formulaire soumis
$uploadResult = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['srtFile'])) {
    try {
        $uploadResult = validateAndCleanSRT($_FILES['srtFile']);

        // Log en cas d'erreur
        if (!$uploadResult['success']) {
            logError('Upload failed', ['message' => $uploadResult['message']]);
        }
    } catch (Throwable $e) {
        $uploadResult = [
            'success' => false,
            'message' => 'Erreur : ' . $e->getMessage(),
            'content' => null,
            'filename' => null
        ];
    }
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Correcteur professionnel de sous-titres SRT avec IA">
    <title>SRT Corrector Pro - Correction professionnelle de sous-titres</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <!-- Header -->
    <header class="app-header">
        <div class="container">
            <div class="header-content">
                <img src="assets/images/logo.png" alt="SebyRollins" class="header-logo">
                <div class="header-text">
                    <h1 class="app-title">
                        <span class="icon">📝</span>
                        SRT Corrector Pro
                    </h1>
                    <p class="app-subtitle">Correction professionnelle de sous-titres avec IA by SebyRollins 2025</p>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="app-main">
        <div class="container">

            <!-- Section Upload -->
            <section class="upload-section" id="uploadSection">
                <?php if (strpos(WORKER_URL, 'YOUR-SUBDOMAIN') !== false): ?>
                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 1rem; margin-bottom: 1.5rem; border-radius: 0.5rem;">
                    <strong>⚠️ Configuration requise</strong>
                    <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">
                        Le Worker Cloudflare n'est pas encore configuré.
                        <a href="README.md" style="color: #d97706; text-decoration: underline;">Consultez le README.md</a>
                        pour les instructions de déploiement.
                    </p>
                </div>
                <?php endif; ?>
                <div class="upload-card">
                    <div class="upload-icon">📁</div>
                    <h2>Importer votre fichier SRT</h2>
                    <p class="upload-description">
                        Sélectionnez un fichier de sous-titres (max 50 Ko)
                    </p>

                    <form id="uploadForm" method="POST" enctype="multipart/form-data">
                        <div class="file-input-wrapper">
                            <input type="file"
                                   id="srtFile"
                                   name="srtFile"
                                   accept=".srt"
                                   required>
                            <label for="srtFile" class="file-input-label">
                                <span class="file-input-text">Choisir un fichier</span>
                                <span class="file-input-button">Parcourir</span>
                            </label>
                        </div>

                        <div id="fileInfo" class="file-info" style="display: none;">
                            <span id="fileName"></span>
                            <span id="fileSize"></span>
                        </div>

                        <button type="submit" class="btn btn-primary btn-large" id="correctBtn">
                            <span class="btn-icon">✨</span>
                            Corriger le fichier
                        </button>
                    </form>

                    <div class="upload-features">
                        <div class="feature">
                            <span class="feature-icon">✓</span>
                            <span>Orthographe & Grammaire</span>
                        </div>
                        <div class="feature">
                            <span class="feature-icon">✓</span>
                            <span>Typographie française</span>
                        </div>
                        <div class="feature">
                            <span class="feature-icon">✓</span>
                            <span>Ponctuation professionnelle</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Section Loading -->
            <section class="loading-section" id="loadingSection" style="display: none;">
                <div class="loading-card">
                    <div class="spinner"></div>
                    <h3>Correction en cours...</h3>
                    <p>Analyse et correction de vos sous-titres par l'IA</p>
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill"></div>
                    </div>
                    <p class="progress-text" id="progressText">Initialisation...</p>
                </div>
            </section>

            <!-- Section Editor -->
            <section class="editor-section" id="editorSection" style="display: none;">

                <!-- Statistics Bar with integrated buttons - STICKY -->
                <div class="stats-bar sticky-stats" id="statsBar">
                    <div class="stats-group">
                        <div class="stat-item stat-filter" data-filter="all">
                            <span class="stat-label">Total</span>
                            <span class="stat-value" id="statTotal">0</span>
                            <button class="btn-stat btn-stat-secondary" id="validateAllBtn" title="Valider toutes les corrections">
                                <span class="btn-icon">✓</span>
                                Valider tout
                            </button>
                        </div>
                        <div class="stat-item stat-minor stat-filter" data-filter="minor">
                            <span class="stat-label">Mineures</span>
                            <span class="stat-value" id="statMinor">0</span>
                            <button class="btn-stat btn-stat-blue" id="validateMinorBtn" title="Valider les corrections mineures">
                                <span class="btn-icon">✓</span>
                                Valider
                            </button>
                        </div>
                        <div class="stat-item stat-major stat-filter" data-filter="major">
                            <span class="stat-label">Majeures</span>
                            <span class="stat-value" id="statMajor">0</span>
                            <button class="btn-stat btn-stat-success" id="validateMajorBtn" title="Valider les corrections majeures">
                                <span class="btn-icon">✓</span>
                                Valider
                            </button>
                        </div>
                        <div class="stat-item stat-doubt stat-filter" data-filter="doubt">
                            <span class="stat-label">Doutes</span>
                            <span class="stat-value" id="statDoubt">0</span>
                            <button class="btn-stat btn-stat-warning" id="validateDoubtBtn" title="Valider les corrections avec doute">
                                <span class="btn-icon">✓</span>
                                Valider
                            </button>
                        </div>
                    </div>

                    <div class="progress-gauge-container">
                        <div class="progress-gauge">
                            <div class="progress-gauge-label">Progression</div>
                            <div class="progress-gauge-bar">
                                <div class="progress-gauge-fill" id="progressGaugeFill" style="width: 0%"></div>
                            </div>
                            <div class="progress-gauge-value" id="progressGaugeValue">0%</div>
                        </div>
                        <div class="utility-buttons">
                            <button class="btn-utility" id="downloadSrtBtn" title="Télécharger le fichier SRT corrigé">
                                <span class="btn-icon">⬇</span>
                                SRT
                            </button>
                            <button class="btn-utility" id="downloadTxtBtn" title="Télécharger en format TXT">
                                <span class="btn-icon">⬇</span>
                                TXT
                            </button>
                            <button class="btn-utility" id="newFileBtn" title="Charger un nouveau fichier">
                                <span class="btn-icon">↻</span>
                                NEW
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Blocks Table - SCROLLABLE -->
                <div class="blocks-table-container">
                    <table class="blocks-table">
                        <thead class="blocks-table-header sticky-header">
                            <tr>
                                <th class="col-text">Texte corrigé</th>
                                <th class="col-validation">Validations</th>
                            </tr>
                        </thead>
                        <tbody id="blocksTableBody">
                            <!-- Content will be dynamically generated -->
                        </tbody>
                    </table>
                </div>

            </section>

        </div>

        <!-- Minimap de navigation -->
        <div class="navigation-minimap" id="navigationMinimap" style="display: none;">
            <div class="minimap-title">≡</div>
            <div class="minimap-blocks" id="minimapBlocks">
                <!-- Généré dynamiquement -->
            </div>
        </div>

        <!-- Modal d'édition -->
        <div class="modal" id="editModal" style="display: none;">
            <div class="modal-overlay" id="modalOverlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Modifier la correction</h3>
                    <button class="modal-close" id="modalCloseBtn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="modal-field">
                        <label class="modal-label">Texte original :</label>
                        <div class="modal-value" id="modalOriginal"></div>
                    </div>
                    <div class="modal-field">
                        <label class="modal-label">Suggestion de correction :</label>
                        <div class="modal-value" id="modalSuggestion"></div>
                    </div>
                    <div class="modal-field">
                        <label class="modal-label">Votre correction :</label>
                        <input type="text" class="modal-input" id="modalInput" />
                        <button class="btn-restore-suggestion" id="modalRestoreBtn" title="Restaurer la suggestion de Claude">
                            ↺ Restaurer la suggestion
                        </button>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" id="modalCancelBtn">Annuler</button>
                    <button class="btn btn-primary" id="modalSaveBtn">Enregistrer</button>
                </div>
            </div>
        </div>

    </main>

    <!-- Footer -->
    <footer class="app-footer">
        <div class="container">
            <p>&copy; <?php echo date('Y'); ?> SRT Corrector Pro - Powered by Claude AI</p>
        </div>
    </footer>

    <!-- Scripts -->
    <script>
        // Configuration globale
        window.APP_CONFIG = {
            workerUrl: '<?php echo WORKER_URL; ?>',
            maxFileSize: <?php echo MAX_FILE_SIZE; ?>
        };

        <?php if ($uploadResult && $uploadResult['success']): ?>
        // Si un fichier a été uploadé, le traiter immédiatement
        window.UPLOADED_FILE = {
            content: <?php echo json_encode($uploadResult['content']); ?>,
            filename: <?php echo json_encode($uploadResult['filename']); ?>
        };
        <?php endif; ?>
    </script>
    <script src="assets/js/srt-parser.js"></script>
    <script src="assets/js/app.js"></script>
</body>
</html>
