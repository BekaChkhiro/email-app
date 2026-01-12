<?php
/**
 * PHP Mail API - Configuration
 *
 * შეცვალე ეს მნიშვნელობები შენი credentials-ით
 */

return [
    // API Authentication
    'api_key' => 'inf_mail_api_8k3mN7xQ2pL9vR4wY6tJ1cF5hB0sD3gA',

    // IMAP Configuration
    'imap' => [
        'host' => 'mail.webin.ge',
        'port' => 993,
        'username' => 'offer@webin.ge',
        'password' => 'Lumia635-',
        'encryption' => 'ssl',  // ssl or tls
        'validate_cert' => true,
    ],

    // SMTP Configuration
    'smtp' => [
        'host' => 'mail.webin.ge',
        'port' => 465,
        'username' => 'offer@webin.ge',
        'password' => 'Lumia635-',
        'encryption' => 'ssl',  // ssl or tls
        'from_email' => 'offer@webin.ge',
        'from_name' => 'Infinity',
    ],

    // Folder mappings (IMAP folder names)
    'folders' => [
        'inbox' => 'INBOX',
        'sent' => 'Sent',
        'drafts' => 'Drafts',
        'trash' => 'Trash',
        'spam' => 'Spam',
    ],

    // Pagination defaults
    'pagination' => [
        'default_limit' => 50,
        'max_limit' => 100,
    ],

    // Allowed origins for CORS (empty = allow all)
    'allowed_origins' => [
        'https://crm.infinity.ge',
        'http://localhost:3000',
    ],
];
