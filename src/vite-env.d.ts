/// <reference types="vite/client" />

interface LaunchParams {
  readonly files: readonly FileSystemHandle[];
  readonly targetURL?: string;
}

interface LaunchQueue {
  setConsumer(consumer: (launchParams: LaunchParams) => void): void;
}

interface Window {
  launchQueue?: LaunchQueue;
}
