export function registerPdfLaunchConsumer(consumer: (files: File[]) => void) {
  if (!window.launchQueue) {
    return () => {};
  }

  window.launchQueue.setConsumer((launchParams) => {
    void consumeLaunchedFiles(launchParams, consumer);
  });

  return () => {
    window.launchQueue?.setConsumer(() => {});
  };
}

async function consumeLaunchedFiles(launchParams: LaunchParams, consumer: (files: File[]) => void) {
  const files = await Promise.all(
    launchParams.files.map(async (handle) => {
      if (handle.kind !== "file") {
        return null;
      }

      const file = await handle.getFile();
      return isPdfFile(file) ? file : null;
    }),
  );

  const pdfFiles = files.filter((file): file is File => file !== null);
  if (pdfFiles.length > 0) {
    consumer(pdfFiles);
  }
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}
