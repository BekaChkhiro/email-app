"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RecipientSelector } from "@/components/campaigns/RecipientSelector";
import { CampaignSettings } from "@/components/campaigns/CampaignSettings";
import type { EmailTemplate } from "@/db/schema";

type Step = 1 | 2 | 3 | 4;

const STEPS = [
  { number: 1, title: "Name & Template", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
  { number: 2, title: "Recipients", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
  { number: 3, title: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  { number: 4, title: "Review", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
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
            className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Create Campaign</h1>
            <p className="text-slate-500 text-sm">Set up your email campaign in a few steps</p>
          </div>
        </div>
        <button
          onClick={handleSaveDraft}
          disabled={isCreating}
          className="btn-secondary"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          Save as Draft
        </button>
      </div>

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          {/* Progress Line Background */}
          <div className="absolute top-5 left-8 right-8 h-0.5 bg-slate-200" />
          {/* Progress Line Fill */}
          <div
            className="absolute top-5 left-8 h-0.5 bg-gradient-to-r from-sky-500 to-sky-600 transition-all duration-500"
            style={{ width: `${((currentStep - 1) / 3) * (100 - 16)}%` }}
          />

          {/* Steps */}
          {STEPS.map((step) => (
            <div key={step.number} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                  step.number === currentStep
                    ? "bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-500/25"
                    : step.number < currentStep
                      ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                      : "bg-white border-2 border-slate-200 text-slate-400"
                }`}
              >
                {step.number < currentStep ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={step.icon} />
                  </svg>
                )}
              </div>
              <span
                className={`mt-2 text-sm font-medium transition-colors ${
                  step.number === currentStep ? "text-sky-600" : step.number < currentStep ? "text-emerald-600" : "text-slate-400"
                }`}
              >
                {step.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="card p-6 mb-6 min-h-[400px]">
        {/* Step 1: Name & Template */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Campaign Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Black Friday Promotion"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Select Template</label>
              {isLoadingTemplates ? (
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-32 skeleton rounded-xl" />
                  ))}
                </div>
              ) : templates.length === 0 ? (
                <div className="empty-state py-12 border border-dashed border-slate-200 rounded-xl">
                  <div className="icon-container icon-container-lg mx-auto mb-4">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-slate-600 font-medium mb-1">No templates available</p>
                  <p className="text-slate-400 text-sm mb-4">Create a template first to use in campaigns</p>
                  <button
                    onClick={() => router.push("/templates/new")}
                    className="btn-primary"
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
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                        selectedTemplateId === template.id
                          ? "border-sky-500 bg-sky-50 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-900 mb-1">{template.name}</h4>
                          <p className="text-sm text-slate-500 truncate">{template.subject}</p>
                        </div>
                        {selectedTemplateId === template.id && (
                          <div className="w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
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
            <div className="flex items-center gap-3 mb-2">
              <div className="icon-container">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Review Your Campaign</h3>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Campaign Info */}
              <div className="space-y-4 p-4 bg-slate-50 rounded-xl">
                <h4 className="font-medium text-slate-700 text-sm uppercase tracking-wide">Campaign Details</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wide">Name</label>
                    <p className="font-medium text-slate-900">{name}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wide">Template</label>
                    <p className="font-medium text-slate-900">{selectedTemplate?.name || "-"}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wide">Subject</label>
                    <p className="font-medium text-slate-900">{selectedTemplate?.subject || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Settings Summary */}
              <div className="space-y-4 p-4 bg-slate-50 rounded-xl">
                <h4 className="font-medium text-slate-700 text-sm uppercase tracking-wide">Sending Settings</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Recipients</span>
                    <span className="font-semibold text-slate-900">{selectedRecipientIds.length} clients</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Daily Limit</span>
                    <span className="font-semibold text-slate-900">{dailyLimit} emails/day</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Send Window</span>
                    <span className="font-semibold text-slate-900">
                      {sendStartHour.toString().padStart(2, "0")}:00 - {sendEndHour.toString().padStart(2, "0")}:00
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Start Date</span>
                    <span className="font-semibold text-slate-900">
                      {startDate?.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }) || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <span className="text-slate-500">Est. Duration</span>
                    <span className="font-semibold text-sky-600">
                      {Math.ceil(selectedRecipientIds.length / dailyLimit)} days
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Template Preview */}
            {selectedTemplate && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span className="font-medium text-slate-700">Email Preview</span>
                </div>
                <div
                  className="p-6 prose prose-sm max-w-none bg-white"
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
          className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="flex gap-3">
          {currentStep < 4 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleLaunch}
              disabled={isCreating || !canProceed()}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-500/25 transition-all duration-200 flex items-center gap-2"
            >
              {isCreating ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Launching...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Launch Campaign
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
