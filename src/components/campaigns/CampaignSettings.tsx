"use client";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface CampaignSettingsProps {
  dailyLimit: number;
  sendStartHour: number;
  sendEndHour: number;
  startDate: Date | null;
  totalRecipients: number;
  onDailyLimitChange: (value: number) => void;
  onSendStartHourChange: (value: number) => void;
  onSendEndHourChange: (value: number) => void;
  onStartDateChange: (date: Date | null) => void;
}

export function CampaignSettings({
  dailyLimit,
  sendStartHour,
  sendEndHour,
  startDate,
  totalRecipients,
  onDailyLimitChange,
  onSendStartHourChange,
  onSendEndHourChange,
  onStartDateChange,
}: CampaignSettingsProps) {
  const estimatedDays = Math.ceil(totalRecipients / dailyLimit);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Sending Settings</h3>

      {/* Daily Limit */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Daily Email Limit
        </label>
        <div className="flex items-center gap-4">
          <input
            type="number"
            min="1"
            max="500"
            value={dailyLimit}
            onChange={(e) => onDailyLimitChange(Number(e.target.value))}
            className="w-32 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-500">emails per day</span>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          With {totalRecipients} recipients and {dailyLimit} emails/day, the
          campaign will take approximately {estimatedDays} day
          {estimatedDays !== 1 ? "s" : ""} to complete.
        </p>
      </div>

      {/* Sending Window */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Sending Window
        </label>
        <div className="flex items-center gap-4">
          <select
            value={sendStartHour}
            onChange={(e) => onSendStartHourChange(Number(e.target.value))}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {hours.map((hour) => (
              <option key={hour} value={hour}>
                {hour.toString().padStart(2, "0")}:00
              </option>
            ))}
          </select>
          <span className="text-gray-500">to</span>
          <select
            value={sendEndHour}
            onChange={(e) => onSendEndHourChange(Number(e.target.value))}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {hours.map((hour) => (
              <option key={hour} value={hour}>
                {hour.toString().padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Emails will only be sent during this time window (server timezone).
        </p>
      </div>

      {/* Start Date */}
      <div>
        <label className="block text-sm font-medium mb-2">Start Date</label>
        <DatePicker
          selected={startDate}
          onChange={onStartDateChange}
          minDate={new Date()}
          dateFormat="MMMM d, yyyy"
          className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholderText="Select start date"
        />
        <p className="mt-2 text-sm text-gray-500">
          The campaign will begin sending on this date.
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Campaign Summary</h4>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>
            <span className="font-medium">{totalRecipients}</span> total recipients
          </li>
          <li>
            <span className="font-medium">{dailyLimit}</span> emails will be sent per day
          </li>
          <li>
            Sending window:{" "}
            <span className="font-medium">
              {sendStartHour.toString().padStart(2, "0")}:00 -{" "}
              {sendEndHour.toString().padStart(2, "0")}:00
            </span>
          </li>
          <li>
            Estimated completion:{" "}
            <span className="font-medium">
              {estimatedDays} day{estimatedDays !== 1 ? "s" : ""}
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
