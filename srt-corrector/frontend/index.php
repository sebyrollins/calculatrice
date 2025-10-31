<?php
/**
 * SRT Corrector Pro
 * Application de correction professionnelle de fichiers SRT
 * Compatible PHP 8.4
 */

declare(strict_types=1);

require_once __DIR__ . '/lib/functions.php';

// Traitement de l'upload si formulaire soumis
$uploadResult = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['srtFile'])) {
    $uploadResult = validateAndCleanSRT($_FILES['srtFile']);

    // Log en cas d'erreur
    if (!$uploadResult['success']) {
        logError('Upload failed', ['message' => $uploadResult['message']]);
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
            <h1 class="app-title">
                <span class="icon">📝</span>
                SRT Corrector Pro
            </h1>
            <p class="app-subtitle">Correction professionnelle de sous-titres avec IA</p>
        </div>
    </header>

    <!-- Main Content -->
    <main class="app-main">
        <div class="container">

            <!-- Section Upload -->
            <section class="upload-section" id="uploadSection">
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

                <!-- Statistics Bar -->
                <div class="stats-bar" id="statsBar">
                    <div class="stat-item">
                        <span class="stat-label">Total</span>
                        <span class="stat-value" id="statTotal">0</span>
                    </div>
                    <div class="stat-item stat-minor">
                        <span class="stat-label">Mineures</span>
                        <span class="stat-value" id="statMinor">0</span>
                    </div>
                    <div class="stat-item stat-major">
                        <span class="stat-label">Majeures</span>
                        <span class="stat-value" id="statMajor">0</span>
                    </div>
                    <div class="stat-item stat-doubt">
                        <span class="stat-label">Doutes</span>
                        <span class="stat-value" id="statDoubt">0</span>
                    </div>
                </div>

                <!-- Editor Grid -->
                <div class="editor-grid">

                    <!-- Left Panel: Corrected Text -->
                    <div class="editor-panel editor-text">
                        <div class="panel-header">
                            <h3>Texte corrigé</h3>
                        </div>
                        <div class="panel-content" id="correctedTextPanel">
                            <!-- Content will be dynamically generated -->
                        </div>
                    </div>

                    <!-- Right Panel: Validations -->
                    <div class="editor-panel editor-validations">
                        <div class="panel-header">
                            <h3>Validations</h3>
                        </div>
                        <div class="panel-content" id="validationsPanel">
                            <!-- Content will be dynamically generated -->
                        </div>
                    </div>

                </div>

                <!-- Action Buttons -->
                <div class="action-bar">
                    <div class="action-group">
                        <button class="btn btn-secondary" id="validateAllBtn">
                            <span class="btn-icon">✓</span>
                            Valider tout
                        </button>
                        <button class="btn btn-success" id="validateMajorBtn">
                            <span class="btn-icon">✓</span>
                            Valider les majeures
                        </button>
                        <button class="btn btn-warning" id="validateDoubtBtn">
                            <span class="btn-icon">✓</span>
                            Valider les doutes
                        </button>
                    </div>

                    <div class="action-group">
                        <button class="btn btn-primary" id="downloadSrtBtn">
                            <span class="btn-icon">⬇</span>
                            Télécharger SRT
                        </button>
                        <button class="btn btn-outline" id="downloadTxtBtn">
                            <span class="btn-icon">⬇</span>
                            Télécharger TXT
                        </button>
                    </div>

                    <div class="action-group">
                        <button class="btn btn-outline" id="newFileBtn">
                            <span class="btn-icon">↻</span>
                            Nouveau fichier
                        </button>
                    </div>
                </div>

            </section>

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
