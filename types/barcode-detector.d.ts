export {};

declare global {
  interface DetectedBarcode {
    rawValue?: string;
  }

  interface BarcodeDetector {
    detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
  }

  interface BarcodeDetectorStatic {
    new (options?: { formats?: string[] }): BarcodeDetector;
  }

  interface Window {
    BarcodeDetector: BarcodeDetectorStatic;
  }
}
