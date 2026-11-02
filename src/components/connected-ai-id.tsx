"use client";
import { useState } from "react";
export function ConnectedAIId({ id, name }: { id: string; name: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="connected-ai-id">
      <div>
        <span className="eyebrow">CONNECTED AI ACCOUNT ID · {name}</span>
        <code>{id}</code>
      </div>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(id);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? "Copied" : "Copy account ID"}
      </button>
    </div>
  );
}
