# 📧 Email Campaign Platform - Development Plan

## პროექტის მიმოხილვა

**პლატფორმა:** B2B Email Campaign Management System  
**კლიენტების ბაზა:** 28,010 კომპანია (18,564 email-ით)  
**ტექნოლოგიური სტეკი:** Next.js 14 + PostgreSQL + Drizzle ORM + Resend API  
**ჰოსტინგი:** Railway (Full Stack)

---

# 🔵 ფაზა 1: Infrastructure Setup (Railway + Database)

## 1.1 რას ვაკეთებთ ამ ფაზაში

ამ ფაზაში ვქმნით პროექტის ფუნდამენტს:
- Railway-ზე PostgreSQL მონაცემთა ბაზის შექმნა
- Next.js პროექტის ინიციალიზაცია
- Drizzle ORM კონფიგურაცია
- მონაცემთა ბაზის სქემის შექმნა და მიგრაცია
- Railway-ზე deployment pipeline-ის გამართვა

## 1.2 დეტალური ნაბიჯები

### Railway Setup (Manual Steps)

```
1. შედი railway.app → New Project
2. Add PostgreSQL Database
3. დააკოპირე DATABASE_URL (Settings → Variables)
4. Add New Service → Empty Service (Next.js-ისთვის)
5. Connect GitHub Repository (შემდეგ ნაბიჯში შევქმნით)
```

### Database Schema

```sql
-- clients: კლიენტების ძირითადი ცხრილი
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(500),
    category VARCHAR(300),
    city VARCHAR(100),
    address TEXT,
    identification_code VARCHAR(50),
    phone_primary VARCHAR(50),
    phone_secondary VARCHAR(50),
    phone_tertiary VARCHAR(50),
    email VARCHAR(255),
    email_secondary VARCHAR(255),
    website VARCHAR(500),
    facebook VARCHAR(500),
    status VARCHAR(20) DEFAULT 'active',
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- email_templates: ტემპლეიტების ცხრილი
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    html_content TEXT NOT NULL,
    plain_content TEXT,
    variables TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- campaigns: კამპანიების ცხრილი
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    template_id UUID REFERENCES email_templates(id),
    status VARCHAR(20) DEFAULT 'draft',
    daily_limit INTEGER DEFAULT 10,
    send_start_hour INTEGER DEFAULT 9,
    send_end_hour INTEGER DEFAULT 18,
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- campaign_recipients: კამპანიის მიმღებები
CREATE TABLE campaign_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    error_message TEXT,
    UNIQUE(campaign_id, client_id)
);

-- email_history: გაგზავნილი მეილების ისტორია (CRM)
CREATE TABLE email_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id),
    template_id UUID REFERENCES email_templates(id),
    subject VARCHAR(500),
    content_preview TEXT,
    resend_message_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'sent',
    sent_at TIMESTAMP DEFAULT NOW(),
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP
);

-- client_notes: კლიენტის შენიშვნები
CREATE TABLE client_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_company ON clients(company_name);
CREATE INDEX idx_clients_category ON clients(category);
CREATE INDEX idx_clients_city ON clients(city);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_campaign_recipients_status ON campaign_recipients(campaign_id, status);
CREATE INDEX idx_email_history_client ON email_history(client_id);
CREATE INDEX idx_email_history_campaign ON email_history(campaign_id);
```

## 1.3 Claude Code Prompt (Phase 1)

```
I need you to set up a Next.js 14 project with Railway PostgreSQL integration.

## Project Setup

1. Create a new Next.js 14 project with:
   - TypeScript
   - App Router
   - Tailwind CSS
   - src/ directory

2. Install dependencies:
   - drizzle-orm
   - drizzle-kit
   - postgres (pg driver)
   - @types/pg
   - dotenv

3. Create Drizzle schema in `src/db/schema.ts` with these tables:
   - clients (id, company_name, category, city, address, identification_code, phone_primary, phone_secondary, phone_tertiary, email, email_secondary, website, facebook, status, tags, created_at, updated_at)
   - email_templates (id, name, subject, html_content, plain_content, variables, is_active, created_at, updated_at)
   - campaigns (id, name, template_id, status, daily_limit, send_start_hour, send_end_hour, total_recipients, sent_count, created_at, started_at, completed_at)
   - campaign_recipients (id, campaign_id, client_id, status, scheduled_at, sent_at, error_message)
   - email_history (id, client_id, campaign_id, template_id, subject, content_preview, resend_message_id, status, sent_at, opened_at, clicked_at)
   - client_notes (id, client_id, note, created_by, created_at)

4. Create database connection in `src/db/index.ts`

5. Create drizzle.config.ts for migrations

6. Add these scripts to package.json:
   - "db:generate": "drizzle-kit generate"
   - "db:migrate": "drizzle-kit migrate"
   - "db:push": "drizzle-kit push"
   - "db:studio": "drizzle-kit studio"

7. Create .env.example with DATABASE_URL placeholder

8. Create railway.json for deployment configuration

DATABASE_URL format: postgresql://user:password@host:port/database

Make sure all indexes are created for optimal query performance, especially on email, company_name, category, and status fields.
```

## 1.4 ტესტირების ჩეკლისტი (Phase 1)

| # | ტესტი | მოსალოდნელი შედეგი | სტატუსი |
|---|-------|-------------------|---------|
| 1 | `npm run dev` | აპლიკაცია იხსნება localhost:3000-ზე | ⬜ |
| 2 | `npm run db:push` | სქემა იქმნება Railway DB-ში | ⬜ |
| 3 | `npm run db:studio` | Drizzle Studio იხსნება, ცხრილები ჩანს | ⬜ |
| 4 | Railway Dashboard | PostgreSQL service status: "Active" | ⬜ |
| 5 | Railway Dashboard | Next.js service deploys successfully | ⬜ |
| 6 | Production URL | აპლიკაცია იხსნება Railway URL-ზე | ⬜ |

### SQL ტესტები (Drizzle Studio-ში ან psql-ით)

```sql
-- ტესტი: ცხრილები შეიქმნა?
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- ტესტი: indexes შეიქმნა?
SELECT indexname FROM pg_indexes WHERE schemaname = 'public';

-- ტესტი: ტესტური ჩანაწერის დამატება
INSERT INTO clients (company_name, email, city) 
VALUES ('Test Company', 'test@example.com', 'Tbilisi');

-- ტესტი: წაკითხვა
SELECT * FROM clients;
```

---

# 🟢 ფაზა 2: Client Import System

## 2.1 რას ვაკეთებთ ამ ფაზაში

ამ ფაზაში ვქმნით კლიენტების იმპორტის სისტემას:
- Excel/CSV ფაილის Upload კომპონენტი
- Client-side streaming parsing (PapaParse)
- Chunked batch import (500 ჩანაწერი/batch)
- Progress tracking UI
- Data validation და duplicate handling
- Import history და error reporting

## 2.2 Import Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     IMPORT FLOW                              │
└─────────────────────────────────────────────────────────────┘

   User uploads XLSX/CSV (28,000 rows)
              │
              ▼
   ┌─────────────────────┐
   │  1. File Selection  │  ← Drag & drop or click
   └─────────────────────┘
              │
              ▼
   ┌─────────────────────┐
   │  2. Preview & Map   │  ← Show first 10 rows
   │     Columns         │  ← Map Excel cols to DB fields
   └─────────────────────┘
              │
              ▼
   ┌─────────────────────┐
   │  3. Validation      │  ← Check required fields
   │                     │  ← Validate email format
   └─────────────────────┘
              │
              ▼
   ┌─────────────────────┐
   │  4. Streaming Parse │  ← PapaParse chunk mode
   │     (Client-side)   │  ← 500 rows at a time
   └─────────────────────┘
              │
              ▼
   ┌─────────────────────┐
   │  5. Batch Upload    │  ← POST /api/clients/import
   │     to API          │  ← 500 rows per request
   └─────────────────────┘
              │
              ▼
   ┌─────────────────────┐
   │  6. Batch INSERT    │  ← ON CONFLICT skip duplicates
   │     to PostgreSQL   │  ← Track progress
   └─────────────────────┘
              │
              ▼
   ┌─────────────────────┐
   │  7. Progress UI     │  ← Real-time progress bar
   │     & Results       │  ← Show success/skip/error counts
   └─────────────────────┘
```

## 2.3 Column Mapping (YELL_GE.xlsx → Database)

| Excel Column | Database Field | Transform |
|--------------|---------------|-----------|
| `კომპანიის სახელი` | company_name | trim |
| `მისამართი` | category + city + address | split by " - " |
| `საიდენტიფიკაციოColumn6` | identification_code | trim |
| `ნომერი` | phone_primary | normalize |
| `Column9` | email | validate, lowercase |
| `Column10` | phone_secondary | normalize |
| `Column11` | website | trim |
| `Column12` | phone_tertiary | - |
| `Column13` | facebook | - |

### Data Transformation Logic

```typescript
function transformRow(row: ExcelRow): ClientInsert {
  // Split "კატეგორია - თბილისი, მისამართი" 
  const addressParts = row['მისამართი']?.split(' - ') || [];
  const category = addressParts[0]?.trim() || null;
  
  let city = null;
  let address = null;
  if (addressParts[1]) {
    const cityMatch = addressParts[1].match(/^([^,]+)/);
    city = cityMatch ? cityMatch[1].trim() : null;
    address = addressParts[1];
  }
  
  return {
    company_name: row['კომპანიის სახელი ']?.trim() || null,
    category,
    city,
    address,
    identification_code: row['საიდენტიფიკაციოColumn6']?.toString().trim() || null,
    phone_primary: normalizePhone(row['ნომერი']),
    phone_secondary: normalizePhone(row['Column10']),
    phone_tertiary: normalizePhone(row['Column12']),
    email: validateAndNormalizeEmail(row['Column9']),
    website: row['Column11']?.trim() || null,
    facebook: extractFacebook(row['Column11'], row['Column13']),
    status: 'active'
  };
}
```

## 2.4 Claude Code Prompt (Phase 2)

```
I need you to build a client import system for our email campaign platform.

## Requirements

### 1. File Upload Component (`src/components/import/FileUploader.tsx`)
- Drag & drop zone for XLSX/CSV files
- File size limit: 50MB
- Show file name and size after selection
- "Remove file" button

### 2. Column Mapping Component (`src/components/import/ColumnMapper.tsx`)
- Preview first 10 rows of uploaded file
- Auto-detect columns from the Excel file
- Allow manual mapping: Excel column → Database field
- Required fields: email (at least for email campaigns)
- Save mapping preferences to localStorage

### 3. Import Preview Component (`src/components/import/ImportPreview.tsx`)
- Show statistics: total rows, rows with email, rows without email
- Validation summary: invalid emails, duplicates found
- "Start Import" button

### 4. Import Progress Component (`src/components/import/ImportProgress.tsx`)
- Progress bar with percentage
- Counters: Imported / Skipped / Failed
- Current batch indicator (e.g., "Processing batch 45/56")
- Elapsed time and estimated remaining time
- Cancel button
- Error log (collapsible)

### 5. API Route (`src/app/api/clients/import/route.ts`)
- POST endpoint accepting JSON array of clients (max 500 per request)
- Validate each row
- Batch INSERT with ON CONFLICT DO NOTHING (skip duplicates on email)
- Return: { imported: number, skipped: number, errors: string[] }

### 6. Import Page (`src/app/(dashboard)/clients/import/page.tsx`)
- Step wizard: Upload → Map → Preview → Import → Results
- Use React state to track current step
- Handle the full import flow

### 7. Client-side Parsing Logic
Use PapaParse for streaming:
```javascript
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// For XLSX files, first convert to CSV
const workbook = XLSX.read(fileBuffer, { type: 'array' });
const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
const csvData = XLSX.utils.sheet_to_csv(firstSheet);

// Then stream parse with PapaParse
Papa.parse(csvData, {
  header: true,
  chunk: async (results, parser) => {
    parser.pause();
    await uploadChunk(results.data);
    updateProgress();
    parser.resume();
  },
  complete: () => {
    showResults();
  }
});
```

### 8. Data Transformation
Transform the YELL_GE.xlsx format:
- Split "მისამართი" by " - " to extract: category (first part), city + address (second part)
- Column mappings:
  - კომპანიის სახელი → company_name
  - მისამართი → category, city, address (split)
  - საიდენტიფიკაციო → identification_code  
  - ნომერი → phone_primary
  - Column9 → email
  - Column10 → phone_secondary
  - Column11 → website
  - Column12 → phone_tertiary

### 9. Dependencies to Install
- papaparse
- xlsx (SheetJS)
- @types/papaparse

### 10. Validation Rules
- Email: valid format, lowercase, trim whitespace
- Phone: remove spaces, allow Georgian formats
- Skip rows without email (but still import for CRM purposes)
- Mark duplicates by email

The import should handle 28,000+ rows efficiently using chunked processing (500 rows per batch).
```

## 2.5 ტესტირების ჩეკლისტი (Phase 2)

| # | ტესტი | მოსალოდნელი შედეგი | სტატუსი |
|---|-------|-------------------|---------|
| 1 | Upload XLSX file | ფაილი მიიღება, preview ჩანს | ⬜ |
| 2 | Upload CSV file | ფაილი მიიღება, preview ჩანს | ⬜ |
| 3 | Column auto-detection | სვეტები სწორად ამოიცნობა | ⬜ |
| 4 | Manual column mapping | შესაძლებელია სვეტების შეცვლა | ⬜ |
| 5 | Import 100 rows | წარმატებით იმპორტდება | ⬜ |
| 6 | Import 1000 rows | Progress bar მუშაობს სწორად | ⬜ |
| 7 | Import 28,000 rows (YELL_GE.xlsx) | 2-3 წუთში დასრულდება | ⬜ |
| 8 | Duplicate handling | მეორედ იმპორტი - duplicates skipped | ⬜ |
| 9 | Invalid email handling | არასწორი email-ები გამოტოვებულია | ⬜ |
| 10 | Cancel import | შეჩერება მუშაობს | ⬜ |
| 11 | Browser memory (70K rows) | ბრაუზერი არ იყინება | ⬜ |
| 12 | Error reporting | შეცდომები ლოგში ჩანს | ⬜ |

### API ტესტები

```bash
# ტესტი: Batch import endpoint
curl -X POST http://localhost:3000/api/clients/import \
  -H "Content-Type: application/json" \
  -d '[{"company_name":"Test","email":"test@test.com","city":"Tbilisi"}]'

# მოსალოდნელი პასუხი:
# {"imported":1,"skipped":0,"errors":[]}

# ტესტი: Duplicate handling
curl -X POST http://localhost:3000/api/clients/import \
  -H "Content-Type: application/json" \
  -d '[{"company_name":"Test","email":"test@test.com","city":"Tbilisi"}]'

# მოსალოდნელი პასუხი:
# {"imported":0,"skipped":1,"errors":[]}
```

### Database ტესტები

```sql
-- ტესტი: რამდენი კლიენტი დაემატა?
SELECT COUNT(*) FROM clients;

-- ტესტი: email-ით რამდენია?
SELECT COUNT(*) FROM clients WHERE email IS NOT NULL;

-- ტესტი: კატეგორიების განაწილება
SELECT category, COUNT(*) FROM clients 
GROUP BY category ORDER BY COUNT(*) DESC LIMIT 20;

-- ტესტი: ქალაქების განაწილება
SELECT city, COUNT(*) FROM clients 
WHERE city IS NOT NULL
GROUP BY city ORDER BY COUNT(*) DESC;
```

---

# 🟡 ფაზა 3: Clients Management & CRM

## 3.1 რას ვაკეთებთ ამ ფაზაში

ამ ფაზაში ვქმნით კლიენტების მართვის სისტემას:
- კლიენტების სია (pagination, search, filter)
- კლიენტის დეტალური გვერდი
- CRM ისტორია - ყველა ინტერაქცია
- შენიშვნების დამატება
- კლიენტის რედაქტირება
- Tags და სეგმენტაცია

## 3.2 UI Components Structure

```
src/
├── app/(dashboard)/
│   ├── clients/
│   │   ├── page.tsx              # კლიენტების სია
│   │   ├── [id]/
│   │   │   └── page.tsx          # კლიენტის დეტალები + CRM
│   │   └── import/
│   │       └── page.tsx          # იმპორტი (Phase 2)
│   └── layout.tsx                # Dashboard layout
├── components/
│   ├── clients/
│   │   ├── ClientsTable.tsx      # მთავარი ცხრილი
│   │   ├── ClientsFilters.tsx    # ფილტრები
│   │   ├── ClientCard.tsx        # კლიენტის ბარათი
│   │   ├── ClientDetails.tsx     # დეტალები
│   │   ├── ClientHistory.tsx     # CRM ისტორია
│   │   ├── ClientNotes.tsx       # შენიშვნები
│   │   └── ClientEditForm.tsx    # რედაქტირება
│   └── ui/
│       ├── DataTable.tsx         # Reusable table
│       ├── Pagination.tsx
│       ├── SearchInput.tsx
│       └── Badge.tsx
```

## 3.3 კლიენტების სია - Features

```
┌─────────────────────────────────────────────────────────────────────┐
│  Clients                                           [+ Import] [+ Add]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  🔍 [Search by name, email, company...            ]                 │
│                                                                      │
│  Filters: [All Cities ▼] [All Categories ▼] [Status ▼] [Has Email ▼]│
│                                                                      │
│  Showing 1-50 of 28,010 clients                    [< 1 2 3 ... 561 >]│
├─────────────────────────────────────────────────────────────────────┤
│ ☐ │ Company           │ Email              │ City    │ Category     │
├───┼───────────────────┼────────────────────┼─────────┼──────────────┤
│ ☐ │ შპს აუდიტ + 2010  │ audit@ymail.com    │ თბილისი │ აუდიტი       │
│ ☐ │ შპს კრისტალი      │ crystal@mail.ru    │ თბილისი │ სილამაზე     │
│ ☐ │ ფინანსური ჯგუფი   │ info@fmg.ge        │ თბილისი │ ფინანსები    │
│ ...                                                                  │
├─────────────────────────────────────────────────────────────────────┤
│  Selected: 3    [Add to Campaign] [Add Tag] [Export]                │
└─────────────────────────────────────────────────────────────────────┘
```

## 3.4 კლიენტის CRM გვერდი

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Back to Clients                                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  🏢 შპს აუდიტ + 2010                                    [Edit]      │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Email: auditaudit@ymail.com          Phone: 577503443       │   │
│  │ City: თბილისი                        Category: აუდიტი       │   │
│  │ Website: www.audit2010.ge            ID: 406024760          │   │
│  │ Status: ● Active                     Tags: [B2B] [Finance]  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 📧 EMAIL HISTORY                                             │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │ Dec 20, 2024 - "პარტნიორობის შეთავაზება"                    │   │
│  │   Campaign: Q4 Outreach | Status: ✅ Delivered               │   │
│  │                                                               │   │
│  │ Dec 15, 2024 - "სერვისების პრეზენტაცია"                     │   │
│  │   Campaign: Services Launch | Status: 👁️ Opened              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 📝 NOTES                                        [+ Add Note] │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │ Dec 18 - დაინტერესდნენ სერვისით, დავრეკოთ იანვარში         │   │
│  │ Dec 10 - პირველი კონტაქტი, გაეგზავნა ინფო                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## 3.5 Claude Code Prompt (Phase 3)

```
I need you to build the client management system with CRM functionality.

## Requirements

### 1. Clients List Page (`src/app/(dashboard)/clients/page.tsx`)

Features:
- Server-side pagination (50 per page)
- Search across: company_name, email, city, category
- Filters:
  - City (dropdown with all unique cities)
  - Category (dropdown with top 50 categories)
  - Status (active, inactive, bounced)
  - Has Email (yes/no/all)
- Sortable columns: company_name, city, created_at
- Bulk selection with checkboxes
- Bulk actions: Add to Campaign, Add Tag, Export CSV
- URL-based state (searchParams for filters)

### 2. Data Table Component (`src/components/ui/DataTable.tsx`)
- Generic table with TanStack Table
- Column visibility toggle
- Resizable columns
- Row selection
- Loading state with skeletons
- Empty state

### 3. Client Details Page (`src/app/(dashboard)/clients/[id]/page.tsx`)

Sections:
- Header: company name, quick actions
- Info Card: all client fields, editable
- Email History: list of all emails sent to this client
- Notes: add/view notes with timestamps
- Activity Timeline: combined history

### 4. Client History Component (`src/components/clients/ClientHistory.tsx`)
- Fetch from email_history table
- Show: date, subject, campaign name, status (sent/delivered/opened/clicked/bounced)
- Click to expand: see email preview

### 5. Client Notes Component (`src/components/clients/ClientNotes.tsx`)
- List existing notes (newest first)
- Add new note form (textarea + submit)
- Delete note (with confirmation)

### 6. API Routes

```typescript
// GET /api/clients - List with filters
// Query params: page, limit, search, city, category, status, hasEmail, sortBy, sortOrder

// GET /api/clients/[id] - Single client with history

// PATCH /api/clients/[id] - Update client

// GET /api/clients/[id]/history - Email history for client

// GET /api/clients/[id]/notes - Notes for client
// POST /api/clients/[id]/notes - Add note
// DELETE /api/clients/[id]/notes/[noteId] - Delete note

// GET /api/clients/filters - Get unique cities and categories for dropdowns
```

### 7. Performance Requirements
- Use React Query / SWR for client-side caching
- Debounce search input (300ms)
- Virtual scrolling for very long lists (optional)
- Prefetch next page on hover

### 8. UI Library
- Use shadcn/ui components
- Install: Button, Input, Select, Table, Card, Badge, Dialog, Textarea, Skeleton

### 9. Tags System
- Tags stored as TEXT[] in clients table
- Add/remove tags via UI
- Filter by tag
- Predefined tags + custom tags
```

## 3.6 ტესტირების ჩეკლისტი (Phase 3)

| # | ტესტი | მოსალოდნელი შედეგი | სტატუსი |
|---|-------|-------------------|---------|
| 1 | Load clients list | 50 კლიენტი ჩანს, pagination მუშაობს | ⬜ |
| 2 | Search "აუდიტი" | ფილტრავს სწორად | ⬜ |
| 3 | Filter by city "თბილისი" | მხოლოდ თბილისი ჩანს | ⬜ |
| 4 | Filter by "Has Email: Yes" | მხოლოდ email-იანები | ⬜ |
| 5 | Combined filters | ყველა ფილტრი ერთად მუშაობს | ⬜ |
| 6 | Pagination | გვერდებზე გადასვლა მუშაობს | ⬜ |
| 7 | Sort by company name | A-Z და Z-A სორტირება | ⬜ |
| 8 | Click client row | დეტალების გვერდი იხსნება | ⬜ |
| 9 | View email history | ისტორია ჩანს | ⬜ |
| 10 | Add note | შენიშვნა ემატება | ⬜ |
| 11 | Edit client | ცვლილებები ინახება | ⬜ |
| 12 | Bulk select | რამდენიმე კლიენტის მონიშვნა | ⬜ |
| 13 | URL state | refresh-ზე ფილტრები რჩება | ⬜ |
| 14 | Search performance | 28K-ში ძებნა < 100ms | ⬜ |

---

# 🟠 ფაზა 4: Email Templates & Campaign Builder

## 4.1 რას ვაკეთებთ ამ ფაზაში

ამ ფაზაში ვქმნით:
- Email template editor (HTML + preview)
- Template variables (personalization)
- Campaign creation wizard
- Client selection for campaigns
- Campaign scheduling settings
- Smart sending configuration

## 4.2 Template Editor Features

```
┌─────────────────────────────────────────────────────────────────────┐
│  Template: პარტნიორობის შეთავაზება                    [Save] [Test] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Subject: გამარჯობა {{company_name}}, გვინდა შემოგთავაზოთ...       │
│                                                                      │
│  ┌────────────────────────┐  ┌────────────────────────┐            │
│  │      EDITOR            │  │      PREVIEW           │            │
│  ├────────────────────────┤  ├────────────────────────┤            │
│  │ [B] [I] [U] [Link] [Img]│ │                        │            │
│  │                        │  │  გამარჯობა შპს აუდიტი, │            │
│  │ გამარჯობა              │  │                        │            │
│  │ {{company_name}},      │  │  გვინდა შემოგთავაზოთ   │            │
│  │                        │  │  ჩვენი სერვისები...    │            │
│  │ გვინდა შემოგთავაზოთ    │  │                        │            │
│  │ ჩვენი სერვისები...     │  │  საუკეთესო სურვილებით, │            │
│  │                        │  │  თქვენი გუნდი          │            │
│  │ საუკეთესო სურვილებით, │  │                        │            │
│  │ თქვენი გუნდი           │  │                        │            │
│  └────────────────────────┘  └────────────────────────┘            │
│                                                                      │
│  Available Variables: {{company_name}} {{email}} {{city}}           │
│                       {{category}} {{website}}                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## 4.3 Campaign Builder Wizard

```
Step 1: Basic Info
┌─────────────────────────────────────────┐
│ Campaign Name: [Q4 Partner Outreach    ]│
│ Template: [პარტნიორობის შეთავაზება  ▼] │
└─────────────────────────────────────────┘

Step 2: Select Recipients
┌─────────────────────────────────────────┐
│ Filter clients:                         │
│ City: [თბილისი ▼]                       │
│ Category: [ფინანსები ▼]                 │
│ Has Email: [Yes ▼]                      │
│                                         │
│ Matching: 1,234 clients                 │
│ [Select All] [Select First 100]         │
└─────────────────────────────────────────┘

Step 3: Sending Settings
┌─────────────────────────────────────────┐
│ Daily Limit: [10    ] emails/day        │
│ Send Hours: [9:00] to [18:00]           │
│ Start Date: [Dec 26, 2024]              │
│                                         │
│ 📊 Estimated completion:                │
│    1,234 recipients ÷ 10/day = 124 days │
│    Finish: ~April 29, 2025              │
└─────────────────────────────────────────┘

Step 4: Review & Launch
┌─────────────────────────────────────────┐
│ Campaign: Q4 Partner Outreach           │
│ Template: პარტნიორობის შეთავაზება       │
│ Recipients: 1,234                       │
│ Daily Limit: 10                         │
│ Duration: ~124 days                     │
│                                         │
│      [Save as Draft]  [Launch Campaign] │
└─────────────────────────────────────────┘
```

## 4.4 Claude Code Prompt (Phase 4)

```
I need you to build the email template system and campaign builder.

## Requirements

### 1. Templates List Page (`src/app/(dashboard)/templates/page.tsx`)
- Grid view of all templates
- Template card: name, subject preview, last edited, status
- Create new template button
- Duplicate template
- Delete template (with confirmation)

### 2. Template Editor Page (`src/app/(dashboard)/templates/[id]/page.tsx`)

Components:
- Template name input
- Subject line input (with variable support)
- Split view: HTML editor | Live preview
- Variable insertion buttons
- Save / Save as Draft / Test Email buttons

Editor features:
- Rich text editor (use react-quill or tiptap)
- HTML mode toggle
- Variable highlighting
- Responsive preview (desktop/mobile toggle)

### 3. Template Variables System
Available variables (from client data):
- {{company_name}}
- {{email}}
- {{city}}
- {{category}}
- {{website}}
- {{phone}}

Personalization function:
```typescript
function personalizeContent(content: string, client: Client): string {
  return content
    .replace(/\{\{company_name\}\}/g, client.company_name || 'there')
    .replace(/\{\{email\}\}/g, client.email || '')
    .replace(/\{\{city\}\}/g, client.city || '')
    .replace(/\{\{category\}\}/g, client.category || '')
    .replace(/\{\{website\}\}/g, client.website || '')
    .replace(/\{\{phone\}\}/g, client.phone_primary || '');
}
```

### 4. Campaign Builder Page (`src/app/(dashboard)/campaigns/new/page.tsx`)

Multi-step wizard:
- Step 1: Name + Select Template
- Step 2: Select Recipients (with filters)
- Step 3: Sending Settings (daily limit, hours, start date)
- Step 4: Review + Launch

### 5. Recipient Selection Component (`src/components/campaigns/RecipientSelector.tsx`)
- Reuse filters from clients list
- Show count of matching clients
- "Select All Matching" button
- Manual selection with checkboxes
- Show selected count

### 6. Campaign Settings Component (`src/components/campaigns/CampaignSettings.tsx`)
- Daily limit slider (1-100, default 10)
- Send hours (start/end time pickers)
- Start date picker
- Calculate and show estimated completion date

### 7. API Routes

```typescript
// Templates
GET    /api/templates           - List all templates
POST   /api/templates           - Create template
GET    /api/templates/[id]      - Get template
PATCH  /api/templates/[id]      - Update template
DELETE /api/templates/[id]      - Delete template
POST   /api/templates/[id]/test - Send test email

// Campaigns
GET    /api/campaigns           - List campaigns
POST   /api/campaigns           - Create campaign
GET    /api/campaigns/[id]      - Get campaign details
PATCH  /api/campaigns/[id]      - Update campaign
POST   /api/campaigns/[id]/launch  - Start campaign
POST   /api/campaigns/[id]/pause   - Pause campaign
POST   /api/campaigns/[id]/resume  - Resume campaign
```

### 8. Campaign Creation Flow

When creating campaign:
1. Save campaign to campaigns table
2. For each selected client:
   - Insert row to campaign_recipients with status='pending'
3. Update campaign.total_recipients count
4. Set campaign.status = 'draft' or 'scheduled'

### 9. Dependencies
- react-quill or @tiptap/react (rich text editor)
- date-fns (date calculations)
- react-datepicker or shadcn Calendar

### 10. UI Components (shadcn)
- Tabs (for wizard steps)
- Progress (step indicator)
- Calendar
- Slider
- Popover
```

## 4.5 ტესტირების ჩეკლისტი (Phase 4)

| # | ტესტი | მოსალოდნელი შედეგი | სტატუსი |
|---|-------|-------------------|---------|
| 1 | Create new template | ტემპლეიტი იქმნება | ⬜ |
| 2 | Edit template content | ცვლილებები ინახება | ⬜ |
| 3 | Insert variable | {{company_name}} ჩაისმება | ⬜ |
| 4 | Live preview | preview განახლდება | ⬜ |
| 5 | Send test email | ტესტ მეილი მოდის | ⬜ |
| 6 | Start campaign wizard | Step 1 იხსნება | ⬜ |
| 7 | Select template | ტემპლეიტი ირჩევა | ⬜ |
| 8 | Filter recipients | ფილტრები მუშაობს | ⬜ |
| 9 | Select all matching | ყველა მონიშნულია | ⬜ |
| 10 | Set daily limit | ლიმიტი ინახება | ⬜ |
| 11 | Calculate completion | თარიღი სწორია | ⬜ |
| 12 | Save as draft | კამპანია draft-ში | ⬜ |
| 13 | Launch campaign | კამპანია იწყება | ⬜ |
| 14 | Recipients inserted | campaign_recipients-ში ჩანს | ⬜ |

---

# 🔴 ფაზა 5: Email Sending Engine & Queue

## 5.1 რას ვაკეთებთ ამ ფაზაში

ამ ფაზაში ვქმნით:
- Resend API integration
- Smart email queue processor
- Cron job for scheduled sending
- Rate limiting და throttling
- Delivery tracking
- Campaign dashboard

## 5.2 Queue Processing Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    EMAIL QUEUE PROCESSOR                             │
└─────────────────────────────────────────────────────────────────────┘

                     Cron Job (every 5 minutes)
                              │
                              ▼
              ┌───────────────────────────────┐
              │  Check: Is it sending hours?  │
              │  (9:00 - 18:00)               │
              └───────────────────────────────┘
                              │
                    Yes ──────┴────── No → Exit
                              │
                              ▼
              ┌───────────────────────────────┐
              │  Get active campaigns         │
              │  WHERE status = 'running'     │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  For each campaign:           │
              │  - Check daily limit          │
              │  - Get pending recipients     │
              │  - Send emails (with delay)   │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  Send 1 email                 │
              │       │                       │
              │       ▼                       │
              │  Wait 5-15 min (random)       │
              │       │                       │
              │       ▼                       │
              │  Send next email              │
              │       │                       │
              │      ...                      │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  Update statuses:             │
              │  - campaign_recipients.status │
              │  - email_history              │
              │  - campaign.sent_count        │
              └───────────────────────────────┘
```

## 5.3 Resend Integration

```typescript
// src/lib/resend.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<SendResult> {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Your Name <noreply@yourdomain.com>',
      to,
      subject,
      html,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
```

## 5.4 Smart Queue Processor

```typescript
// src/lib/queue.ts
export async function processEmailQueue() {
  const now = new Date();
  const currentHour = now.getHours();
  
  // Check sending hours
  if (currentHour < 9 || currentHour >= 18) {
    return { processed: 0, reason: 'Outside sending hours' };
  }
  
  // Get active campaigns
  const campaigns = await db.query.campaigns.findMany({
    where: eq(campaigns.status, 'running'),
    with: { template: true }
  });
  
  let totalProcessed = 0;
  
  for (const campaign of campaigns) {
    // Check daily limit
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const sentToday = await db
      .select({ count: count() })
      .from(campaignRecipients)
      .where(and(
        eq(campaignRecipients.campaignId, campaign.id),
        eq(campaignRecipients.status, 'sent'),
        gte(campaignRecipients.sentAt, todayStart)
      ));
    
    const remaining = campaign.dailyLimit - sentToday[0].count;
    if (remaining <= 0) continue;
    
    // Get pending recipients (max 3 per run)
    const recipients = await db.query.campaignRecipients.findMany({
      where: and(
        eq(campaignRecipients.campaignId, campaign.id),
        eq(campaignRecipients.status, 'pending')
      ),
      limit: Math.min(remaining, 3),
      with: { client: true }
    });
    
    for (const recipient of recipients) {
      // Personalize and send
      const subject = personalize(campaign.template.subject, recipient.client);
      const html = personalize(campaign.template.htmlContent, recipient.client);
      
      const result = await sendEmail(recipient.client.email!, subject, html);
      
      // Update recipient status
      await db.update(campaignRecipients)
        .set({
          status: result.success ? 'sent' : 'failed',
          sentAt: new Date(),
          errorMessage: result.error
        })
        .where(eq(campaignRecipients.id, recipient.id));
      
      // Add to email history
      if (result.success) {
        await db.insert(emailHistory).values({
          clientId: recipient.client.id,
          campaignId: campaign.id,
          templateId: campaign.templateId,
          subject,
          contentPreview: html.substring(0, 200),
          resendMessageId: result.messageId,
          status: 'sent'
        });
        
        totalProcessed++;
      }
      
      // Random delay 5-15 minutes
      await delay(randomBetween(5, 15) * 60 * 1000);
    }
    
    // Update campaign stats
    await updateCampaignStats(campaign.id);
    
    // Check if campaign is complete
    const pending = await db
      .select({ count: count() })
      .from(campaignRecipients)
      .where(and(
        eq(campaignRecipients.campaignId, campaign.id),
        eq(campaignRecipients.status, 'pending')
      ));
    
    if (pending[0].count === 0) {
      await db.update(campaigns)
        .set({ 
          status: 'completed',
          completedAt: new Date()
        })
        .where(eq(campaigns.id, campaign.id));
    }
  }
  
  return { processed: totalProcessed };
}
```

## 5.5 Campaign Dashboard

```
┌─────────────────────────────────────────────────────────────────────┐
│  Campaign: Q4 Partner Outreach                       [Pause] [Stop] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Status: ● Running                Started: Dec 20, 2024             │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  PROGRESS                                                    │   │
│  │                                                               │   │
│  │  ████████████░░░░░░░░░░░░░░░░░░░░  156 / 1,234 (12.6%)       │   │
│  │                                                               │   │
│  │  📤 Sent: 156    ⏳ Pending: 1,078    ❌ Failed: 0            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  TODAY'S PROGRESS                                            │   │
│  │                                                               │   │
│  │  ████████░░  8 / 10 (daily limit)                            │   │
│  │                                                               │   │
│  │  Next send in: ~12 minutes                                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  RECENT ACTIVITY                                             │   │
│  │                                                               │   │
│  │  14:32 - Sent to info@company1.ge ✅                         │   │
│  │  14:18 - Sent to contact@company2.ge ✅                      │   │
│  │  14:05 - Sent to hello@company3.ge ✅                        │   │
│  │  ...                                                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## 5.6 Claude Code Prompt (Phase 5)

```
I need you to build the email sending engine with Resend API integration.

## Requirements

### 1. Resend Setup (`src/lib/resend.ts`)
- Initialize Resend client with API key
- sendEmail function with error handling
- Support for HTML and plain text
- Return messageId on success

### 2. Queue Processor (`src/lib/queue.ts`)

Main function: processEmailQueue()
- Check if within sending hours (configurable)
- Get all campaigns with status='running'
- For each campaign:
  - Check daily limit not exceeded
  - Get pending recipients (max 3 per cron run)
  - Send emails with personalization
  - Update recipient status
  - Add to email_history
  - Random delay between emails (5-15 min)
- Check if campaign complete, update status

Helper functions:
- getDailySentCount(campaignId)
- updateCampaignStats(campaignId)
- personalize(content, client)
- randomDelay(min, max)

### 3. Cron API Route (`src/app/api/cron/process-queue/route.ts`)

```typescript
// This will be called by Railway Cron
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const result = await processEmailQueue();
  return Response.json(result);
}
```

### 4. Railway Cron Configuration

Add to railway.json:
```json
{
  "build": { "builder": "nixpacks" },
  "deploy": {
    "cronSchedule": "*/5 9-17 * * 1-5"
  }
}
```

Cron: Every 5 minutes, 9AM-5PM, Monday-Friday

### 5. Campaign Control API Routes

```typescript
POST /api/campaigns/[id]/launch  - Set status='running', started_at=now
POST /api/campaigns/[id]/pause   - Set status='paused'
POST /api/campaigns/[id]/resume  - Set status='running'
POST /api/campaigns/[id]/stop    - Set status='stopped'
```

### 6. Campaign Dashboard Page (`src/app/(dashboard)/campaigns/[id]/page.tsx`)

Display:
- Campaign info (name, template, dates)
- Progress bar with stats
- Today's progress vs daily limit
- Next send estimate
- Recent activity log (last 20 sends)
- Control buttons (Pause/Resume/Stop)

Real-time updates:
- Use polling every 30 seconds
- Or implement with Server-Sent Events

### 7. Email History Tracking

After sending, create email_history record:
```typescript
{
  clientId: recipient.clientId,
  campaignId: campaign.id,
  templateId: campaign.templateId,
  subject: personalizedSubject,
  contentPreview: htmlContent.substring(0, 200),
  resendMessageId: result.messageId,
  status: 'sent',
  sentAt: new Date()
}
```

### 8. Webhook for Delivery Status (Optional)
```typescript
// POST /api/webhooks/resend
// Handle: delivered, opened, clicked, bounced events
// Update email_history status accordingly
```

### 9. Environment Variables
```
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=Your Company
CRON_SECRET=random-secret-for-cron
```

### 10. Error Handling & Retry Logic
- On send failure: mark recipient as 'failed'
- Store error message
- Don't retry automatically (to avoid spam flags)
- Allow manual retry from dashboard
```

## 5.7 ტესტირების ჩეკლისტი (Phase 5)

| # | ტესტი | მოსალოდნელი შედეგი | სტატუსი |
|---|-------|-------------------|---------|
| 1 | Resend API connection | API key ვალიდურია | ⬜ |
| 2 | Send single test email | მეილი მიდის | ⬜ |
| 3 | Personalization works | {{company_name}} იცვლება | ⬜ |
| 4 | Launch campaign | status='running' | ⬜ |
| 5 | Cron triggers | /api/cron endpoint works | ⬜ |
| 6 | Daily limit respected | 10-ზე მეტი არ იგზავნება | ⬜ |
| 7 | Sending hours check | 9-18 საათებში მუშაობს | ⬜ |
| 8 | Random delay | 5-15 წუთი დაყოვნება | ⬜ |
| 9 | Recipient status update | 'sent' ან 'failed' | ⬜ |
| 10 | Email history created | ისტორიაში ჩანს | ⬜ |
| 11 | Campaign progress updates | sent_count იზრდება | ⬜ |
| 12 | Campaign completion | status='completed' ბოლოში | ⬜ |
| 13 | Pause campaign | გაგზავნა ჩერდება | ⬜ |
| 14 | Resume campaign | გაგზავნა გრძელდება | ⬜ |
| 15 | Dashboard real-time | სტატისტიკა განახლდება | ⬜ |

### Manual Testing Steps

```bash
# 1. Test Resend API directly
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer re_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{"from":"test@yourdomain.com","to":"your@email.com","subject":"Test","html":"<p>Hello</p>"}'

# 2. Test cron endpoint
curl -X GET https://your-app.railway.app/api/cron/process-queue \
  -H "Authorization: Bearer your-cron-secret"

# 3. Check database after cron run
SELECT * FROM campaign_recipients WHERE status = 'sent' ORDER BY sent_at DESC LIMIT 10;
SELECT * FROM email_history ORDER BY sent_at DESC LIMIT 10;
```

---

# 📋 სრული პროექტის სტრუქტურა

```
email-campaign-platform/
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                    # Dashboard home
│   │   │   ├── clients/
│   │   │   │   ├── page.tsx                # Clients list
│   │   │   │   ├── [id]/page.tsx           # Client details
│   │   │   │   └── import/page.tsx         # Import wizard
│   │   │   ├── templates/
│   │   │   │   ├── page.tsx                # Templates list
│   │   │   │   └── [id]/page.tsx           # Template editor
│   │   │   └── campaigns/
│   │   │       ├── page.tsx                # Campaigns list
│   │   │       ├── new/page.tsx            # Campaign wizard
│   │   │       └── [id]/page.tsx           # Campaign dashboard
│   │   ├── api/
│   │   │   ├── clients/
│   │   │   │   ├── route.ts                # List, create
│   │   │   │   ├── [id]/route.ts           # Get, update, delete
│   │   │   │   ├── [id]/history/route.ts
│   │   │   │   ├── [id]/notes/route.ts
│   │   │   │   ├── import/route.ts         # Batch import
│   │   │   │   └── filters/route.ts        # Get filter options
│   │   │   ├── templates/
│   │   │   │   ├── route.ts
│   │   │   │   ├── [id]/route.ts
│   │   │   │   └── [id]/test/route.ts
│   │   │   ├── campaigns/
│   │   │   │   ├── route.ts
│   │   │   │   ├── [id]/route.ts
│   │   │   │   ├── [id]/launch/route.ts
│   │   │   │   ├── [id]/pause/route.ts
│   │   │   │   └── [id]/resume/route.ts
│   │   │   ├── cron/
│   │   │   │   └── process-queue/route.ts
│   │   │   └── webhooks/
│   │   │       └── resend/route.ts
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                             # shadcn components
│   │   ├── clients/
│   │   ├── templates/
│   │   ├── campaigns/
│   │   └── import/
│   ├── db/
│   │   ├── index.ts                        # DB connection
│   │   └── schema.ts                       # Drizzle schema
│   ├── lib/
│   │   ├── resend.ts                       # Email client
│   │   ├── queue.ts                        # Queue processor
│   │   └── utils.ts                        # Helpers
│   └── types/
│       └── index.ts                        # TypeScript types
├── drizzle.config.ts
├── railway.json
├── package.json
├── .env.example
└── README.md
```

---

# ⏱️ სავარაუდო Timeline

| ფაზა | ხანგრძლივობა | კუმულაციური |
|------|-------------|-------------|
| Phase 1: Infrastructure | 1-2 დღე | 1-2 დღე |
| Phase 2: Import System | 2-3 დღე | 3-5 დღე |
| Phase 3: Clients & CRM | 2-3 დღე | 5-8 დღე |
| Phase 4: Templates & Campaigns | 2-3 დღე | 7-11 დღე |
| Phase 5: Sending Engine | 2-3 დღე | 9-14 დღე |
| Testing & Polish | 2-3 დღე | 11-17 დღე |

**სულ: დაახლოებით 2-3 კვირა**

---

# 🔗 გარე რესურსები

- [Railway Documentation](https://docs.railway.app/)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Resend API Docs](https://resend.com/docs)
- [Next.js 14 App Router](https://nextjs.org/docs/app)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [TanStack Table](https://tanstack.com/table)
