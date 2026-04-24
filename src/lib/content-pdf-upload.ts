"use client";

import { createContentPdfUploadTicketAction } from "@/app/(platform)/admin/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export const CONTENT_PDF_MAX_BYTES = 100 * 1024 * 1024;

export function validateContentPdfFile(file: File | null) {
  if (!file) {
    return null;
  }

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    return "Seuls les fichiers PDF peuvent être déposés comme cours.";
  }

  if (file.size <= 0) {
    return "Le PDF sélectionné est vide.";
  }

  if (file.size > CONTENT_PDF_MAX_BYTES) {
    return "Le PDF dépasse la limite de 100 Mo.";
  }

  return null;
}

export async function uploadContentPdfDirectly({
  file,
  title
}: {
  file: File;
  title: string;
}): Promise<{ error?: string; storagePath?: string }> {
  const validationError = validateContentPdfFile(file);

  if (validationError) {
    return { error: validationError };
  }

  const ticketFormData = new FormData();
  ticketFormData.set("title", title);
  ticketFormData.set("file_name", file.name);
  ticketFormData.set("file_size", String(file.size));
  ticketFormData.set("file_type", file.type || "application/pdf");

  const ticket = await createContentPdfUploadTicketAction(ticketFormData);

  if (ticket.error || !ticket.bucket || !ticket.storagePath || !ticket.token) {
    return { error: ticket.error ?? "Impossible de préparer l'upload PDF." };
  }

  const supabase = createSupabaseBrowserClient();
  const uploadResult = await supabase.storage
    .from(ticket.bucket)
    .uploadToSignedUrl(ticket.storagePath, ticket.token, file, {
      cacheControl: "3600",
      contentType: "application/pdf"
    });

  if (uploadResult.error) {
    return { error: uploadResult.error.message || "Le PDF n'a pas pu être téléversé." };
  }

  return { storagePath: ticket.storagePath };
}
