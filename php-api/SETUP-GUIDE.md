# PHP Mail API - დეტალური ინსტრუქცია

## შესავალი

ეს გაიდი აგიხსნით როგორ დააკონფიგურიროთ PHP Mail API cPanel-ზე, რათა Railway/Vercel-იდან მეილების გაგზავნა იმუშაოს.

**არქიტექტურა:**
```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Next.js App   │  HTTP   │   PHP API       │  SMTP   │   Mail Server   │
│   (Railway)     │ ──────► │   (cPanel)      │ ──────► │   (cPanel)      │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

---

## ნაბიჯი 1: API Key-ის გენერაცია

პირველ რიგში დაგჭირდება უნიკალური API Key. ეს არის საიდუმლო გასაღები რომელიც დაიცავს API-ს არაავტორიზებული წვდომისგან.

### ვარიანტი A: ტერმინალით (Linux/Mac)
```bash
openssl rand -hex 32
```

შედეგი მსგავსი იქნება:
```
7f3a9c2b8e4d1f6a0c5b3e7d9a2f4c8b1e6d3a7c9b2f5e8d4a1c7b3e6f9d2a5c
```

### ვარიანტი B: ონლაინ გენერატორი
1. გადადი: https://generate-random.org/api-key-generator
2. აირჩიე 64 სიმბოლო
3. დააკოპირე გენერირებული key

### ვარიანტი C: ხელით შექმნა
შექმენი 32+ სიმბოლოიანი სტრინგი რომელიც შეიცავს:
- დიდ და პატარა ასოებს (a-z, A-Z)
- ციფრებს (0-9)
- არ გამოიყენო სპეციალური სიმბოლოები

**მაგალითი:** `Infinity2024SecureMailApiKeyXyz789Abc`

⚠️ **მნიშვნელოვანი:** ეს key შეინახე უსაფრთხო ადგილას. დაგჭირდება 2 ადგილას ჩასმა.

---

## ნაბიჯი 2: cPanel-ში შესვლა

1. გახსენი ბრაუზერში: `https://yourdomain.com:2083` ან `https://yourdomain.com/cpanel`
2. შეიყვანე cPanel credentials

---

## ნაბიჯი 3: File Manager-ის გახსნა

1. cPanel-ის მთავარ გვერდზე იპოვე **"File Manager"**
2. დააკლიკე გასახსნელად
3. გადადი **public_html** საქაღალდეში

---

## ნაბიჯი 4: API საქაღალდის შექმნა

1. File Manager-ში დააკლიკე **"+ Folder"** (ახალი საქაღალდე)
2. სახელი: `api`
3. დააჭირე **"Create New Folder"**

ახლა გექნება: `/public_html/api/`

---

## ნაბიჯი 5: send-mail.php ფაილის შექმნა

### ვარიანტი A: ფაილის ატვირთვა
1. გახსენი `api` საქაღალდე
2. დააკლიკე **"Upload"**
3. ატვირთე `send-mail.php` ფაილი პროექტის `php-api/` საქაღალდიდან

### ვარიანტი B: ფაილის შექმნა cPanel-ში
1. გახსენი `api` საქაღალდე
2. დააკლიკე **"+ File"** (ახალი ფაილი)
3. სახელი: `send-mail.php`
4. დააჭირე **"Create New File"**
5. დააკლიკე ფაილზე მარჯვენა ღილაკით → **"Edit"**
6. ჩასვი PHP კოდი (იხილე ქვემოთ)
7. დააჭირე **"Save Changes"**

---

## ნაბიჯი 6: PHP კოდის კონფიგურაცია

გახსენი `send-mail.php` რედაქტირებისთვის და იპოვე ეს სექცია (დაახლოებით მე-20 სტრიქონზე):

```php
$config = [
    'api_key' => 'YOUR_SECRET_API_KEY_HERE', // შეცვალე!
    'smtp_host' => 'localhost',
    'smtp_port' => 25,
    'smtp_user' => 'info@infinity.ge',       // შეცვალე შენი email-ით
    'smtp_pass' => 'YOUR_EMAIL_PASSWORD',    // შეცვალე შენი პაროლით
    'smtp_secure' => false,
    'from_email' => 'info@infinity.ge',      // შეცვალე შენი email-ით
    'from_name' => 'Infinity',               // შეცვალე შენი სახელით
];
```

### შესაცვლელი მნიშვნელობები:

| პარამეტრი | რა ჩაწერო | მაგალითი |
|-----------|-----------|----------|
| `api_key` | ნაბიჯ 1-ში გენერირებული key | `7f3a9c2b8e4d1f6a...` |
| `smtp_user` | შენი cPanel email მისამართი | `info@infinity.ge` |
| `smtp_pass` | ამ email-ის პაროლი | `MySecurePass123` |
| `from_email` | იგივე email მისამართი | `info@infinity.ge` |
| `from_name` | გამგზავნის სახელი | `Infinity` |

### მაგალითი შევსებული კონფიგურაციის:

```php
$config = [
    'api_key' => '7f3a9c2b8e4d1f6a0c5b3e7d9a2f4c8b1e6d3a7c9b2f5e8d4a1c7b3e6f9d2a5c',
    'smtp_host' => 'localhost',
    'smtp_port' => 25,
    'smtp_user' => 'info@infinity.ge',
    'smtp_pass' => 'MyActualPassword123',
    'smtp_secure' => false,
    'from_email' => 'info@infinity.ge',
    'from_name' => 'Infinity',
];
```

დააჭირე **"Save Changes"**

---

## ნაბიჯი 7: .htaccess ფაილის შექმნა (უსაფრთხოება)

1. `api` საქაღალდეში შექმენი ახალი ფაილი: `.htaccess`
2. ჩაწერე:

```apache
# Disable directory listing
Options -Indexes

# Only allow POST and OPTIONS requests
<Files "send-mail.php">
    <LimitExcept POST OPTIONS>
        Deny from all
    </LimitExcept>
</Files>
```

3. Save Changes

---

## ნაბიჯი 8: API-ს ტესტირება

### ბრაუზერით შემოწმება
გახსენი: `https://infinity.ge/api/send-mail.php`

უნდა დაგიბრუნოს:
```json
{"success":false,"error":"Method not allowed"}
```

ეს ნიშნავს რომ ფაილი მუშაობს! (GET მეთოდი აკრძალულია, მხოლოდ POST შეიძლება)

### cURL-ით ტესტირება (ტერმინალიდან)

```bash
curl -X POST https://infinity.ge/api/send-mail.php \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: YOUR_API_KEY_HERE" \
  -d '{
    "to": "test@gmail.com",
    "subject": "Test Email",
    "html": "<h1>გამარჯობა!</h1><p>ეს არის სატესტო მეილი.</p>"
  }'
```

წარმატების შემთხვევაში:
```json
{"success":true,"messageId":"<123456@infinity.ge>","method":"native_mail"}
```

---

## ნაბიჯი 9: Railway Environment Variables

1. გახსენი Railway Dashboard: https://railway.app/dashboard
2. აირჩიე შენი პროექტი
3. გადადი **Variables** ტაბზე
4. დაამატე 2 ახალი ცვლადი:

| Variable Name | Value |
|---------------|-------|
| `PHP_MAIL_API_URL` | `https://infinity.ge/api/send-mail.php` |
| `PHP_MAIL_API_KEY` | იგივე key რაც PHP ფაილში ჩაწერე |

5. დააჭირე **Deploy** ან დაელოდე auto-deploy-ს

---

## ნაბიჯი 10: აპლიკაციის ტესტირება

1. გახსენი შენი აპლიკაცია Railway-ზე
2. გადადი Mail გვერდზე
3. დააჭირე "Compose" (ახალი მეილი)
4. შეავსე მიმღები, თემა, ტექსტი
5. დააჭირე "Send"
6. გახსენი Browser Console (F12 → Console) ლოგების სანახავად

---

## Troubleshooting (პრობლემების გადაჭრა)

### პრობლემა: 401 Unauthorized
**მიზეზი:** API Key არ ემთხვევა

**გადაწყვეტა:**
- შეამოწმე რომ PHP ფაილში და Railway-ზე იგივე key გაქვს
- დარწმუნდი რომ key-ში არ არის ზედმეტი სფეისები

---

### პრობლემა: 500 Internal Server Error
**მიზეზი:** PHP შეცდომა

**გადაწყვეტა:**
1. cPanel → Error Log
2. ნახე რა შეცდომაა
3. ხშირი მიზეზები:
   - JSON syntax error
   - SMTP credentials არასწორია

---

### პრობლემა: მეილი იგზავნება მაგრამ არ მოდის
**მიზეზი:** Spam folder ან SMTP პრობლემა

**გადაწყვეტა:**
1. შეამოწმე spam საქაღალდე
2. cPanel → Email Deliverability → შეამოწმე SPF/DKIM

---

### პრობლემა: Connection refused
**მიზეზი:** SMTP პორტი არასწორია

**გადაწყვეტა:**
სცადე სხვადასხვა პორტი PHP კონფიგურაციაში:
- `25` - standard (no encryption)
- `465` - SSL (`'smtp_secure' => true`)
- `587` - TLS

---

## ფაილების სტრუქტურა

საბოლოოდ cPanel-ზე უნდა გქონდეს:

```
/public_html/
└── api/
    ├── send-mail.php
    └── .htaccess
```

---

## უსაფრთხოების რჩევები

1. **API Key:** არასოდეს გააზიარო და არ ჩადო Git-ში
2. **HTTPS:** ყოველთვის გამოიყენე HTTPS (არა HTTP)
3. **პაროლები:** გამოიყენე ძლიერი პაროლები
4. **Logs:** პერიოდულად შეამოწმე cPanel error logs

---

## დამატებითი: PHPMailer-ის ინსტალაცია (Optional)

თუ native `mail()` ფუნქცია პრობლემურია, შეგიძლია PHPMailer დაამატო:

1. ჩამოტვირთე: https://github.com/PHPMailer/PHPMailer/releases
2. გახსენი ZIP
3. შექმენი საქაღალდე: `/public_html/api/PHPMailer/`
4. ატვირთე `src/` საქაღალდე

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

PHP ავტომატურად გამოიყენებს PHPMailer-ს თუ ნახავს.
