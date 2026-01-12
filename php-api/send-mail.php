<?php
/**
 * Email Send API for cPanel
 * Upload this file to your cPanel hosting
 * URL: https://yourdomain.com/api/send-mail.php
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Api-Key');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// =====================
// CONFIGURATION
// =====================

$config = [
    'api_key' => 'YOUR_SECRET_API_KEY_HERE', // შეცვალე უნიკალური გასაღებით
    'smtp_host' => 'localhost', // cPanel-ზე localhost მუშაობს
    'smtp_port' => 25, // ან 465 SSL-ისთვის
    'smtp_user' => 'info@infinity.ge', // შენი email
    'smtp_pass' => 'YOUR_EMAIL_PASSWORD', // შენი email პაროლი
    'smtp_secure' => false, // true SSL-ისთვის (port 465)
    'from_email' => 'info@infinity.ge',
    'from_name' => 'Infinity',
];

// =====================
// AUTHENTICATION
// =====================

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$headers = getallheaders();
$apiKey = $headers['X-Api-Key'] ?? $headers['x-api-key'] ?? '';

if ($apiKey !== $config['api_key']) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized - Invalid API key']);
    exit;
}

// =====================
// PARSE INPUT
// =====================

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON input']);
    exit;
}

$to = $input['to'] ?? '';
$cc = $input['cc'] ?? '';
$bcc = $input['bcc'] ?? '';
$subject = $input['subject'] ?? '';
$html = $input['html'] ?? '';
$text = $input['text'] ?? '';
$replyTo = $input['replyTo'] ?? '';
$attachments = $input['attachments'] ?? [];

// Validate required fields
if (empty($to)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Recipient (to) is required']);
    exit;
}

if (empty($subject)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Subject is required']);
    exit;
}

// =====================
// SEND EMAIL
// =====================

// Check if PHPMailer is available
$phpmailerPath = __DIR__ . '/PHPMailer/src/PHPMailer.php';
$usePhpMailer = file_exists($phpmailerPath);

if ($usePhpMailer) {
    // Use PHPMailer for better SMTP control
    require $phpmailerPath;
    require __DIR__ . '/PHPMailer/src/SMTP.php';
    require __DIR__ . '/PHPMailer/src/Exception.php';

    $result = sendWithPHPMailer($config, $to, $cc, $bcc, $subject, $html, $text, $replyTo, $attachments);
} else {
    // Fallback to native mail() function
    $result = sendWithNativeMail($config, $to, $cc, $bcc, $subject, $html, $text, $replyTo, $attachments);
}

echo json_encode($result);
exit;

// =====================
// PHPMAILER FUNCTION
// =====================

function sendWithPHPMailer($config, $to, $cc, $bcc, $subject, $html, $text, $replyTo, $attachments) {
    try {
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);

        // SMTP Configuration
        $mail->isSMTP();
        $mail->Host = $config['smtp_host'];
        $mail->Port = $config['smtp_port'];
        $mail->CharSet = 'UTF-8';

        if ($config['smtp_user'] && $config['smtp_pass']) {
            $mail->SMTPAuth = true;
            $mail->Username = $config['smtp_user'];
            $mail->Password = $config['smtp_pass'];
        }

        if ($config['smtp_secure']) {
            $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
        }

        // From
        $mail->setFrom($config['from_email'], $config['from_name']);

        // Reply-To
        if ($replyTo) {
            $mail->addReplyTo($replyTo);
        }

        // Recipients
        $toAddresses = is_array($to) ? $to : explode(',', $to);
        foreach ($toAddresses as $addr) {
            $mail->addAddress(trim($addr));
        }

        // CC
        if ($cc) {
            $ccAddresses = is_array($cc) ? $cc : explode(',', $cc);
            foreach ($ccAddresses as $addr) {
                $mail->addCC(trim($addr));
            }
        }

        // BCC
        if ($bcc) {
            $bccAddresses = is_array($bcc) ? $bcc : explode(',', $bcc);
            foreach ($bccAddresses as $addr) {
                $mail->addBCC(trim($addr));
            }
        }

        // Subject & Body
        $mail->Subject = $subject;
        $mail->isHTML(true);
        $mail->Body = $html ?: nl2br($text);
        $mail->AltBody = $text ?: strip_tags($html);

        // Attachments
        if (!empty($attachments)) {
            foreach ($attachments as $att) {
                $filename = $att['filename'] ?? 'attachment';
                $content = base64_decode($att['content'] ?? '');
                $contentType = $att['contentType'] ?? 'application/octet-stream';
                $mail->addStringAttachment($content, $filename, 'base64', $contentType);
            }
        }

        $mail->send();

        return [
            'success' => true,
            'messageId' => $mail->getLastMessageID(),
            'method' => 'phpmailer'
        ];

    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'PHPMailer Error: ' . $e->getMessage(),
            'method' => 'phpmailer'
        ];
    }
}

// =====================
// NATIVE MAIL FUNCTION
// =====================

function sendWithNativeMail($config, $to, $cc, $bcc, $subject, $html, $text, $replyTo, $attachments) {
    try {
        $boundary = md5(time());
        $messageId = '<' . time() . '.' . md5(uniqid()) . '@' . parse_url($config['from_email'], PHP_URL_HOST) . '>';

        // Headers
        $headers = [];
        $headers[] = 'MIME-Version: 1.0';
        $headers[] = 'From: ' . $config['from_name'] . ' <' . $config['from_email'] . '>';
        $headers[] = 'Message-ID: ' . $messageId;

        if ($replyTo) {
            $headers[] = 'Reply-To: ' . $replyTo;
        }

        if ($cc) {
            $ccStr = is_array($cc) ? implode(', ', $cc) : $cc;
            $headers[] = 'Cc: ' . $ccStr;
        }

        if ($bcc) {
            $bccStr = is_array($bcc) ? implode(', ', $bcc) : $bcc;
            $headers[] = 'Bcc: ' . $bccStr;
        }

        // Handle attachments
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

        // Prepare To address
        $toStr = is_array($to) ? implode(', ', $to) : $to;

        // Encode subject for UTF-8
        $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

        // Send
        $sent = mail($toStr, $encodedSubject, $body, implode("\r\n", $headers));

        if ($sent) {
            return [
                'success' => true,
                'messageId' => $messageId,
                'method' => 'native_mail'
            ];
        } else {
            return [
                'success' => false,
                'error' => 'mail() function returned false',
                'method' => 'native_mail'
            ];
        }

    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'Native mail error: ' . $e->getMessage(),
            'method' => 'native_mail'
        ];
    }
}
