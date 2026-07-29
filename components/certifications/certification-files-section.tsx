"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2, Upload } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { CertificationFileRow } from "@/components/certifications/certification-files-list";
import {
  ALLOWED_FILE_ACCEPT,
  MAX_FILE_SIZE_LABEL,
  checkFileClientSide,
} from "@/lib/validation/certification-file";
import { cn } from "@/lib/utils";
import type { CertificationFileWithUrl } from "@/lib/types";

/**
 * Attachments section for an existing certification (edit mode only — an unsaved
 * certification has no id to attach files to).
 *
 * Render this only for users who may edit: every endpoint it calls is gated by the
 * same server-side `canEdit()` guard as editing the certification itself. `files`
 * comes from the server on each request (signed URLs are short-lived), and
 * `router.refresh()` after every mutation re-fetches it with fresh URLs.
 */
export function CertificationFilesSection({
  certificationId,
  files,
}: {
  certificationId: number;
  files: CertificationFileWithUrl[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CertificationFileWithUrl | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset the input so picking the same file again still fires onChange.
    event.target.value = "";
    if (!file) return;

    // Pre-check mirrors the server rules — the server re-validates regardless.
    const clientError = checkFileClientSide(file);
    if (clientError) {
      toast.error(clientError);
      return;
    }

    setUploading(true);
    // Field name "file" is the contract with app/api/certifications/[id]/files.
    const body = new FormData();
    body.append("file", file);
    const res = await fetch(`/api/certifications/${certificationId}/files`, {
      method: "POST",
      body,
    });
    setUploading(false);
    if (!res.ok) {
      toast.error("העלאת הקובץ נכשלה");
      return;
    }
    toast.success("הקובץ צורף להסמכה");
    router.refresh();
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    const res = await fetch(
      `/api/certifications/${certificationId}/files/${pendingDelete.id}`,
      { method: "DELETE" }
    );
    setDeleting(false);
    setPendingDelete(null);
    if (!res.ok) {
      toast.error("מחיקת הקובץ נכשלה");
      return;
    }
    toast.success("הקובץ נמחק");
    router.refresh();
  }

  return (
    <div className="space-y-3 max-w-2xl">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">
            קבצים מצורפים
            {files.length > 0 && (
              <span className="text-muted-foreground font-normal text-sm"> ({files.length})</span>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            ניתן לצרף תמונות (PNG, JPG, WEBP) או PDF, עד {MAX_FILE_SIZE_LABEL} לקובץ.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ALLOWED_FILE_ACCEPT}
          onChange={handleFileSelected}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {uploading ? "מעלה…" : "העלה קובץ"}
        </Button>
      </div>

      {files.length === 0 ? (
        <p className="text-sm text-muted-foreground">לא צורפו קבצים להסמכה זו.</p>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <CertificationFileRow
              key={file.id}
              file={file}
              action={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  aria-label="מחיקת קובץ"
                  onClick={() => setPendingDelete(file)}
                >
                  <Trash2 className="size-4" />
                </Button>
              }
            />
          ))}
        </div>
      )}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת קובץ</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את &quot;{pendingDelete?.original_name}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>ביטול</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: "destructive" }))}
              disabled={deleting}
              onClick={(e) => {
                // Keep the dialog open while the request runs; close on outcome.
                e.preventDefault();
                handleDelete();
              }}
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              אישור
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
