"use client";

import { Suspense, use } from "react";
import { notFound } from "next/navigation";
import { LegalDocumentContent } from "@/features/legal/components/LegalDocumentContent";
import { isLegalDocumentKey } from "@/features/legal/constants/documents";

export default function LegalDocumentPage({
  params,
}: {
  params: Promise<{ doc: string }>;
}) {
  const { doc } = use(params);
  if (!isLegalDocumentKey(doc)) notFound();

  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <LegalDocumentContent doc={doc} />
    </Suspense>
  );
}
