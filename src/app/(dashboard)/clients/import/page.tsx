"use client";

import { useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { FileUploader } from "@/components/import/FileUploader";
import { ColumnMapper, type ColumnMapping } from "@/components/import/ColumnMapper";
import { ImportPreview } from "@/components/import/ImportPreview";
import { ImportProgress, type ImportStats } from "@/components/import/ImportProgress";
import { parseAddress } from "@/lib/utils";

type Step = "upload" | "map" | "preview" | "import" | "complete";

const BATCH_SIZE = 500;

export default function ImportPage() {
  const [step, setStep] = useState<Step>("upload");
  const [, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<Record<string, string>[]>([]);
  const [allData, setAllData] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [importStats, setImportStats] = useState<ImportStats>({
    imported: 0,
    skipped: 0,
    failed: 0,
    currentBatch: 0,
    totalBatches: 0,
    errors: [],
    startTime: 0,
    isComplete: false,
    isCancelled: false,
  });

  const cancelRef = useRef(false);

  // Parse file and extract data
  const parseFile = async (file: File): Promise<Record<string, string>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;

          if (file.name.endsWith(".csv")) {
            // Parse CSV
            Papa.parse(data as string, {
              header: true,
              skipEmptyLines: true,
              complete: (results) => {
                resolve(results.data as Record<string, string>[]);
              },
              error: (err: Error) => {
                reject(err);
              },
            });
          } else {
            // Parse XLSX
            const workbook = XLSX.read(data, { type: "array" });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
              defval: "",
              raw: false,
            });
            resolve(jsonData as Record<string, string>[]);
          }
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(reader.error);

      if (file.name.endsWith(".csv")) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  };

  // Handle file selection
  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);

    try {
      const data = await parseFile(selectedFile);

      if (data.length === 0) {
        alert("File is empty or could not be parsed");
        return;
      }

      // Get columns from first row
      const cols = Object.keys(data[0]);
      setColumns(cols);
      setPreviewData(data.slice(0, 10));
      setAllData(data);
      setStep("map");
    } catch (error) {
      console.error("Parse error:", error);
      alert("Failed to parse file: " + String(error));
    }
  };

  // Handle mapping change
  const handleMappingChange = useCallback((newMapping: ColumnMapping) => {
    setMapping(newMapping);
  }, []);

  // Transform row data according to mapping
  const transformRow = (row: Record<string, string>): Record<string, string | null> => {
    const result: Record<string, string | null> = {};

    Object.entries(mapping).forEach(([column, field]) => {
      if (field === "_skip") return;

      const value = row[column] || null;

      // Special handling for address field - parse category and city
      if (field === "address" && value) {
        const { category, city, fullAddress } = parseAddress(value);
        result["category"] = category;
        result["city"] = city;
        result["address"] = fullAddress;
        return;
      }

      // Don't overwrite category/city if already set from address parsing
      if ((field === "category" || field === "city") && result[field]) {
        return;
      }

      result[field] = value;
    });

    return result;
  };

  // Start import process
  const handleStartImport = async () => {
    cancelRef.current = false;
    const totalBatches = Math.ceil(allData.length / BATCH_SIZE);

    setImportStats({
      imported: 0,
      skipped: 0,
      failed: 0,
      currentBatch: 0,
      totalBatches,
      errors: [],
      startTime: Date.now(),
      isComplete: false,
      isCancelled: false,
    });

    setStep("import");

    let imported = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < allData.length; i += BATCH_SIZE) {
      if (cancelRef.current) {
        setImportStats((prev) => ({
          ...prev,
          isCancelled: true,
        }));
        return;
      }

      const batch = allData.slice(i, i + BATCH_SIZE);
      const transformedBatch = batch.map(transformRow);
      const currentBatch = Math.floor(i / BATCH_SIZE) + 1;

      try {
        const response = await fetch("/api/clients/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(transformedBatch),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        imported += result.imported || 0;
        skipped += result.skipped || 0;
        failed += result.failed || 0;
        if (result.errors) {
          errors.push(...result.errors);
        }
      } catch (error) {
        failed += batch.length;
        errors.push(`Batch ${currentBatch} failed: ${String(error)}`);
      }

      setImportStats((prev) => ({
        ...prev,
        imported,
        skipped,
        failed,
        currentBatch,
        errors: [...errors],
      }));

      // Small delay between batches to avoid overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    setImportStats((prev) => ({
      ...prev,
      isComplete: true,
    }));
  };

  // Cancel import
  const handleCancel = () => {
    cancelRef.current = true;
  };

  // Complete and reset
  const handleComplete = () => {
    setStep("upload");
    setFile(null);
    setColumns([]);
    setPreviewData([]);
    setAllData([]);
    setMapping({});
  };

  const steps = [
    { key: "upload", label: "Upload", icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" },
    { key: "map", label: "Map Columns", icon: "M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" },
    { key: "preview", label: "Preview", icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" },
    { key: "import", label: "Import", icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" },
  ];

  const stepsOrder: Step[] = ["upload", "map", "preview", "import"];
  const currentIdx = stepsOrder.indexOf(step);

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-lg shadow-sky-500/25">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Import Clients</h1>
              <p className="text-slate-500">
                Upload Excel or CSV file to import clients
              </p>
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            {/* Progress Line Background */}
            <div className="absolute top-5 left-8 right-8 h-0.5 bg-slate-200" />
            {/* Progress Line Fill */}
            <div
              className="absolute top-5 left-8 h-0.5 bg-gradient-to-r from-sky-500 to-sky-600 transition-all duration-500"
              style={{ width: `${(currentIdx / (steps.length - 1)) * (100 - 16)}%` }}
            />

            {steps.map((s, idx) => {
              const stepIdx = stepsOrder.indexOf(s.key as Step);
              const isActive = stepIdx === currentIdx;
              const isComplete = stepIdx < currentIdx;

              return (
                <div key={s.key} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`
                      w-10 h-10 rounded-xl flex items-center justify-center text-sm font-medium transition-all duration-300
                      ${
                        isComplete
                          ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                          : isActive
                            ? "bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-500/25"
                            : "bg-white border-2 border-slate-200 text-slate-400"
                      }
                    `}
                  >
                    {isComplete ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={s.icon} />
                      </svg>
                    )}
                  </div>
                  <span
                    className={`mt-2 text-sm font-medium transition-colors ${
                      isActive ? "text-sky-600" : isComplete ? "text-emerald-600" : "text-slate-400"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Card */}
        <div className="card p-6">
          {/* Step: Upload */}
          {step === "upload" && (
            <FileUploader onFileSelect={handleFileSelect} />
          )}

          {/* Step: Map Columns */}
          {step === "map" && (
            <div className="space-y-6">
              <ColumnMapper
                columns={columns}
                previewData={previewData}
                onMappingChange={handleMappingChange}
                initialMapping={mapping}
              />
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setStep("upload")}
                  className="btn-secondary"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <button
                  onClick={() => setStep("preview")}
                  className="btn-primary flex-1"
                >
                  Continue to Preview
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {step === "preview" && (
            <div className="space-y-6">
              <ImportPreview
                data={allData}
                mapping={mapping}
                onStartImport={handleStartImport}
              />
              <button
                onClick={() => setStep("map")}
                className="btn-secondary w-full"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Mapping
              </button>
            </div>
          )}

          {/* Step: Import */}
          {(step === "import" || step === "complete") && (
            <ImportProgress
              stats={importStats}
              onCancel={handleCancel}
              onComplete={handleComplete}
            />
          )}
        </div>
      </div>
    </div>
  );
}
