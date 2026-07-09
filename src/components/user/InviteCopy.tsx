"use client";

import { useState } from "react";

export default function InviteCopy({ code, copyLabel, copiedLabel }: { code: string; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    const link = `${window.location.origin}/register?ref=${code}`;
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy} className="btn btn-ghost w-full">
      {copied ? copiedLabel : copyLabel}
    </button>
  );
}
