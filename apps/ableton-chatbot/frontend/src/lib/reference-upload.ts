import { API_URL, getToken } from "./auth";
import { observePollingResponse } from "./background-polling";

export type UploadProgress = { loaded: number; total: number; sent: boolean };
export class UploadConfirmationError extends Error {}

export function uploadReference(file: File, signal: AbortSignal, progress: (value: UploadProgress) => void): Promise<Response> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException("Upload cancelled", "AbortError")); return; }
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const cleanup = () => signal.removeEventListener("abort", abort);
    xhr.open("POST", `${API_URL}/api/references`);
    xhr.timeout = 330000;
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.setRequestHeader("X-Reference-Name", encodeURIComponent(file.name));
    xhr.setRequestHeader("X-Rights-Confirmed", "true");
    const token = getToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = event => progress({ loaded: event.loaded, total: event.lengthComputable ? event.total : file.size, sent: false });
    xhr.upload.onload = () => progress({ loaded: file.size, total: file.size, sent: true });
    xhr.onload = () => {
      cleanup();
      const response = new Response(xhr.responseText, { status: xhr.status,
        headers: { "Content-Type": "application/json", ...(xhr.getResponseHeader("Retry-After") ? { "Retry-After": xhr.getResponseHeader("Retry-After")! } : {}) } });
      observePollingResponse(response);
      resolve(response);
    };
    xhr.onerror = xhr.ontimeout = () => {
      cleanup();
      reject(new UploadConfirmationError("Upload confirmation was lost. Check saved references before uploading again; the server may have received the file."));
    };
    xhr.onabort = () => { cleanup(); reject(new DOMException("Upload cancelled", "AbortError")); };
    signal.addEventListener("abort", abort, { once: true });
    xhr.send(file);
  });
}
