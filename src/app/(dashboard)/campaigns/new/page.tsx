"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RecipientSelector } from "@/components/campaigns/RecipientSelector";
import { CampaignSettings } from "@/components/campaigns/CampaignSettings";
import type { EmailTemplate } from "@/db/schema";

type Step = 1 | 2 | 3 | 4;

const STEPS = [
  { number: 1, title: "Name & Template" },
  { number: 2, title: "Select Recipients" },
  { number: 3, title: "Sending Settings" },
  { number: 4, title: "Review & Launch" },
];

export default function NewCampaignPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isCreating, setIsCreating] = useState(false);

  // Step 1: Name & Template
  const [name, setName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

  // Step 2: Recipients
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);

  // Step 3: Settings
  const [dailyLimit, setDailyLimit] = useState(10);
  const [sendStartHour, setSendStartHour] = useState(9);
  const [sendEndHour, setSendEndHour] = useState(18);
  const [startDate, setStartDate] = useState<Date | null>(new Date());

  // Fetch templates
  useEffect(() => {
    fetch("/api/templates")
      .then((res) => res.json())
      .then((data) => {
        setTemplates(data.filter((t: EmailTemplate) => t.isActive));
      })
      .catch(console.error)
      .finally(() => setIsLoadingTemplates(false));
  }, []);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return name.trim().length > 0 && selectedTemplateId !== null;
      case 2:
        return selectedRecipientIds.length > 0;
      case 3:
        return dailyLimit > 0 && startDate !== null;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleLaunch = async () => {
    setIsCreating(true);
    try {
      // Create campaign
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          templateId: selectedTemplateId,
          dailyLimit,
          sendStartHour,
          sendEndHour,
          recipientIds: selectedRecipientIds,
          status: "scheduled",
        }),
      });

      if (res.ok) {
        const campaign = await res.json();
        // Launch the campaign
        await fetch(`/api/campaigns/${campaign.id}/launch`, {
          method: "POST",
        });
        router.push(`/campaigns/${campaign.id}`);
      }
    } catch (error) {
      console.error("Failed to create campaign:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || "Untitled Campaign",
          templateId: selectedTemplateId,
          dailyLimit,
          sendStartHour,
          sendEndHour,
          recipientIds: selectedRecipientIds,
          status: "draft",
        }),
      });

      if (res.ok) {
        const campaign = await res.json();
        router.push(`/campaigns/${campaign.id}`);
      }
    } catch (error) {
      console.error("Failed to save draft:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/campaigns")}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold">Create Campaign</h1>
        </div>
        <button
          onClick={handleSaveDraft}
          disabled={isCreating}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Save as Draft
        </button>
      </div>

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          {/* Progress Line */}
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200" />
          <div
            className="absolute top-4 left-0 h-0.5 bg-blue-600 transition-all"
            style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
          />

          {/* Steps */}
          {STEPS.map((step) => (
            <div key={step.number} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step.number === currentStep
                    ? "bg-blue-600 text-white"
                    : step.number < currentStep
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-600"
                }`}
              >
                {step.number < currentStep ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.number
                )}
              </div>
              <span
                className={`mt-2 text-sm ${
                  step.number === currentStep ? "text-blue-600 font-medium" : "text-gray-500"
                }`}
              >
                {step.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white border rounded-lg p-6 mb-6 min-h-[400px]">
        {/* Step 1: Name & Template */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Campaign Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Black Friday Promotion"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Select Template</label>
              {isLoadingTemplates ? (
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 border rounded-lg">
                  <p className="text-gray-500 mb-4">No templates available</p>
                  <button
                    onClick={() => router.push("/templates/new")}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create a Template
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedTemplateId === template.id
                          ? "border-blue-500 bg-blue-50"
                          : "hover:border-gray-300"
                      }`}
                    >
                      <h4 className="font-medium mb-1">{template.name}</h4>
                      <p className="text-sm text-gray-500 truncate">{template.subject}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Recipients */}
        {currentStep === 2 && (
          <RecipientSelector
            selectedIds={selectedRecipientIds}
            onSelectionChange={setSelectedRecipientIds}
          />
        )}

        {/* Step 3: Settings */}
        {currentStep === 3 && (
          <CampaignSettings
            dailyLimit={dailyLimit}
            sendStartHour={sendStartHour}
            sendEndHour={sendEndHour}
            startDate={startDate}
            totalRecipients={selectedRecipientIds.length}
            onDailyLimitChange={setDailyLimit}
            onSendStartHourChange={setSendStartHour}
            onSendEndHourChange={setSendEndHour}
            onStartDateChange={setStartDate}
          />
        )}

        {/* Step 4: Review */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Review Your Campaign</h3>

            <div className="grid grid-cols-2 gap-6">
              {/* Campaign Info */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500">Campaign Name</label>
                  <p className="font-medium">{name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Template</label>
                  <p className="font-medium">{selectedTemplate?.name || "-"}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Subject</label>
                  <p className="font-medium">{selectedTemplate?.subject || "-"}</p>
                </div>
              </div>

              {/* Settings Summary */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500">Recipients</label>
                  <p className="font-medium">{selectedRecipientIds.length} clients</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Daily Limit</label>
                  <p className="font-medium">{dailyLimit} emails/day</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Sending Window</label>
                  <p className="font-medium">
                    {sendStartHour.toString().padStart(2, "0")}:00 -{" "}
                    {sendEndHour.toString().padStart(2, "0")}:00
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Start Date</label>
                  <p className="font-medium">
                    {startDate?.toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    }) || "-"}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Estimated Duration</label>
                  <p className="font-medium">
                    {Math.ceil(selectedRecipientIds.length / dailyLimit)} days
                  </p>
                </div>
              </div>
            </div>

            {/* Template Preview */}
            {selectedTemplate && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-3 border-b">
                  <span className="font-medium">Email Preview</span>
                </div>
                <div
                  className="p-6 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedTemplate.htmlContent }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          disabled={currentStep === 1}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back
        </button>

        <div className="flex gap-2">
          {currentStep < 4 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleLaunch}
              disabled={isCreating || !canProceed()}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isCreating ? "Launching..." : "Launch Campaign"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
