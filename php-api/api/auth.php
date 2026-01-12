<?php
/**
 * PHP Mail API - Authentication
 *
 * API Key ვალიდაცია და CORS headers
 */

class Auth
{
    private $config;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    /**
     * Set CORS headers
     */
    public function setCorsHeaders(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $allowedOrigins = $this->config['allowed_origins'] ?? [];

        // Allow specific origins or all if empty
        if (empty($allowedOrigins) || in_array($origin, $allowedOrigins)) {
            header('Access-Control-Allow-Origin: ' . ($origin ?: '*'));
        }

        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, X-Api-Key');
        header('Access-Control-Max-Age: 86400'); // 24 hours cache
        header('Content-Type: application/json; charset=utf-8');
    }

    /**
     * Handle preflight OPTIONS request
     */
    public function handlePreflight(): bool
    {
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit;
        }
        return false;
    }

    /**
     * Validate API Key from request headers
     */
    public function validateApiKey(): bool
    {
        $headers = $this->getRequestHeaders();
        $apiKey = $headers['X-Api-Key'] ?? $headers['x-api-key'] ?? '';

        if (empty($apiKey)) {
            $this->sendError('API key is required', 401);
            return false;
        }

        if ($apiKey !== $this->config['api_key']) {
            $this->sendError('Invalid API key', 401);
            return false;
        }

        return true;
    }

    /**
     * Get all request headers (cross-platform)
     */
    private function getRequestHeaders(): array
    {
        if (function_exists('getallheaders')) {
            return getallheaders();
        }

        // Fallback for servers that don't have getallheaders
        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (substr($key, 0, 5) === 'HTTP_') {
                $header = str_replace(' ', '-', ucwords(str_replace('_', ' ', strtolower(substr($key, 5)))));
                $headers[$header] = $value;
            }
        }
        return $headers;
    }

    /**
     * Send error response and exit
     */
    public function sendError(string $message, int $code = 400): void
    {
        http_response_code($code);
        echo json_encode([
            'success' => false,
            'error' => $message
        ]);
        exit;
    }

    /**
     * Send success response
     */
    public function sendSuccess(array $data): void
    {
        http_response_code(200);
        echo json_encode(array_merge(['success' => true], $data));
        exit;
    }
}
