"use client";

import { useState } from "react";

export function MissionLauncher() {
  const [status, setStatus] = useState<"idle" | "queued" | "running" | "failed">("idle");
  const [message, setMessage] = useState("Ready to queue a dry-run mission.");

  async function runMission() {
    setStatus("running");
    setMessage("Queueing dry-run mission...");

    const response = await fetch("/api/workflows", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enqueue: true, source: "dashboard" }),
    });

    if (!response.ok) {
      setStatus("failed");
      setMessage("Mission trigger failed.");
      return;
    }

    const payload = (await response.json()) as {
      queued?: { workflowRunId: string; jobId: string };
      workflow?: { workflowRunId: string };
    };
    setStatus("queued");
    setMessage(
      payload.queued
        ? `Queued mission ${payload.queued.workflowRunId}.`
        : `Ran mission ${payload.workflow?.workflowRunId ?? "immediately"}.`,
    );
  }

  return (
    <section className="rounded border border-stone-300 bg-white p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Mission Control</h2>
          <p className="text-sm text-stone-600">{message}</p>
        </div>
        <button
          className="rounded border border-stone-900 bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          disabled={status === "running"}
          onClick={() => void runMission()}
          type="button"
        >
          {status === "running" ? "Queueing..." : "Run Dry-Run Mission"}
        </button>
      </div>
    </section>
  );
}
