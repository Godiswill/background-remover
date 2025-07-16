import { useState, useId, useEffect, useRef, useCallback } from 'react';
import { removeBackground } from '@imgly/background-removal';
import PreviewDownload from './PreviewDownload';
import type { IPreviewDownloadProps } from './PreviewDownload';
import uploadImg from '../images/upload.svg';

function formatTime(ms: number) {
  const totalSeconds = ms / 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = (totalSeconds % 60).toFixed(2);

  if (hours > 0) {
    const pad = (num: number | string) => num.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  } else {
    let parts = [];
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    return parts.join(' ');
  }
}

export default function SelectImage({ children }: React.PropsWithChildren) {
  const fileInputId = useId();
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [outOfMemory, setOutOfMemory] = useState(false);
  const [imgSliders, setImgSliders] = useState<IPreviewDownloadProps[]>();
  const dropRef = useRef<HTMLLabelElement>(null);
  const [time, setTime] = useState('');

  const handleFiles = useCallback(
    async (files?: FileList | File[] | null) => {
      if (isLoading || !files?.length) return;

      const imgFiles = Array.from(files).filter((it) =>
        it.type.startsWith('image/')
      );

      if (!imgFiles?.length) return;

      const startTime = performance.now();
      setIsLoading(true);
      setOutOfMemory(false);
      const isMobile = /mobile/i.test(navigator.userAgent);
      // const result = await Promise.allSettled(
      //   imgFiles.map((file) =>
      //     removeBackground(file, {
      //       device: navigator.gpu ? 'gpu' : 'cpu',
      //       publicPath: import.meta.env.PROD
      //         ? 'https://bgg.one/ai-model/'
      //         : 'http://localhost:4321/ai-model/',
      //       progress: (key, current, total) => {
      //         // console.log(`Downloading ${key}: ${current} of ${total}`);
      //         if (
      //           typeof current === 'number' &&
      //           (current === total || total < 8)
      //         ) {
      //           setIsDownloading(false);
      //         } else {
      //           setIsDownloading(true);
      //         }
      //       },
      //       model: isMobile ? 'isnet_quint8' : 'isnet_fp16',
      //       // proxyToWorker: !!navigator.gpu,
      //       debug:
      //         import.meta.env.DEV ||
      //         !!new URLSearchParams(window.location.search).get('debug'),
      //       // fetchArgs: {
      //       //   mode: 'no-cors',
      //       // },
      //     })
      //   )
      // );
      const result = [];
      for (const file of imgFiles) {
        try {
          const output = await removeBackground(file, {
            device: navigator.gpu ? 'gpu' : 'cpu',
            publicPath: import.meta.env.PROD
              ? 'https://bgg.one/ai-model/'
              : 'http://localhost:4321/ai-model/',
            progress: (key, current, total) => {
              // console.log(`Downloading ${key}: ${current} of ${total}`);
              if (
                typeof current === 'number' &&
                (current === total || total < 8)
              ) {
                setIsDownloading(false);
              } else {
                setIsDownloading(true);
              }
            },
            model: isMobile ? 'isnet_quint8' : 'isnet_fp16',
            // proxyToWorker: !!navigator.gpu,
            debug:
              import.meta.env.DEV ||
              !!new URLSearchParams(window.location.search).get('debug'),
            // fetchArgs: {
            //   mode: 'no-cors',
            // },
          });
          result.push({ status: 'fulfilled', value: output });
        } catch (err) {
          console.error('Failed to process', file.name, err);
          result.push({ status: 'rejected', reason: err });
        }
      }
      console.log('result', result);
      const fulfilled = result.reduce((pre, cur, i) => {
        if (cur.status === 'fulfilled') {
          pre.push({
            beforeSrc: URL.createObjectURL(imgFiles[i]),
            afterSrc: URL.createObjectURL(cur.value),
            afterFile: cur.value,
          });
        }
        return pre;
      }, [] as IPreviewDownloadProps[]);
      console.log('fulfilled', fulfilled);
      if (fulfilled.length) {
        setImgSliders((pre) => {
          pre?.forEach(({ beforeSrc, afterSrc }) => {
            URL.revokeObjectURL(beforeSrc);
            URL.revokeObjectURL(afterSrc);
          });
          return fulfilled;
        });
      } else {
        setOutOfMemory(true);
      }
      setIsLoading(false);
      const duringTime = performance.now() - startTime;
      setTime(formatTime(duringTime));
    },
    [isLoading]
  );

  useEffect(() => {
    const drop = dropRef.current;
    if (!drop) return;

    function preventDefaultEvent(e: Event) {
      e.preventDefault();
    }
    ['dragenter', 'dragover', 'dragleave'].forEach((eventName) => {
      drop.addEventListener(eventName, preventDefaultEvent);
    });

    function dropEvent(e: DragEvent) {
      e.preventDefault();

      const files = e.dataTransfer?.files;
      handleFiles(files);
    }

    drop.addEventListener('drop', dropEvent);

    return () => {
      ['dragenter', 'dragover', 'dragleave'].forEach((eventName) => {
        drop.removeEventListener(eventName, preventDefaultEvent);
      });
      drop.removeEventListener('drop', dropEvent);
    };
  }, [handleFiles]);

  useEffect(() => {
    function pasteEvent(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      const imgs: File[] = [];
      for (let i = 0; items && i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file && file.type.startsWith('image/')) {
            imgs.push(file);
          }
        }
      }
      handleFiles(imgs);
    }
    document.documentElement.addEventListener('paste', pasteEvent);

    return () => {
      document.documentElement.removeEventListener('paste', pasteEvent);
    };
  }, [handleFiles]);

  async function exampleImgClick(
    e: React.MouseEvent<HTMLDivElement | HTMLImageElement, MouseEvent>
  ) {
    if (e.target instanceof HTMLImageElement) {
      const response = await fetch(e.target.src);
      const blob = await response.blob();
      const file = new File([blob], 'temp', { type: blob.type });
      handleFiles([file]);
    }
  }

  return (
    <>
      <div className="relative opacity-90 text-sm h-50 sm:h-50 md:h-60 xl:h-70 m-auto bg-black/2 rounded-lg border-2 border-dashed border-[#d9d9d9] hover:border-sky-500 transition-[border-color]">
        <input
          type="file"
          accept="image/*"
          multiple
          id={fileInputId}
          className="opacity-0 h-0"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-4 border-sky-500 border-t-black/10 border-r-black/10 rounded-full animate-spin"></div>
            <p className="text-sky-500 mt-4">
              {isDownloading
                ? 'Downloading AI model...'
                : 'Removing background...'}
            </p>
          </div>
        ) : (
          <label
            ref={dropRef}
            htmlFor={fileInputId}
            className="absolute inset-0 flex justify-center items-center cursor-pointer text-center"
          >
            <div>
              <img
                className="w-9 m-auto mb-2"
                src={uploadImg.src}
                // className="text-gray-500"
                alt="Select multiple images from your device, paste them from your clipboard, or drag and drop them onto the page."
              />
              <div className="text-sm sm:text-base">
                <p className="mt-2">Click to Pick</p>
                <p className="my-1">Drag & Drop</p>
                <p>Paste Image (Ctrl+V/Cmd+V)</p>
              </div>
            </div>
          </label>
        )}
      </div>
      <div className="my-4 block sm:flex items-center">
        <div className="text-center mb-2 sm:text-start text-sm sm:mr-8 xl:text-lg xl:mr-16">
          <p>Start Removing Backgrounds</p>
          <p>No image? Try one of these:</p>
        </div>
        <div
          className="flex flex-1 justify-around sm:justify-between"
          onClickCapture={exampleImgClick}
        >
          {children}
        </div>
      </div>
      {outOfMemory && (
        <div className="text-rose-600 border-2 border-dashed rounded-md px-4 py-2 text-center md:text-lg">
          ⚠️ Your device may struggle with this task. Try using a desktop for
          better results.
        </div>
      )}
      {imgSliders?.length && (
        <div>
          <div className="font-bold text-center my-4 text-md text-gray-900">
            Done! Time taken: {time}
          </div>
          <div className={imgSliders.length > 2 ? `md:columns-2 md:gap-6` : ''}>
            {imgSliders?.map(({ beforeSrc, afterSrc, afterFile }) => (
              <PreviewDownload
                className="break-inside-avoid mb-5"
                key={beforeSrc + afterSrc}
                beforeSrc={beforeSrc}
                afterSrc={afterSrc}
                afterFile={afterFile}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
