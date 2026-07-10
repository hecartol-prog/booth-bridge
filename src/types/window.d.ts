interface Window {
  jsQR?: (data: Uint8ClampedArray, width: number, height: number) => { data?: string } | null;
  BarcodeDetector?: new (options: { formats: string[] }) => {
    detect(source: CanvasImageSource): Promise<Array<{ rawValue?: string }>>;
  };
  __BB_DEBUG__?: {
    getState: () => unknown;
    exportReport: () => unknown;
    runHealthCheck: () => Promise<{ ok: boolean; name: string; durationMs: number; result?: unknown; error?: string }>;
    runOcrTest: () => Promise<{ ok: boolean; name: string; durationMs: number; result?: unknown; error?: string }>;
    runAuthTest: () => Promise<{ ok: boolean; name: string; durationMs: number; result?: unknown; error?: string }>;
    runStorageTest: () => Promise<{ ok: boolean; name: string; durationMs: number; result?: unknown; error?: string }>;
    runAiTest: () => Promise<{ ok: boolean; name: string; durationMs: number; result?: unknown; error?: string }>;
    runRealtimeTest: () => Promise<{ ok: boolean; name: string; durationMs: number; result?: unknown; error?: string }>;
    runNotificationsTest: () => Promise<{ ok: boolean; name: string; durationMs: number; result?: unknown; error?: string }>;
  };
}

interface EventTarget {
  value?: string;
  checked?: boolean;
  files?: FileList | null;
  result?: string;
  style?: CSSStyleDeclaration;
}

interface Navigator {
  userLanguage?: string;
}
