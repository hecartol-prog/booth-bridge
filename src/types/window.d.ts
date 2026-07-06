interface Window {
  jsQR?: (data: Uint8ClampedArray, width: number, height: number) => { data?: string } | null;
  BarcodeDetector?: new (options: { formats: string[] }) => {
    detect(source: CanvasImageSource): Promise<Array<{ rawValue?: string }>>;
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
