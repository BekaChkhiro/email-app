# PHP Mail API - Setup Guide

## 1. cPanel-ზე ატვირთვა

1. შექმენი საქაღალდე cPanel-ზე: `/public_html/api/`
2. ატვირთე `send-mail.php` ფაილი
3. URL იქნება: `https://yourdomain.com/api/send-mail.php`

## 2. PHP ფაილის კონფიგურაცია

გახსენი `send-mail.php` და შეცვალე კონფიგურაცია:

```php
$config = [
    'api_key' => 'YOUR_SECRET_API_KEY_HERE', // გენერირებული გასაღები (მაგ: openssl rand -hex 32)
    'smtp_host' => 'localhost',
    'smtp_port' => 25,
    'smtp_user' => 'info@infinity.ge',        // შენი email
    'smtp_pass' => 'YOUR_EMAIL_PASSWORD',     // შენი email პაროლი
    'smtp_secure' => false,
    'from_email' => 'info@infinity.ge',
    'from_name' => 'Infinity',
];
```

## 3. API Key გენერაცია

ტერმინალში გაუშვი:
```bash
openssl rand -hex 32
```

ან ონლაინ: https://generate-random.org/api-key-generator

## 4. Railway/Vercel Environment Variables

დაამატე ეს ცვლადები:

```
PHP_MAIL_API_URL=https://yourdomain.com/api/send-mail.php
PHP_MAIL_API_KEY=your_generated_api_key
```

## 5. ტესტირება

cURL-ით შეგიძლია შეამოწმო:

```bash
curl -X POST https://yourdomain.com/api/send-mail.php \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: your_api_key" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<h1>Hello!</h1><p>This is a test.</p>"
  }'
```

## 6. PHPMailer (Optional - უკეთესი SMTP)

თუ გინდა PHPMailer გამოიყენო:

1. ჩამოტვირთე: https://github.com/PHPMailer/PHPMailer/releases
2. შექმენი საქაღალდე: `/public_html/api/PHPMailer/`
3. ატვირთე `src/` საქაღალდე PHPMailer-დან

სტრუქტურა:
```
/public_html/api/
├── send-mail.php
├── .htaccess
└── PHPMailer/
    └── src/
        ├── PHPMailer.php
        ├── SMTP.php
        └── Exception.php
```

## 7. უსაფრთხოება

- API Key უნდა იყოს რთული და უნიკალური
- არასოდეს გააზიარო API Key
- .htaccess ფაილი იცავს PHPMailer საქაღალდეს

## Troubleshooting

**500 Error:**
- შეამოწმე PHP error log cPanel-ში
- დარწმუნდი რომ JSON input სწორია

**401 Unauthorized:**
- შეამოწმე API Key
- Header უნდა იყოს `X-Api-Key`

**Email არ იგზავნება:**
- შეამოწმე SMTP credentials
- cPanel-ზე შეიძლება საჭირო იყოს "Remote Mail Exchanger" ჩართვა
