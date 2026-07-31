import { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Let Vite resolve and version the worker together with the installed PDF.js
// package. A root-relative `/pdf.worker.min.mjs` breaks when the app is hosted
// below a sub-path and can silently leave the viewer on its loading screen.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PdfJsViewerProps {
  fileUrl: string;
  initialPage: number;
  zoom: number;
  onPageChange: (page: number) => void;
}

const PdfPage: React.FC<{
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  onPageSize: (pageNumber: number, size: { width: number; height: number }) => void;
}> = ({ pdfDoc, pageNumber, scale, onPageSize }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<unknown> } | null = null;

    pdfDoc.getPage(pageNumber).then((page) => {
      if (cancelled) return;
      const viewport = page.getViewport({ scale });
      onPageSize(pageNumber, { width: viewport.width, height: viewport.height });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      renderTask = page.render({ canvasContext: ctx!, viewport });
      renderTask.promise.catch((err) => {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('PDF render error:', err);
        }
      });
    });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdfDoc, pageNumber, scale, onPageSize]);

  return <canvas ref={canvasRef} className="shadow-lg rounded-lg bg-white" />;
};

export const PdfJsViewer: React.FC<PdfJsViewerProps> = ({
  fileUrl,
  initialPage,
  zoom,
  onPageChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [visiblePage, setVisiblePage] = useState(initialPage);
  const [pageSizes, setPageSizes] = useState<
    Record<number, { width: number; height: number }>
  >({});
  const currentPageRef = useRef(initialPage);
  const scrollReportedPageRef = useRef<number | null>(null);

  useEffect(() => {
    currentPageRef.current = initialPage;
    setVisiblePage(initialPage);
  }, [initialPage]);

  useEffect(() => {
    const loadingTask = pdfjsLib.getDocument({ url: fileUrl });
    let destroyed = false;
    setPdfDoc(null);
    setLoadError(null);
    setPageSizes({});
    pageRefs.current = [];

    loadingTask.promise
      .then((pdf) => {
        if (destroyed) {
          loadingTask.destroy();
          return;
        }
        setPdfDoc(pdf);
      })
      .catch((err) => {
        if (destroyed || err?.message === 'Loading aborted') {
          return;
        }
        console.error('PDF load error:', err);
        setPdfDoc(null);
        setLoadError(
          err instanceof Error
            ? err.message
            : 'Không thể tải hoặc đọc tệp PDF.',
        );
      });

    return () => {
      destroyed = true;
      loadingTask.destroy();
    };
  }, [fileUrl, loadAttempt]);

  const handlePageSize = useCallback(
    (pageNumber: number, size: { width: number; height: number }) => {
      setPageSizes((prev) => {
        const existing = prev[pageNumber];
        if (
          existing &&
          existing.width === size.width &&
          existing.height === size.height
        ) {
          return prev;
        }
        return { ...prev, [pageNumber]: size };
      });
    },
    [],
  );

  useEffect(() => {
    if (!pdfDoc) return;

    let cancelled = false;

    Promise.all(
      Array.from({ length: pdfDoc.numPages }, async (_, index) => {
        const pageNumber = index + 1;
        const page = await pdfDoc.getPage(pageNumber);
        const viewport = page.getViewport({ scale: zoom / 100 });
        return [pageNumber, { width: viewport.width, height: viewport.height }] as const;
      }),
    ).then((sizes) => {
      if (cancelled) return;
      setPageSizes(Object.fromEntries(sizes));
    });

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, zoom]);

  const handlePageChange = useCallback(
    (pageNum: number) => {
      if (pageNum !== currentPageRef.current) {
        currentPageRef.current = pageNum;
        setVisiblePage(pageNum);
        scrollReportedPageRef.current = pageNum;
        onPageChange(pageNum);
      }
    },
    [onPageChange],
  );

  useEffect(() => {
    if (!containerRef.current || !pdfDoc) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let bestPage = currentPageRef.current;
        let bestRatio = 0;

        for (const entry of entries) {
          const pageNum = Number(
            (entry.target as HTMLElement).dataset.pageNumber,
          );
          if (entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestPage = pageNum;
          }
        }

        if (bestPage !== currentPageRef.current) {
          handlePageChange(bestPage);
        }
      },
      { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] },
    );

    const currentRefs = pageRefs.current.filter(Boolean);
    currentRefs.forEach((ref) => ref && observer.observe(ref));

    return () => observer.disconnect();
  }, [pdfDoc, handlePageChange]);

  useEffect(() => {
    if (!containerRef.current || !pdfDoc) return;

    if (scrollReportedPageRef.current === initialPage) {
      scrollReportedPageRef.current = null;
      return;
    }

    const el = pageRefs.current[initialPage - 1];
    if (el) {
      el.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }, [pdfDoc, initialPage]);

  const scale = zoom / 100;
  const BUFFER = 6;
  const numPages = pdfDoc?.numPages || 0;
  const rangeStart = Math.max(1, visiblePage - BUFFER);
  const rangeEnd = Math.min(numPages, visiblePage + BUFFER);
  const fallbackPageHeight = 800 * scale;

  if (!pdfDoc) {
    return (
      <div className="flex-1 w-full h-full bg-[#525659] flex items-center justify-center">
        {loadError ? (
          <div className="max-w-md px-6 text-center">
            <p className="text-white font-medium">Không thể hiển thị PDF</p>
            <p className="mt-2 text-sm text-white/70 break-words">{loadError}</p>
            <button
              type="button"
              onClick={() => setLoadAttempt((attempt) => attempt + 1)}
              className="mt-4 rounded-md bg-white px-4 py-2 text-sm font-medium text-[#314247] hover:bg-white/90"
            >
              Thử tải lại
            </button>
          </div>
        ) : (
          <div className="text-white/70 text-sm animate-pulse">
            Đang tải PDF...
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 w-full h-full overflow-y-auto bg-[#525659] p-2 space-y-2"
    >
      {Array.from({ length: numPages }, (_, i) => i + 1).map(
        (pageNum) => (
          <div
            key={pageNum}
            ref={(el) => {
              pageRefs.current[pageNum - 1] = el;
            }}
            data-page-number={pageNum}
            className="flex justify-center"
            style={{ minHeight: pageSizes[pageNum]?.height ?? fallbackPageHeight }}
          >
            {pageNum >= rangeStart && pageNum <= rangeEnd ? (
              <PdfPage
                pdfDoc={pdfDoc}
                pageNumber={pageNum}
                scale={scale}
                onPageSize={handlePageSize}
              />
            ) : (
              <div
                className="shadow-lg rounded-lg bg-white/5"
                style={{
                  width: pageSizes[pageNum]?.width,
                  height: pageSizes[pageNum]?.height ?? fallbackPageHeight,
                }}
              />
            )}
          </div>
        ),
      )}
    </div>
  );
};
