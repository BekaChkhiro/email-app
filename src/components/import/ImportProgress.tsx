"use client";

import { useState } from "react";
import { formatDuration } from "@/lib/utils";

export interface ImportStats {
  imported: number;
  skipped: number;
  failed: number;
  currentBatch: number;
  totalBatches: number;
  errors: string[];
  startTime: number;
  isComplete: boolean;
  isCancelled: boolean;
}

interface ImportProgressProps {
  stats: ImportStats;
  onCancel: () => void;
  onComplete: () => void;
}

export function ImportProgress({
  stats,
  onCancel,
  onComplete,
}: ImportProgressProps) {
  const [showErrors, setShowErrors] = useState(false);

  const progress = stats.totalBatches > 0
    ? Math.round((stats.currentBatch / stats.totalBatches) * 100)
    : 0;

  const elapsedMs = Date.now() - stats.startTime;
  const estimatedTotalMs = stats.currentBatch > 0
    ? (elapsedMs / stats.currentBatch) * stats.totalBatches
    : 0;
  const remainingMs = Math.max(0, estimatedTotalMs - elapsedMs);

  const totalProcessed = stats.imported + stats.skipped + stats.failed;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">
        {stats.isComplete
          ? "Import Complete!"
          : stats.isCancelled
            ? "Import Cancelled"
            : "Importing..."}
      </h3>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              stats.isCancelled
                ? "bg-yellow-500"
                : stats.isComplete
                  ? "bg-green-500"
                  : "bg-blue-500"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-sm text-gray-500 text-center">
          Batch {stats.currentBatch} of {stats.totalBatches}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-700">
            {stats.imported.toLocaleString()}
          </p>
          <p className="text-sm text-green-600">Imported</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-yellow-700">
            {stats.skipped.toLocaleString()}
          </p>
          <p className="text-sm text-yellow-600">Skipped</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-red-700">
            {stats.failed.toLocaleString()}
          </p>
          <p className="text-sm text-red-600">Failed</p>
        </div>
      </div>

      {/* Time Stats */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Elapsed:</span>
            <span className="ml-2 font-medium">{formatDuration(elapsedMs)}</span>
          </div>
          {!stats.isComplete && !stats.isCancelled && (
            <div>
              <span className="text-gray-500">Remaining:</span>
              <span className="ml-2 font-medium">
                ~{formatDuration(remainingMs)}
              </span>
            </div>
          )}
          <div>
            <span className="text-gray-500">Processed:</span>
            <span className="ml-2 font-medium">
              {totalProcessed.toLocaleString()} rows
            </span>
          </div>
          <div>
            <span className="text-gray-500">Speed:</span>
            <span className="ml-2 font-medium">
              {elapsedMs > 0
                ? Math.round((totalProcessed / elapsedMs) * 1000)
                : 0}{" "}
              rows/sec
            </span>
          </div>
        </div>
      </div>

      {/* Error Log */}
      {stats.errors.length > 0 && (
        <div className="border border-red-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowErrors(!showErrors)}
            className="w-full px-4 py-3 bg-red-50 text-left flex items-center justify-between"
          >
            <span className="text-sm font-medium text-red-700">
              Errors ({stats.errors.length})
            </span>
            <svg
              className={`w-5 h-5 text-red-500 transition-transform ${
                showErrors ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {showErrors && (
            <div className="p-4 max-h-48 overflow-y-auto bg-white">
              <ul className="space-y-1 text-sm text-red-600">
                {stats.errors.slice(0, 50).map((error, idx) => (
                  <li key={idx} className="font-mono">
                    {error}
                  </li>
                ))}
                {stats.errors.length > 50 && (
                  <li className="text-gray-500 italic">
                    ... and {stats.errors.length - 50} more errors
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {!stats.isComplete && !stats.isCancelled && (
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-red-100 text-red-700 font-medium rounded-lg hover:bg-red-200 transition-colors"
          >
            Cancel Import
          </button>
        )}
        {(stats.isComplete || stats.isCancelled) && (
          <button
            onClick={onComplete}
            className="flex-1 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            {stats.isComplete ? "Done" : "Close"}
          </button>
        )}
      </div>
    </div>
  );
}
