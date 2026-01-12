<?php
/**
 * PHP Mail API - IMAP Helper
 *
 * IMAP კავშირი და ოპერაციები
 */

class ImapHelper
{
    private $config;
    private $connection = null;
    private $currentFolder = null;

    public function __construct(array $config)
    {
        $this->config = $config['imap'];
    }

    /**
     * Connect to IMAP server
     */
    public function connect(string $folder = 'INBOX'): bool
    {
        $mailbox = $this->buildMailbox($folder);

        $this->connection = @imap_open(
            $mailbox,
            $this->config['username'],
            $this->config['password'],
            0,
            1,
            ['DISABLE_AUTHENTICATOR' => 'GSSAPI']
        );

        if (!$this->connection) {
            throw new Exception('IMAP connection failed: ' . imap_last_error());
        }

        $this->currentFolder = $folder;
        return true;
    }

    /**
     * Build IMAP mailbox string
     */
    private function buildMailbox(string $folder = ''): string
    {
        $encryption = $this->config['encryption'] === 'ssl' ? '/ssl' : '/tls';
        $validateCert = $this->config['validate_cert'] ? '' : '/novalidate-cert';

        $mailbox = '{' . $this->config['host'] . ':' . $this->config['port'] . '/imap' . $encryption . $validateCert . '}';

        if ($folder) {
            $mailbox .= $folder;
        }

        return $mailbox;
    }

    /**
     * Close connection
     */
    public function disconnect(): void
    {
        if ($this->connection) {
            imap_close($this->connection);
            $this->connection = null;
        }
    }

    /**
     * Switch to different folder
     */
    public function selectFolder(string $folder): bool
    {
        if ($this->currentFolder === $folder) {
            return true;
        }

        $this->disconnect();
        return $this->connect($folder);
    }

    /**
     * Get list of folders with counts
     */
    public function getFolders(): array
    {
        if (!$this->connection) {
            $this->connect();
        }

        $mailbox = $this->buildMailbox();
        $folders = imap_list($this->connection, $mailbox, '*');

        if (!$folders) {
            return [];
        }

        $result = [];
        foreach ($folders as $folder) {
            // Extract folder name
            $folderName = str_replace($mailbox, '', $folder);
            $folderName = mb_convert_encoding($folderName, 'UTF-8', 'UTF7-IMAP');

            // Get folder status
            $status = @imap_status($this->connection, $folder, SA_ALL);

            $result[] = [
                'name' => $this->getFolderDisplayName($folderName),
                'path' => $folderName,
                'total' => $status ? $status->messages : 0,
                'unread' => $status ? $status->unseen : 0,
            ];
        }

        // Sort: INBOX first, then alphabetically
        usort($result, function ($a, $b) {
            if ($a['path'] === 'INBOX') return -1;
            if ($b['path'] === 'INBOX') return 1;
            return strcasecmp($a['name'], $b['name']);
        });

        return $result;
    }

    /**
     * Get display name for folder
     */
    private function getFolderDisplayName(string $path): string
    {
        $names = [
            'INBOX' => 'Inbox',
            'Sent' => 'Sent',
            'Drafts' => 'Drafts',
            'Trash' => 'Trash',
            'Spam' => 'Spam',
            'Junk' => 'Spam',
        ];

        return $names[$path] ?? $path;
    }

    /**
     * Get messages list (paginated)
     */
    public function getMessages(string $folder, int $page = 1, int $limit = 50): array
    {
        $this->selectFolder($folder);

        $totalMessages = imap_num_msg($this->connection);

        if ($totalMessages === 0) {
            return [
                'messages' => [],
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => 0,
                    'totalPages' => 0,
                ]
            ];
        }

        // Calculate pagination (newest first)
        $totalPages = ceil($totalMessages / $limit);
        $start = $totalMessages - (($page - 1) * $limit);
        $end = max(1, $start - $limit + 1);

        $messages = [];

        // Fetch messages in reverse order (newest first)
        for ($i = $start; $i >= $end; $i--) {
            $header = imap_headerinfo($this->connection, $i);
            $structure = imap_fetchstructure($this->connection, $i);
            $uid = imap_uid($this->connection, $i);

            $messages[] = $this->parseMessageHeader($header, $structure, $uid, $i);
        }

        return [
            'messages' => $messages,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $totalMessages,
                'totalPages' => $totalPages,
            ]
        ];
    }

    /**
     * Parse message header into array
     */
    private function parseMessageHeader($header, $structure, int $uid, int $msgno): array
    {
        // Parse from
        $from = ['name' => '', 'address' => ''];
        if (isset($header->from[0])) {
            $from = [
                'name' => isset($header->from[0]->personal)
                    ? $this->decodeMimeStr($header->from[0]->personal)
                    : '',
                'address' => $header->from[0]->mailbox . '@' . $header->from[0]->host,
            ];
        }

        // Parse to
        $to = [];
        if (isset($header->to)) {
            foreach ($header->to as $recipient) {
                $to[] = [
                    'name' => isset($recipient->personal)
                        ? $this->decodeMimeStr($recipient->personal)
                        : '',
                    'address' => $recipient->mailbox . '@' . $recipient->host,
                ];
            }
        }

        // Get preview (first 100 chars of body)
        $preview = $this->getBodyPreview($msgno, $structure);

        // Check for attachments
        $hasAttachments = $this->hasAttachments($structure);

        // Parse flags
        $isRead = !($header->Unseen === 'U' || $header->Recent === 'N');
        $isStarred = isset($header->Flagged) && $header->Flagged === 'F';

        return [
            'id' => md5($header->message_id ?? $uid),
            'uid' => $uid,
            'messageId' => $header->message_id ?? '',
            'subject' => isset($header->subject) ? $this->decodeMimeStr($header->subject) : '(No Subject)',
            'from' => $from,
            'to' => $to,
            'date' => date('c', strtotime($header->date)),
            'preview' => $preview,
            'hasAttachments' => $hasAttachments,
            'isRead' => $isRead,
            'isStarred' => $isStarred,
        ];
    }

    /**
     * Get body preview text
     */
    private function getBodyPreview(int $msgno, $structure, int $maxLength = 150): string
    {
        $body = '';

        if (!$structure->parts) {
            // Simple message
            $body = imap_fetchbody($this->connection, $msgno, '1');
            $body = $this->decodeBody($body, $structure->encoding);
        } else {
            // Multipart message - find text part
            foreach ($structure->parts as $partNum => $part) {
                if ($part->subtype === 'PLAIN') {
                    $body = imap_fetchbody($this->connection, $msgno, (string)($partNum + 1));
                    $body = $this->decodeBody($body, $part->encoding);
                    break;
                }
            }
        }

        // Clean up
        $body = strip_tags($body);
        $body = html_entity_decode($body, ENT_QUOTES, 'UTF-8');
        $body = preg_replace('/\s+/', ' ', $body);
        $body = trim($body);

        return mb_substr($body, 0, $maxLength);
    }

    /**
     * Get single message with full body
     */
    public function getMessage(string $folder, int $uid): ?array
    {
        $this->selectFolder($folder);

        $msgno = imap_msgno($this->connection, $uid);
        if (!$msgno) {
            return null;
        }

        $header = imap_headerinfo($this->connection, $msgno);
        $structure = imap_fetchstructure($this->connection, $msgno);

        // Get basic info
        $message = $this->parseMessageHeader($header, $structure, $uid, $msgno);

        // Add CC
        $message['cc'] = [];
        if (isset($header->cc)) {
            foreach ($header->cc as $cc) {
                $message['cc'][] = [
                    'name' => isset($cc->personal) ? $this->decodeMimeStr($cc->personal) : '',
                    'address' => $cc->mailbox . '@' . $cc->host,
                ];
            }
        }

        // Get full body
        $body = $this->getFullBody($msgno, $structure);
        $message['html'] = $body['html'];
        $message['text'] = $body['text'];

        // Get attachments info
        $message['attachments'] = $this->getAttachments($msgno, $structure);

        // Mark as read
        imap_setflag_full($this->connection, (string)$uid, '\\Seen', ST_UID);

        return $message;
    }

    /**
     * Get full body (HTML and text)
     */
    private function getFullBody(int $msgno, $structure): array
    {
        $html = '';
        $text = '';

        if (!isset($structure->parts) || empty($structure->parts)) {
            // Simple message
            $body = imap_fetchbody($this->connection, $msgno, '1');
            $body = $this->decodeBody($body, $structure->encoding);

            if ($structure->subtype === 'HTML') {
                $html = $body;
            } else {
                $text = $body;
            }
        } else {
            // Multipart message
            $this->parseBodyParts($msgno, $structure->parts, '', $html, $text);
        }

        return ['html' => $html, 'text' => $text];
    }

    /**
     * Recursively parse body parts
     */
    private function parseBodyParts(int $msgno, array $parts, string $prefix, string &$html, string &$text): void
    {
        foreach ($parts as $index => $part) {
            $partNum = $prefix ? $prefix . '.' . ($index + 1) : (string)($index + 1);

            if ($part->type === 0) { // Text
                $body = imap_fetchbody($this->connection, $msgno, $partNum);
                $body = $this->decodeBody($body, $part->encoding);
                $body = $this->convertCharset($body, $part);

                if ($part->subtype === 'HTML') {
                    $html = $body;
                } elseif ($part->subtype === 'PLAIN') {
                    $text = $body;
                }
            }

            // Recurse into nested parts
            if (isset($part->parts) && !empty($part->parts)) {
                $this->parseBodyParts($msgno, $part->parts, $partNum, $html, $text);
            }
        }
    }

    /**
     * Decode body based on encoding
     */
    private function decodeBody(string $body, int $encoding): string
    {
        switch ($encoding) {
            case 0: // 7BIT
            case 1: // 8BIT
                return $body;
            case 2: // BINARY
                return $body;
            case 3: // BASE64
                return base64_decode($body);
            case 4: // QUOTED-PRINTABLE
                return quoted_printable_decode($body);
            default:
                return $body;
        }
    }

    /**
     * Convert charset to UTF-8
     */
    private function convertCharset(string $text, $part): string
    {
        $charset = 'UTF-8';

        if (isset($part->parameters)) {
            foreach ($part->parameters as $param) {
                if (strtolower($param->attribute) === 'charset') {
                    $charset = $param->value;
                    break;
                }
            }
        }

        if (strtoupper($charset) !== 'UTF-8') {
            $converted = @iconv($charset, 'UTF-8//IGNORE', $text);
            if ($converted !== false) {
                return $converted;
            }
        }

        return $text;
    }

    /**
     * Decode MIME encoded string
     */
    private function decodeMimeStr(string $string): string
    {
        $elements = imap_mime_header_decode($string);
        $result = '';

        foreach ($elements as $element) {
            $charset = $element->charset === 'default' ? 'UTF-8' : $element->charset;
            $text = $element->text;

            if ($charset !== 'UTF-8') {
                $converted = @iconv($charset, 'UTF-8//IGNORE', $text);
                if ($converted !== false) {
                    $text = $converted;
                }
            }

            $result .= $text;
        }

        return $result;
    }

    /**
     * Check if message has attachments
     */
    private function hasAttachments($structure): bool
    {
        if (isset($structure->parts)) {
            foreach ($structure->parts as $part) {
                if ($part->ifdisposition && strtolower($part->disposition) === 'attachment') {
                    return true;
                }
                if (isset($part->parts) && $this->hasAttachments($part)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Get attachments info
     */
    private function getAttachments(int $msgno, $structure, string $prefix = ''): array
    {
        $attachments = [];

        if (!isset($structure->parts)) {
            return $attachments;
        }

        foreach ($structure->parts as $index => $part) {
            $partNum = $prefix ? $prefix . '.' . ($index + 1) : (string)($index + 1);

            // Check if it's an attachment
            $filename = '';
            $isAttachment = false;

            if ($part->ifdisposition && strtolower($part->disposition) === 'attachment') {
                $isAttachment = true;
            }

            // Get filename
            if ($part->ifdparameters) {
                foreach ($part->dparameters as $param) {
                    if (strtolower($param->attribute) === 'filename') {
                        $filename = $this->decodeMimeStr($param->value);
                        $isAttachment = true;
                    }
                }
            }

            if (!$filename && $part->ifparameters) {
                foreach ($part->parameters as $param) {
                    if (strtolower($param->attribute) === 'name') {
                        $filename = $this->decodeMimeStr($param->value);
                        $isAttachment = true;
                    }
                }
            }

            if ($isAttachment && $filename) {
                $attachments[] = [
                    'filename' => $filename,
                    'contentType' => $this->getContentType($part),
                    'size' => $part->bytes ?? 0,
                    'partId' => $partNum,
                ];
            }

            // Recurse into nested parts
            if (isset($part->parts)) {
                $attachments = array_merge(
                    $attachments,
                    $this->getAttachments($msgno, $part, $partNum)
                );
            }
        }

        return $attachments;
    }

    /**
     * Get content type string
     */
    private function getContentType($part): string
    {
        $types = ['TEXT', 'MULTIPART', 'MESSAGE', 'APPLICATION', 'AUDIO', 'IMAGE', 'VIDEO', 'OTHER'];
        $type = $types[$part->type] ?? 'APPLICATION';
        return strtolower($type) . '/' . strtolower($part->subtype);
    }

    /**
     * Get attachment content
     */
    public function getAttachment(string $folder, int $uid, string $partId): ?array
    {
        $this->selectFolder($folder);

        $msgno = imap_msgno($this->connection, $uid);
        if (!$msgno) {
            return null;
        }

        $structure = imap_fetchstructure($this->connection, $msgno);
        $part = $this->getPartByPath($structure, $partId);

        if (!$part) {
            return null;
        }

        $content = imap_fetchbody($this->connection, $msgno, $partId);
        $content = $this->decodeBody($content, $part->encoding);

        // Get filename
        $filename = 'attachment';
        if ($part->ifdparameters) {
            foreach ($part->dparameters as $param) {
                if (strtolower($param->attribute) === 'filename') {
                    $filename = $this->decodeMimeStr($param->value);
                }
            }
        }
        if ($filename === 'attachment' && $part->ifparameters) {
            foreach ($part->parameters as $param) {
                if (strtolower($param->attribute) === 'name') {
                    $filename = $this->decodeMimeStr($param->value);
                }
            }
        }

        return [
            'filename' => $filename,
            'contentType' => $this->getContentType($part),
            'content' => $content,
        ];
    }

    /**
     * Get part by path (e.g., "1.2.3")
     */
    private function getPartByPath($structure, string $path)
    {
        $parts = explode('.', $path);
        $current = $structure;

        foreach ($parts as $index) {
            $idx = (int)$index - 1;
            if (!isset($current->parts[$idx])) {
                return null;
            }
            $current = $current->parts[$idx];
        }

        return $current;
    }

    /**
     * Search messages
     */
    public function search(string $folder, string $query): array
    {
        $this->selectFolder($folder);

        // Build search criteria
        $criteria = 'OR OR OR SUBJECT "' . $query . '" FROM "' . $query . '" TO "' . $query . '" BODY "' . $query . '"';

        $results = @imap_search($this->connection, $criteria, SE_UID);

        if (!$results) {
            return [];
        }

        $messages = [];
        $results = array_reverse($results); // Newest first

        foreach (array_slice($results, 0, 50) as $uid) { // Limit to 50 results
            $msgno = imap_msgno($this->connection, $uid);
            $header = imap_headerinfo($this->connection, $msgno);
            $structure = imap_fetchstructure($this->connection, $msgno);

            $messages[] = $this->parseMessageHeader($header, $structure, $uid, $msgno);
        }

        return $messages;
    }

    /**
     * Move message to folder
     */
    public function moveMessage(string $folder, int $uid, string $targetFolder): bool
    {
        $this->selectFolder($folder);

        $result = imap_mail_move($this->connection, (string)$uid, $targetFolder, CP_UID);
        imap_expunge($this->connection);

        return $result;
    }

    /**
     * Delete message (move to Trash or permanently delete)
     */
    public function deleteMessage(string $folder, int $uid, bool $permanent = false): bool
    {
        $this->selectFolder($folder);

        if ($permanent || $folder === 'Trash') {
            imap_delete($this->connection, (string)$uid, FT_UID);
            imap_expunge($this->connection);
            return true;
        }

        return $this->moveMessage($folder, $uid, 'Trash');
    }

    /**
     * Set/unset flag
     */
    public function setFlag(string $folder, int $uid, string $flag, bool $set = true): bool
    {
        $this->selectFolder($folder);

        if ($set) {
            return imap_setflag_full($this->connection, (string)$uid, $flag, ST_UID);
        } else {
            return imap_clearflag_full($this->connection, (string)$uid, $flag, ST_UID);
        }
    }

    /**
     * Mark as read/unread
     */
    public function markAsRead(string $folder, int $uid, bool $read = true): bool
    {
        return $this->setFlag($folder, $uid, '\\Seen', $read);
    }

    /**
     * Set/unset star (flagged)
     */
    public function setStarred(string $folder, int $uid, bool $starred = true): bool
    {
        return $this->setFlag($folder, $uid, '\\Flagged', $starred);
    }
}
