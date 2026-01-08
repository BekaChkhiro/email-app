"use client";

import { useState, useEffect } from "react";

// Database fields available for mapping (ordered to match 08.ge CSV structure)
export const DB_FIELDS = [
  { key: "_skip", label: "-- გამოტოვება --", required: false },
  { key: "company_name", label: "კომპანიის სახელი", required: false },
  { key: "address", label: "მისამართი", required: false },
  { key: "identification_code", label: "საიდენტიფიკაციო კოდი", required: false },
  { key: "phone_primary", label: "ტელეფონი (ძირითადი)", required: false },
  { key: "email", label: "Email", required: true },
  { key: "website", label: "ვებსაიტი", required: false },
  { key: "facebook", label: "Facebook", required: false },
  { key: "category", label: "კატეგორია", required: false },
  { key: "director_name", label: "საკონტაქტო პირი", required: false },
  { key: "legal_form", label: "სამართლებრივი ფორმა", required: false },
  { key: "company_name_alt", label: "სრული სახელი", required: false },
  { key: "phone_secondary", label: "ტელეფონი (დამატებითი)", required: false },
  { key: "link_08", label: "08.ge ლინკი", required: false },
  { key: "city", label: "ქალაქი", required: false },
  { key: "phone_tertiary", label: "ტელეფონი (მესამე)", required: false },
  { key: "email_secondary", label: "Email (დამატებითი)", required: false },
] as const;

export type DBFieldKey = (typeof DB_FIELDS)[number]["key"];

export interface ColumnMapping {
  [excelColumn: string]: DBFieldKey;
}

interface ColumnMapperProps {
  columns: string[];
  previewData: Record<string, string>[];
  onMappingChange: (mapping: ColumnMapping) => void;
  initialMapping?: ColumnMapping;
}

// Detect if columns are from 08.ge format (numbered columns like "1", "2", "3"...)
function is08geFormat(columns: string[]): boolean {
  // Check if all columns are numbers or mostly numbers
  const numericColumns = columns.filter((col) => /^\d+$/.test(col.trim()));
  return numericColumns.length >= columns.length * 0.8; // 80% threshold
}

// 08.ge CSV column descriptions for display
const COLUMN_08GE_LABELS: Record<string, string> = {
  "1": "ID - რიგითი ნომერი",
  "2": "კომპანიის სახელი",
  "3": "მისამართი",
  "4": "საიდენტიფიკაციო კოდი",
  "5": "ტელეფონი (ძირითადი)",
  "6": "Email",
  "7": "ვებსაიტი",
  "8": "Facebook",
  "9": "კატეგორია",
  "10": "საკონტაქტო პირი",
  "11": "სამართლებრივი ფორმა",
  "12": "სრული სახელი",
  "13": "ტელეფონი (დამატებითი)",
  "14": "08.ge ლინკი",
};

// Get predefined mapping for 08.ge CSV format
function get08geMapping(columns: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};

  // 08.ge CSV column positions (0-indexed internally, but columns are "1", "2", etc.)
  const positionMap: Record<string, DBFieldKey> = {
    "1": "_skip", // ID - row number
    "2": "company_name", // Company name | 08.GE
    "3": "address", // Address (includes city)
    "4": "identification_code", // Identification code
    "5": "phone_primary", // Phone 1
    "6": "email", // Email
    "7": "website", // Website
    "8": "facebook", // Facebook
    "9": "category", // Category
    "10": "director_name", // Director/Contact name
    "11": "legal_form", // Legal form (შ.პ.ს, ი.მ, etc.)
    "12": "company_name_alt", // Full company name
    "13": "phone_secondary", // Phone 2
    "14": "link_08", // 08.ge link
  };

  columns.forEach((col) => {
    const trimmed = col.trim();
    if (positionMap[trimmed]) {
      mapping[col] = positionMap[trimmed];
    } else {
      mapping[col] = "_skip";
    }
  });

  return mapping;
}

// Sort columns numerically if they are all numbers
function sortColumnsNumerically(columns: string[]): string[] {
  const allNumeric = columns.every((col) => /^\d+$/.test(col.trim()));
  if (allNumeric) {
    return [...columns].sort((a, b) => parseInt(a) - parseInt(b));
  }
  return columns;
}

// Get display label for column (with 08.ge description if applicable)
function getColumnDisplayLabel(column: string, is08ge: boolean): string {
  if (is08ge && COLUMN_08GE_LABELS[column.trim()]) {
    return `${column} - ${COLUMN_08GE_LABELS[column.trim()]}`;
  }
  return column;
}

// Auto-detect mapping based on column names
function autoDetectMapping(columns: string[]): ColumnMapping {
  // First check if this is 08.ge format (numbered columns)
  if (is08geFormat(columns)) {
    return get08geMapping(columns);
  }

  const mapping: ColumnMapping = {};

  const patterns: { pattern: RegExp; field: DBFieldKey }[] = [
    { pattern: /კომპანი|company|სახელი|name/i, field: "company_name" },
    { pattern: /კატეგორი|category/i, field: "category" },
    { pattern: /ქალაქ|city/i, field: "city" },
    { pattern: /მისამართ|address/i, field: "address" },
    { pattern: /საიდენტიფიკაციო|identification|id.*code/i, field: "identification_code" },
    { pattern: /ნომერ|phone|ტელ/i, field: "phone_primary" },
    { pattern: /email|ელ.*ფოსტა|მეილ/i, field: "email" },
    { pattern: /website|საიტ|ვებ/i, field: "website" },
    { pattern: /facebook|fb|ფეისბუკ/i, field: "facebook" },
    { pattern: /დირექტორ|director/i, field: "director_name" },
    { pattern: /იურიდიული|legal.*form|სტილი/i, field: "legal_form" },
    { pattern: /კომპანიის სახელი.*2|company.*alt|alt.*name/i, field: "company_name_alt" },
    { pattern: /08.*ლინკ|08.*link|link.*08/i, field: "link_08" },
  ];

  // Track used fields to avoid duplicates
  const usedFields = new Set<DBFieldKey>();
  let phoneCount = 0;
  let emailCount = 0;

  columns.forEach((col) => {
    // Check for phone fields (can have multiple)
    if (/ნომერ|phone|ტელ/i.test(col)) {
      if (phoneCount === 0) {
        mapping[col] = "phone_primary";
        phoneCount++;
      } else if (phoneCount === 1) {
        mapping[col] = "phone_secondary";
        phoneCount++;
      } else if (phoneCount === 2) {
        mapping[col] = "phone_tertiary";
        phoneCount++;
      } else {
        mapping[col] = "_skip";
      }
      return;
    }

    // Check for email fields (can have multiple)
    if (/email|ელ.*ფოსტა|მეილ/i.test(col)) {
      if (emailCount === 0) {
        mapping[col] = "email";
        emailCount++;
      } else if (emailCount === 1) {
        mapping[col] = "email_secondary";
        emailCount++;
      } else {
        mapping[col] = "_skip";
      }
      return;
    }

    // Check other patterns
    for (const { pattern, field } of patterns) {
      if (pattern.test(col) && !usedFields.has(field)) {
        mapping[col] = field;
        usedFields.add(field);
        return;
      }
    }

    // Default: skip unknown columns
    mapping[col] = "_skip";
  });

  return mapping;
}

const STORAGE_KEY = "import_column_mapping";

export function ColumnMapper({
  columns,
  previewData,
  onMappingChange,
  initialMapping,
}: ColumnMapperProps) {
  // Check if this is 08.ge format and sort columns accordingly
  const is08ge = is08geFormat(columns);
  const sortedColumns = sortColumnsNumerically(columns);

  const [mapping, setMapping] = useState<ColumnMapping>(() => {
    // Try to load from localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Check if saved mapping has all current columns
          const hasAllColumns = columns.every((col) => col in parsed);
          if (hasAllColumns) {
            return parsed;
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
    return initialMapping || autoDetectMapping(columns);
  });

  useEffect(() => {
    onMappingChange(mapping);
    // Save to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mapping));
    }
  }, [mapping, onMappingChange]);

  const handleMappingChange = (column: string, field: DBFieldKey) => {
    setMapping((prev) => ({
      ...prev,
      [column]: field,
    }));
  };

  const handleAutoDetect = () => {
    const detected = autoDetectMapping(columns);
    setMapping(detected);
  };

  const handleClearMapping = () => {
    const cleared: ColumnMapping = {};
    columns.forEach((col) => {
      cleared[col] = "_skip";
    });
    setMapping(cleared);
  };

  // Check if email is mapped
  const hasEmailMapping = Object.values(mapping).includes("email");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Column Mapping</h3>
        <div className="flex gap-2">
          <button
            onClick={handleAutoDetect}
            className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            Auto-detect
          </button>
          <button
            onClick={handleClearMapping}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      {!hasEmailMapping && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700">
            Warning: No column is mapped to Email. Email is required for email campaigns.
          </p>
        </div>
      )}

      {is08ge && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            08.ge ფორმატი აღმოჩენილია - სვეტები ავტომატურად დამეპდა
          </p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-3 text-left text-sm font-medium text-gray-600 border w-16">
                #
              </th>
              <th className="p-3 text-left text-sm font-medium text-gray-600 border">
                {is08ge ? "CSV სვეტი (08.ge)" : "Excel Column"}
              </th>
              <th className="p-3 text-left text-sm font-medium text-gray-600 border w-48">
                Map to Field
              </th>
              <th className="p-3 text-left text-sm font-medium text-gray-600 border">
                Preview
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedColumns.map((column, index) => (
              <tr key={column} className="hover:bg-gray-50">
                <td className="p-3 border text-center text-sm text-gray-500">
                  {index + 1}
                </td>
                <td className="p-3 border">
                  <div className="text-sm">
                    {is08ge ? (
                      <div>
                        <span className="font-mono font-medium text-blue-600">{column}</span>
                        {COLUMN_08GE_LABELS[column.trim()] && (
                          <span className="ml-2 text-gray-500">
                            {COLUMN_08GE_LABELS[column.trim()]}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="font-mono">{column}</span>
                    )}
                  </div>
                </td>
                <td className="p-3 border">
                  <select
                    value={mapping[column] || "_skip"}
                    onChange={(e) =>
                      handleMappingChange(column, e.target.value as DBFieldKey)
                    }
                    className={`w-full p-2 border rounded-lg text-sm ${
                      mapping[column] === "email"
                        ? "border-green-500 bg-green-50"
                        : mapping[column] === "_skip"
                          ? "border-gray-200 text-gray-400"
                          : "border-blue-300 bg-blue-50"
                    }`}
                  >
                    {DB_FIELDS.map((field) => (
                      <option key={field.key} value={field.key}>
                        {field.label}
                        {field.required ? " *" : ""}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-3 border">
                  <div className="space-y-1">
                    {previewData.slice(0, 2).map((row, idx) => (
                      <div
                        key={idx}
                        className="text-xs text-gray-600 truncate max-w-xs"
                        title={row[column] || ""}
                      >
                        {row[column] || <span className="text-gray-300">empty</span>}
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
