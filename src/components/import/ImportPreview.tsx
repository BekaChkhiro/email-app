"use client";

import { useMemo } from "react";
import { isValidEmail } from "@/lib/utils";
import type { ColumnMapping } from "./ColumnMapper";

interface ImportPreviewProps {
  data: Record<string, string>[];
  mapping: ColumnMapping;
  onStartImport: () => void;
}

interface ValidationStats {
  totalRows: number;
  rowsWithEmail: number;
  rowsWithoutEmail: number;
  invalidEmails: number;
  duplicateEmails: number;
  uniqueEmails: Set<string>;
}

export function ImportPreview({
  data,
  mapping,
  onStartImport,
}: ImportPreviewProps) {
  const stats = useMemo((): ValidationStats => {
    const emailColumn = Object.entries(mapping).find(
      ([, value]) => value === "email"
    )?.[0];

    const uniqueEmails = new Set<string>();
    let rowsWithEmail = 0;
    let rowsWithoutEmail = 0;
    let invalidEmails = 0;
    let duplicateEmails = 0;

    data.forEach((row) => {
      const email = emailColumn ? row[emailColumn]?.trim().toLowerCase() : null;

      if (!email) {
        rowsWithoutEmail++;
        return;
      }

      if (!isValidEmail(email)) {
        invalidEmails++;
        rowsWithoutEmail++;
        return;
      }

      if (uniqueEmails.has(email)) {
        duplicateEmails++;
      } else {
        uniqueEmails.add(email);
      }

      rowsWithEmail++;
    });

    return {
      totalRows: data.length,
      rowsWithEmail,
      rowsWithoutEmail,
      invalidEmails,
      duplicateEmails,
      uniqueEmails,
    };
  }, [data, mapping]);

  const estimatedBatches = Math.ceil(data.length / 500);
  const estimatedTime = Math.ceil((data.length / 500) * 2); // ~2 seconds per batch

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Import Preview</h3>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Rows"
          value={stats.totalRows.toLocaleString()}
          color="blue"
        />
        <StatCard
          label="With Email"
          value={stats.rowsWithEmail.toLocaleString()}
          color="green"
        />
        <StatCard
          label="Without Email"
          value={stats.rowsWithoutEmail.toLocaleString()}
          color="yellow"
        />
        <StatCard
          label="Unique Emails"
          value={stats.uniqueEmails.size.toLocaleString()}
          color="purple"
        />
      </div>

      {/* Validation Summary */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <h4 className="font-medium text-gray-800">Validation Summary</h4>

        <div className="space-y-2 text-sm">
          {stats.invalidEmails > 0 && (
            <div className="flex items-center gap-2 text-yellow-700">
              <WarningIcon />
              <span>
                {stats.invalidEmails.toLocaleString()} invalid email addresses will be skipped
              </span>
            </div>
          )}

          {stats.duplicateEmails > 0 && (
            <div className="flex items-center gap-2 text-yellow-700">
              <WarningIcon />
              <span>
                {stats.duplicateEmails.toLocaleString()} duplicate emails found in file (will import once)
              </span>
            </div>
          )}

          {stats.rowsWithoutEmail > 0 && (
            <div className="flex items-center gap-2 text-blue-700">
              <InfoIcon />
              <span>
                {stats.rowsWithoutEmail.toLocaleString()} rows without email will still be imported for CRM
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-green-700">
            <CheckIcon />
            <span>
              {stats.uniqueEmails.size.toLocaleString()} unique emails ready for import
            </span>
          </div>
        </div>
      </div>

      {/* Import Estimation */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">Import Estimation</h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p>Batches: {estimatedBatches} (500 rows per batch)</p>
          <p>Estimated time: ~{estimatedTime} seconds</p>
        </div>
      </div>

      {/* Start Import Button */}
      <button
        onClick={onStartImport}
        className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
        Start Import ({stats.totalRows.toLocaleString()} rows)
      </button>
    </div>
  );
}

// Helper Components
function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "blue" | "green" | "yellow" | "purple";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };

  return (
    <div className={`p-4 rounded-lg border ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm opacity-80">{label}</p>
    </div>
  );
}

function WarningIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  );
}
