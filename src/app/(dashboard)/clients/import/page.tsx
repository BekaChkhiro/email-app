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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Import Clients</h1>
          <p className="text-gray-600 mt-1">
            Upload Excel or CSV file to import clients
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[
              { key: "upload", label: "Upload" },
              { key: "map", label: "Map Columns" },
              { key: "preview", label: "Preview" },
              { key: "import", label: "Import" },
            ].map((s, idx) => {
              const steps: Step[] = ["upload", "map", "preview", "import"];
              const currentIdx = steps.indexOf(step);
              const stepIdx = steps.indexOf(s.key as Step);
              const isActive = stepIdx === currentIdx;
              const isComplete = stepIdx < currentIdx;

              return (
                <div key={s.key} className="flex items-center">
                  <div
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                      ${
                        isComplete
                          ? "bg-green-500 text-white"
                          : isActive
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200 text-gray-500"
                      }
                    `}
                  >
                    {isComplete ? "✓" : idx + 1}
                  </div>
                  <span
                    className={`ml-2 text-sm ${
                      isActive ? "text-blue-600 font-medium" : "text-gray-500"
                    }`}
                  >
                    {s.label}
                  </span>
                  {idx < 3 && (
                    <div
                      className={`w-12 h-0.5 mx-4 ${
                        isComplete ? "bg-green-500" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
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
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("upload")}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep("preview")}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Continue to Preview
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
                className="w-full py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
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
