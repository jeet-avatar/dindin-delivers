import type { UploadProgress } from "./reference-upload";
import { UploadConfirmationError } from "./reference-upload";

export type CloudForm = { url: string; fields: Record<string, string> };

// Sends the file straight to S3 with a presigned POST; S3 enforces the size limit. Resolves on S3's 204.
export function uploadToCloud(form: CloudForm, file: File, signal: AbortSignal, progress: (value: UploadProgress) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException("Upload cancelled", "AbortError")); return; }
    const body = new FormData();
    Object.entries(form.fields).forEach(([key, value]) => body.append(key, value));
    body.append("file", file);
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const cleanup = () => signal.removeEventListener("abort", abort);
    xhr.open("POST", form.url);
    xhr.upload.onprogress = event => progress({ loaded: event.loaded, total: event.lengthComputable ? event.total : file.size, sent: false });
    xhr.upload.onload = () => progress({ loaded: file.size, total: file.size, sent: true });
    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(xhr.status === 400 && xhr.responseText.includes("EntityTooLarge")
        ? "The file is larger than BeatMind Cloud accepts." : "BeatMind Cloud did not accept the upload. Try again."));
    };
    xhr.onerror = () => { cleanup(); reject(new UploadConfirmationError("The upload connection was lost. Try again.")); };
    xhr.onabort = () => { cleanup(); reject(new DOMException("Upload cancelled", "AbortError")); };
    signal.addEventListener("abort", abort, { once: true });
    xhr.send(body);
  });
}
