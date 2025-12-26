"use client";

import { useState, useEffect } from "react";

// Database fields available for mapping
export const DB_FIELDS = [
  { key: "company_name", label: "Company Name", required: false },
  { key: "category", label: "Category", required: false },
  { key: "city", label: "City", required: false },
  { key: "address", label: "Address", required: false },
  { key: "identification_code", label: "Identification Code", required: false },
  { key: "phone_primary", label: "Phone (Primary)", required: false },
  { key: "phone_secondary", label: "Phone (Secondary)", required: false },
  { key: "phone_tertiary", label: "Phone (Tertiary)", required: false },
  { key: "email", label: "Email", required: true },
  { key: "email_secondary", label: "Email (Secondary)", required: false },
  { key: "website", label: "Website", required: false },
  { key: "facebook", label: "Facebook", required: false },
  { key: "director_name", label: "Director Name", required: false },
  { key: "legal_form", label: "Legal Form", required: false },
  { key: "company_name_alt", label: "Company Name (Alt)", required: false },
  { key: "link_08", label: "08 Link", required: false },
  { key: "_skip", label: "-- Skip this column --", required: false },
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

// Auto-detect mapping based on column names
function autoDetectMapping(columns: string[]): ColumnMapping {
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

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-3 text-left text-sm font-medium text-gray-600 border">
                Excel Column
              </th>
              <th className="p-3 text-left text-sm font-medium text-gray-600 border">
                Map to Field
              </th>
              <th className="p-3 text-left text-sm font-medium text-gray-600 border">
                Preview (First 3 rows)
              </th>
            </tr>
          </thead>
          <tbody>
            {columns.map((column) => (
              <tr key={column} className="hover:bg-gray-50">
                <td className="p-3 border font-mono text-sm">{column}</td>
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
                          : "border-gray-300"
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
                    {previewData.slice(0, 3).map((row, idx) => (
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
