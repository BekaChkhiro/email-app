<?php
/**
 * PHP Mail API - Router
 *
 * Main entry point for all API requests
 */

// Error reporting (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Load dependencies
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/imap-helper.php';

// Load config
$config = require __DIR__ . '/config.php';

// Initialize auth
$auth = new Auth($config);
$auth->setCorsHeaders();
$auth->handlePreflight();

// Validate API key (except for health check)
$requestUri = $_SERVER['REQUEST_URI'];
$path = parse_url($requestUri, PHP_URL_PATH);
$path = preg_replace('/^\/api\.php/', '', $path); // Remove script name if present
$path = preg_replace('/^\//', '', $path); // Remove leading slash
$path = preg_replace('/\/$/', '', $path); // Remove trailing slash

// Allow health check without auth
if ($path !== 'health') {
    if (!$auth->validateApiKey()) {
        exit;
    }
}

// Get request method and input
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true) ?? [];
$query = $_GET;

// Route the request
try {
    switch ($path) {
        case '':
        case 'health':
            // Health check
            $auth->sendSuccess(['status' => 'ok', 'message' => 'PHP Mail API is running']);
            break;

        case 'folders':
            handleFolders($config, $auth, $method);
            break;

        case 'messages':
            handleMessages($config, $auth, $method, $query);
            break;

        case 'message':
            handleMessage($config, $auth, $method, $query);
            break;

        case 'send':
            handleSend($config, $auth, $method, $input);
            break;

        case 'search':
            handleSearch($config, $auth, $method, $query);
            break;

        case 'move':
            handleMove($config, $auth, $method, $input);
            break;

        case 'star':
            handleStar($config, $auth, $method, $input);
            break;

        case 'read':
            handleRead($config, $auth, $method, $input);
            break;

        case 'delete':
            handleDelete($config, $auth, $method, $input);
            break;

        case 'attachment':
            handleAttachment($config, $auth, $method, $query);
            break;

        default:
            $auth->sendError('Endpoint not found: ' . $path, 404);
    }
} catch (Exception $e) {
    error_log('PHP Mail API Error: ' . $e->getMessage());
    $auth->sendError('Server error: ' . $e->getMessage(), 500);
}

// =====================
// ENDPOINT HANDLERS
// =====================

/**
 * GET /folders - List all folders
 */
function handleFolders(array $config, Auth $auth, string $method): void
{
    if ($method !== 'GET') {
        $auth->sendError('Method not allowed', 405);
    }

    $imap = new ImapHelper($config);
    $imap->connect();

    $folders = $imap->getFolders();
    $imap->disconnect();

    $auth->sendSuccess(['folders' => $folders]);
}

/**
 * GET /messages - List messages in folder
 */
function handleMessages(array $config, Auth $auth, string $method, array $query): void
{
    if ($method !== 'GET') {
        $auth->sendError('Method not allowed', 405);
    }

    $folder = $query['folder'] ?? 'INBOX';
    $page = max(1, intval($query['page'] ?? 1));
    $limit = min(100, max(1, intval($query['limit'] ?? 50)));

    $imap = new ImapHelper($config);
    $imap->connect($folder);

    $result = $imap->getMessages($folder, $page, $limit);
    $imap->disconnect();

    $auth->sendSuccess($result);
}

/**
 * GET /message - Get single message
 */
function handleMessage(array $config, Auth $auth, string $method, array $query): void
{
    if ($method !== 'GET') {
        $auth->sendError('Method not allowed', 405);
    }

    $folder = $query['folder'] ?? 'INBOX';
    $uid = intval($query['uid'] ?? 0);

    if (!$uid) {
        $auth->sendError('UID is required', 400);
    }

    $imap = new ImapHelper($config);
    $imap->connect($folder);

    $message = $imap->getMessage($folder, $uid);
    $imap->disconnect();

    if (!$message) {
        $auth->sendError('Message not found', 404);
    }

    $auth->sendSuccess(['message' => $message]);
}

/**
 * POST /send - Send email
 */
function handleSend(array $config, Auth $auth, string $method, array $input): void
{
    if ($method !== 'POST') {
        $auth->sendError('Method not allowed', 405);
    }

    $to = $input['to'] ?? '';
    $cc = $input['cc'] ?? '';
    $bcc = $input['bcc'] ?? '';
    $subject = $input['subject'] ?? '';
    $html = $input['html'] ?? '';
    $text = $input['text'] ?? '';
    $replyTo = $input['replyTo'] ?? '';
    $attachments = $input['attachments'] ?? [];

    if (empty($to)) {
        $auth->sendError('Recipient (to) is required', 400);
    }

    if (empty($subject)) {
        $auth->sendError('Subject is required', 400);
    }

    $smtp = $config['smtp'];

    // Build email headers
    $headers = [];
    $headers[] = 'MIME-Version: 1.0';
    $headers[] = 'From: ' . $smtp['from_name'] . ' <' . $smtp['from_email'] . '>';

    if ($replyTo) {
        $headers[] = 'Reply-To: ' . $replyTo;
    }

    if ($cc) {
        $headers[] = 'Cc: ' . $cc;
    }

    if ($bcc) {
        $headers[] = 'Bcc: ' . $bcc;
    }

    $messageId = '<' . time() . '.' . md5(uniqid()) . '@' . parse_url($smtp['from_email'], PHP_URL_HOST) . '>';
    $headers[] = 'Message-ID: ' . $messageId;

    // Build body
    $boundary = md5(time());

    if (!empty($attachments)) {
        $headers[] = 'Content-Type: multipart/mixed; boundary="' . $boundary . '"';

        $body = "--{$boundary}\r\n";
        $body .= "Content-Type: text/html; charset=UTF-8\r\n";
        $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
        $body .= chunk_split(base64_encode($html ?: nl2br($text))) . "\r\n";

        foreach ($attachments as $att) {
            $filename = $att['filename'] ?? 'attachment';
            $content = $att['content'] ?? '';
            $contentType = $att['contentType'] ?? 'application/octet-stream';

            $body .= "--{$boundary}\r\n";
            $body .= "Content-Type: {$contentType}; name=\"{$filename}\"\r\n";
            $body .= "Content-Disposition: attachment; filename=\"{$filename}\"\r\n";
            $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
            $body .= chunk_split($content) . "\r\n";
        }

        $body .= "--{$boundary}--";
    } else {
        $headers[] = 'Content-Type: text/html; charset=UTF-8';
        $headers[] = 'Content-Transfer-Encoding: base64';
        $body = chunk_split(base64_encode($html ?: nl2br($text)));
    }

    // Encode subject for UTF-8
    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

    // Send email
    $sent = mail($to, $encodedSubject, $body, implode("\r\n", $headers));

    if ($sent) {
        $auth->sendSuccess([
            'messageId' => $messageId,
            'method' => 'native_mail'
        ]);
    } else {
        $auth->sendError('Failed to send email', 500);
    }
}

/**
 * GET /search - Search messages
 */
function handleSearch(array $config, Auth $auth, string $method, array $query): void
{
    if ($method !== 'GET') {
        $auth->sendError('Method not allowed', 405);
    }

    $folder = $query['folder'] ?? 'INBOX';
    $q = $query['q'] ?? '';

    if (empty($q)) {
        $auth->sendError('Search query (q) is required', 400);
    }

    $imap = new ImapHelper($config);
    $imap->connect($folder);

    $messages = $imap->search($folder, $q);
    $imap->disconnect();

    $auth->sendSuccess([
        'messages' => $messages,
        'total' => count($messages)
    ]);
}

/**
 * POST /move - Move message to folder
 */
function handleMove(array $config, Auth $auth, string $method, array $input): void
{
    if ($method !== 'POST') {
        $auth->sendError('Method not allowed', 405);
    }

    $folder = $input['folder'] ?? 'INBOX';
    $uid = intval($input['uid'] ?? 0);
    $targetFolder = $input['targetFolder'] ?? '';

    if (!$uid) {
        $auth->sendError('UID is required', 400);
    }

    if (empty($targetFolder)) {
        $auth->sendError('Target folder is required', 400);
    }

    $imap = new ImapHelper($config);
    $imap->connect($folder);

    $result = $imap->moveMessage($folder, $uid, $targetFolder);
    $imap->disconnect();

    if ($result) {
        $auth->sendSuccess(['moved' => true]);
    } else {
        $auth->sendError('Failed to move message', 500);
    }
}

/**
 * POST /star - Toggle star
 */
function handleStar(array $config, Auth $auth, string $method, array $input): void
{
    if ($method !== 'POST') {
        $auth->sendError('Method not allowed', 405);
    }

    $folder = $input['folder'] ?? 'INBOX';
    $uid = intval($input['uid'] ?? 0);
    $starred = $input['starred'] ?? true;

    if (!$uid) {
        $auth->sendError('UID is required', 400);
    }

    $imap = new ImapHelper($config);
    $imap->connect($folder);

    $result = $imap->setStarred($folder, $uid, $starred);
    $imap->disconnect();

    if ($result) {
        $auth->sendSuccess(['starred' => $starred]);
    } else {
        $auth->sendError('Failed to update star', 500);
    }
}

/**
 * POST /read - Mark as read/unread
 */
function handleRead(array $config, Auth $auth, string $method, array $input): void
{
    if ($method !== 'POST') {
        $auth->sendError('Method not allowed', 405);
    }

    $folder = $input['folder'] ?? 'INBOX';
    $uid = intval($input['uid'] ?? 0);
    $read = $input['read'] ?? true;

    if (!$uid) {
        $auth->sendError('UID is required', 400);
    }

    $imap = new ImapHelper($config);
    $imap->connect($folder);

    $result = $imap->markAsRead($folder, $uid, $read);
    $imap->disconnect();

    if ($result) {
        $auth->sendSuccess(['read' => $read]);
    } else {
        $auth->sendError('Failed to update read status', 500);
    }
}

/**
 * POST /delete - Delete message
 */
function handleDelete(array $config, Auth $auth, string $method, array $input): void
{
    if ($method !== 'POST') {
        $auth->sendError('Method not allowed', 405);
    }

    $folder = $input['folder'] ?? 'INBOX';
    $uid = intval($input['uid'] ?? 0);
    $permanent = $input['permanent'] ?? false;

    if (!$uid) {
        $auth->sendError('UID is required', 400);
    }

    $imap = new ImapHelper($config);
    $imap->connect($folder);

    $result = $imap->deleteMessage($folder, $uid, $permanent);
    $imap->disconnect();

    if ($result) {
        $auth->sendSuccess(['deleted' => true]);
    } else {
        $auth->sendError('Failed to delete message', 500);
    }
}

/**
 * GET /attachment - Download attachment
 */
function handleAttachment(array $config, Auth $auth, string $method, array $query): void
{
    if ($method !== 'GET') {
        $auth->sendError('Method not allowed', 405);
    }

    $folder = $query['folder'] ?? 'INBOX';
    $uid = intval($query['uid'] ?? 0);
    $partId = $query['partId'] ?? '';

    if (!$uid) {
        $auth->sendError('UID is required', 400);
    }

    if (empty($partId)) {
        $auth->sendError('Part ID is required', 400);
    }

    $imap = new ImapHelper($config);
    $imap->connect($folder);

    $attachment = $imap->getAttachment($folder, $uid, $partId);
    $imap->disconnect();

    if (!$attachment) {
        $auth->sendError('Attachment not found', 404);
    }

    // Send file
    header('Content-Type: ' . $attachment['contentType']);
    header('Content-Disposition: attachment; filename="' . $attachment['filename'] . '"');
    header('Content-Length: ' . strlen($attachment['content']));

    echo $attachment['content'];
    exit;
}
