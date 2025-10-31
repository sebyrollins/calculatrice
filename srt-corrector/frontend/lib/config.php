<?php
/**
 * Configuration de l'application SRT Corrector
 * Compatible PHP 8.4
 */

declare(strict_types=1);

// URL du Cloudflare Worker
// À MODIFIER après déploiement du Worker
define('WORKER_URL', 'https://srt-corrector-worker.YOUR-SUBDOMAIN.workers.dev');

// Limites de fichiers
define('MAX_FILE_SIZE', 50 * 1024); // 50 Ko en bytes
define('ALLOWED_EXTENSIONS', ['srt']);

// Dossier temporaire pour les uploads
define('TEMP_DIR', sys_get_temp_dir());

// Configuration pour future base de données (prêt pour extension)
// define('DB_HOST', 'localhost');
// define('DB_NAME', 'srt_corrector');
// define('DB_USER', 'user');
// define('DB_PASS', 'password');

// Configuration pour futurs quotas (prêt pour extension)
// define('ENABLE_QUOTAS', false);
// define('MAX_REQUESTS_PER_DAY', 100);

// Timezone
date_default_timezone_set('Europe/Paris');

// Logs d'erreurs
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../../logs/error.log');

// Créer le dossier logs s'il n'existe pas
if (!file_exists(__DIR__ . '/../../logs')) {
    @mkdir(__DIR__ . '/../../logs', 0755, true);
}
