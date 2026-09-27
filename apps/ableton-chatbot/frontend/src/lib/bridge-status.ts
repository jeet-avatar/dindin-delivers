export type BridgeStatus = "checking" | "connected" | "disconnected" | "unavailable" | "signed-out";

export const bridgeStatusLabel: Record<BridgeStatus, string> = {
  checking: "Checking bridge connection...",
  connected: "Bridge connected",
  disconnected: "Bridge not connected",
  unavailable: "Unable to check bridge connection",
  "signed-out": "Sign in to check bridge connection",
};

export function bridgeStatusFromResponse(httpStatus: number, data: unknown): BridgeStatus {
  if (httpStatus === 401) return "signed-out";
  if (httpStatus !== 200 || !data || typeof data !== "object" || !("bridge_connected" in data)) return "unavailable";
  return data.bridge_connected === true ? "connected" : data.bridge_connected === false ? "disconnected" : "unavailable";
}
