# PHP Mail API - სრული იმპლემენტაციის გეგმა

## მიმოხილვა

მიზანი: ყველა email ოპერაციის გადატანა PHP API-ზე (cPanel), რათა Railway/Vercel-იდან მხოლოდ HTTP მოთხოვნები იგზავნებოდეს.

---

## არქიტექტურა

```
┌─────────────────────────────────────────────────────────────────────┐
│                           NEXT.JS (Railway)                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │ /api/mail/  │ │ /api/mail/  │ │ /api/mail/  │ │ /api/mail/  │   │
│  │  folders    │ │  messages   │ │    send     │ │   search    │   │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘   │
│         │               │               │               │          │
│         └───────────────┴───────┬───────┴───────────────┘          │
│                                 │                                   │
│                          HTTP POST/GET                              │
│                                 │                                   │
└─────────────────────────────────┼───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           PHP API (cPanel)                          │
│                        api.webin.ge                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │  folders    │ │  messages   │ │    send     │ │   search    │   │
│  │    .php     │ │    .php     │ │   mail.php  │ │    .php     │   │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘   │
│         │               │               │               │          │
│         └───────────────┴───────┬───────┴───────────────┘          │
│                                 │                                   │
│                          IMAP / SMTP                                │
│                          (localhost)                                │
│                                 │                                   │
└─────────────────────────────────┼───────────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │      Mail Server        │
                    │    mail.webin.ge        │
                    │   (იგივე სერვერი)       │
                    └─────────────────────────┘
```

---

## PHP API ფაილების სტრუქტურა

```
api.webin.ge/
├── index.php              # Router / Entry point
├── config.php             # კონფიგურაცია (credentials)
├── auth.php               # API Key ვალიდაცია
├── imap-helper.php        # IMAP ფუნქციები
├── endpoints/
│   ├── folders.php        # საქაღალდეების სია
│   ├── messages.php       # მეილების სია
│   ├── message.php        # ერთი მეილი (დეტალები)
│   ├── send.php           # მეილის გაგზავნა (არსებული)
│   ├── search.php         # ძიება
│   ├── move.php           # მეილის გადატანა
│   ├── star.php           # ვარსკვლავის toggle
│   └── delete.php         # მეილის წაშლა
└── .htaccess              # URL Rewriting + Security
```

---

## API Endpoints დეტალურად

### 1. GET /folders
**აღწერა:** საქაღალდეების სია unread count-ით

**Request:**
```http
GET /folders
X-Api-Key: your_api_key
```

**Response:**
```json
{
  "success": true,
  "folders": [
    {"name": "INBOX", "path": "INBOX", "total": 150, "unread": 5},
    {"name": "Sent", "path": "Sent", "total": 45, "unread": 0},
    {"name": "Drafts", "path": "Drafts", "total": 3, "unread": 0},
    {"name": "Trash", "path": "Trash", "total": 12, "unread": 0}
  ]
}
```

---

### 2. GET /messages
**აღწერა:** მეილების სია (paginated)

**Request:**
```http
GET /messages?folder=INBOX&page=1&limit=50
X-Api-Key: your_api_key
```

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": "abc123",
      "uid": 1234,
      "messageId": "<msg123@example.com>",
      "subject": "Hello World",
      "from": {"name": "John Doe", "address": "john@example.com"},
      "to": [{"name": "Me", "address": "me@webin.ge"}],
      "date": "2024-01-12T10:30:00Z",
      "preview": "This is the beginning of the email...",
      "hasAttachments": false,
      "isRead": true,
      "isStarred": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

---

### 3. GET /message
**აღწერა:** ერთი მეილის სრული შიგთავსი

**Request:**
```http
GET /message?folder=INBOX&uid=1234
X-Api-Key: your_api_key
```

**Response:**
```json
{
  "success": true,
  "message": {
    "id": "abc123",
    "uid": 1234,
    "messageId": "<msg123@example.com>",
    "subject": "Hello World",
    "from": {"name": "John Doe", "address": "john@example.com"},
    "to": [{"name": "Me", "address": "me@webin.ge"}],
    "cc": [],
    "date": "2024-01-12T10:30:00Z",
    "html": "<html>...</html>",
    "text": "Plain text version...",
    "attachments": [
      {
        "filename": "document.pdf",
        "contentType": "application/pdf",
        "size": 102400,
        "partId": "2"
      }
    ],
    "isRead": true,
    "isStarred": false
  }
}
```

---

### 4. POST /send (უკვე არსებობს)
**აღწერა:** მეილის გაგზავნა

**Request:**
```http
POST /send
Content-Type: application/json
X-Api-Key: your_api_key

{
  "to": "recipient@example.com",
  "cc": "cc@example.com",
  "bcc": "bcc@example.com",
  "subject": "Subject line",
  "html": "<p>HTML content</p>",
  "text": "Plain text",
  "attachments": [
    {
      "filename": "file.pdf",
      "content": "base64_encoded_content",
      "contentType": "application/pdf"
    }
  ]
}
```

---

### 5. GET /search
**აღწერა:** მეილების ძიება

**Request:**
```http
GET /search?folder=INBOX&q=search+term
X-Api-Key: your_api_key
```

**Response:**
```json
{
  "success": true,
  "messages": [...],
  "total": 5
}
```

---

### 6. POST /move
**აღწერა:** მეილის სხვა საქაღალდეში გადატანა

**Request:**
```http
POST /move
Content-Type: application/json
X-Api-Key: your_api_key

{
  "folder": "INBOX",
  "uid": 1234,
  "targetFolder": "Trash"
}
```

---

### 7. POST /star
**აღწერა:** ვარსკვლავის toggle

**Request:**
```http
POST /star
Content-Type: application/json
X-Api-Key: your_api_key

{
  "folder": "INBOX",
  "uid": 1234,
  "starred": true
}
```

---

### 8. POST /read
**აღწერა:** წაკითხულად მონიშვნა

**Request:**
```http
POST /read
Content-Type: application/json
X-Api-Key: your_api_key

{
  "folder": "INBOX",
  "uid": 1234,
  "read": true
}
```

---

### 9. GET /attachment
**აღწერა:** Attachment-ის ჩამოტვირთვა

**Request:**
```http
GET /attachment?folder=INBOX&uid=1234&partId=2
X-Api-Key: your_api_key
```

**Response:** Binary file with appropriate Content-Type header

---

## Next.js API Routes ცვლილებები

### შესაცვლელი ფაილები:

| ფაილი | ცვლილება |
|-------|----------|
| `/api/mail/folders/route.ts` | PHP API-ს გამოძახება |
| `/api/mail/messages/route.ts` | PHP API-ს გამოძახება |
| `/api/mail/messages/[id]/route.ts` | PHP API-ს გამოძახება |
| `/api/mail/messages/[id]/move/route.ts` | PHP API-ს გამოძახება |
| `/api/mail/messages/[id]/star/route.ts` | PHP API-ს გამოძახება |
| `/api/mail/messages/[id]/read/route.ts` | PHP API-ს გამოძახება |
| `/api/mail/search/route.ts` | PHP API-ს გამოძახება |
| `/api/mail/send/route.ts` | უკვე შეცვლილია ✓ |

### წასაშლელი ფაილები:
| ფაილი | მიზეზი |
|-------|--------|
| `src/lib/imap.ts` | აღარ გჭირდება - PHP აკეთებს |

### შესანარჩუნებელი:
| ფაილი | მიზეზი |
|-------|--------|
| `src/lib/smtp.ts` | შეიძლება დაგჭირდეს fallback-ად |

---

## იმპლემენტაციის ფაზები

### ფაზა 1: PHP Core (2-3 საათი)
1. `config.php` - კონფიგურაცია
2. `auth.php` - ავთენტიფიკაცია
3. `imap-helper.php` - IMAP კავშირი და ფუნქციები
4. `index.php` - Router
5. `.htaccess` - URL rewriting

### ფაზა 2: PHP Endpoints - კითხვა (2-3 საათი)
1. `endpoints/folders.php`
2. `endpoints/messages.php`
3. `endpoints/message.php`
4. `endpoints/search.php`
5. `endpoints/attachment.php`

### ფაზა 3: PHP Endpoints - მოქმედებები (1-2 საათი)
1. `endpoints/move.php`
2. `endpoints/star.php`
3. `endpoints/read.php`
4. `endpoints/delete.php`
5. `endpoints/send.php` გადატანა (უკვე არსებობს)

### ფაზა 4: Next.js ინტეგრაცია (2-3 საათი)
1. PHP API wrapper ფუნქციის შექმნა
2. ყველა route.ts ფაილის განახლება
3. Error handling
4. ტესტირება

### ფაზა 5: ტესტირება და გამართვა (1-2 საათი)
1. ყველა endpoint-ის ტესტი
2. Error handling შემოწმება
3. Performance ტესტი
4. Edge cases

---

## Environment Variables

### Railway (ახალი):
```env
PHP_MAIL_API_URL=https://api.webin.ge
PHP_MAIL_API_KEY=inf_mail_api_8k3mN7xQ2pL9vR4wY6tJ1cF5hB0sD3gA
```

### წასაშლელი Railway-დან:
```env
IMAP_HOST      ❌
IMAP_PORT      ❌
IMAP_USER      ❌
IMAP_PASSWORD  ❌
SMTP_HOST      ❌
SMTP_PORT      ❌
SMTP_USER      ❌
SMTP_PASSWORD  ❌
```

---

## უსაფრთხოება

1. **API Key** - ყველა მოთხოვნას ესაჭიროება
2. **HTTPS** - მხოლოდ HTTPS კავშირები
3. **Rate Limiting** - PHP-ში შეიძლება დაემატოს
4. **Input Validation** - ყველა input უნდა შემოწმდეს
5. **Error Messages** - არ გავამჟღავნოთ sensitive info

---

## Rollback გეგმა

თუ პრობლემა შეიქმნა:

1. Railway-ზე დააბრუნე IMAP variables
2. Next.js routes-ში დააბრუნე ძველი კოდი (git revert)
3. PHP API შეგიძლია დატოვო parallel-ად

---

## შეფასება

| კრიტერიუმი | ძველი (IMAP პირდაპირ) | ახალი (PHP API) |
|------------|----------------------|-----------------|
| სისწრაფე | ნელი (network latency) | სწრაფი (localhost) |
| სტაბილურობა | timeout პრობლემები | სტაბილური |
| მხარდაჭერა | რთული debugging | მარტივი (PHP logs) |
| უსაფრთხოება | IMAP ports ღია | მხოლოდ HTTPS |
| კომპლექსურობა | 1 codebase | 2 codebase (PHP + Next.js) |

---

## შემდეგი ნაბიჯი

გეგმა მზადაა. დავიწყოთ ფაზა 1-ით?
