import { useState, useId, useEffect, useRef, useCallback } from 'react';
import { removeBackground } from '@imgly/background-removal';
import JSZip from 'jszip';
import FileSaver from 'file-saver';
import PreviewDownload from './PreviewDownload';

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
  const [imgSliders, setImgSliders] = useState<
    {
      beforeFile: Blob & { name: string };
      afterFile?: Blob & { name: string };
      status?: 'fulfilled' | 'rejected' | 'processing';
    }[]
  >();
  const [format, setFormat] = useState<
    'image/png' | 'image/jpeg' | 'image/webp'
  >('image/png');
  const dropRef = useRef<HTMLLabelElement>(null);
  const [time, setTime] = useState('');

  const handleFiles = useCallback(async (files?: FileList | File[] | null) => {
    if (!files?.length) return;

    const imgFiles = Array.from(files).filter((it) =>
      it.type.startsWith('image/')
    );

    if (!imgFiles?.length) return;
    setOutOfMemory(false);
    setImgSliders(
      imgFiles.map((file) => ({
        beforeFile: file,
      }))
    );
  }, []);

  const remove = useCallback(async () => {
    if (isLoading || !imgSliders?.length) return;

    const startTime = performance.now();
    setIsLoading(true);
    setOutOfMemory(false);
    const isMobile = /mobile/i.test(navigator.userAgent);
    // const result: Array<PromiseSettledResult<Blob>> = [];
    for (const item of imgSliders) {
      const { beforeFile: file } = item;
      try {
        item.status = 'processing';
        setImgSliders([...imgSliders]);
        const output = await removeBackground(file, {
          device: navigator.gpu ? 'gpu' : 'cpu',
          publicPath: `${location.origin}/ai-model/`,
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
          proxyToWorker: true,
          debug:
            import.meta.env.DEV ||
            !!new URLSearchParams(window.location.search).get('debug'),
          // fetchArgs: {
          //   mode: 'no-cors',
          // },
          output: {
            format,
            quality: 0.5,
          },
        });
        item.status = 'fulfilled';
        item.afterFile = output;
        output.name =
          file.name.replace(/\.\w+$/, '') +
          '_BgGone' +
          output.type.replace(/^\w+\//, '.');
      } catch (err) {
        console.error('Failed to process', file.name, err);
        item.status = 'rejected';
      }
    }
    console.log('result', imgSliders);
    const fulfilled = imgSliders.filter((it) => it.status === 'fulfilled');
    console.log('fulfilled', fulfilled);
    if (!fulfilled.length) {
      setOutOfMemory(true);
    }
    setImgSliders([...imgSliders]);
    setIsLoading(false);

    const duringTime = performance.now() - startTime;
    setTime(formatTime(duringTime));
  }, [isLoading, imgSliders, format]);

  useEffect(() => {
    const drop = dropRef.current;
    if (!drop) return;

    function dragOverEvent(e: DragEvent) {
      e.preventDefault();
      drop?.classList.add('drag-over');
    }

    function dragLeaveEvent(e: DragEvent) {
      e.preventDefault();
      drop?.classList.remove('drag-over');
    }

    function dropEvent(e: DragEvent) {
      e.preventDefault();
      drop?.classList.remove('drag-over');
      const files = e.dataTransfer?.files;
      handleFiles(files);
    }

    drop.addEventListener('dragover', dragOverEvent);
    drop.addEventListener('dragleave', dragLeaveEvent);
    drop.addEventListener('drop', dropEvent);

    return () => {
      drop.removeEventListener('dragover', dragOverEvent);
      drop.removeEventListener('dragleave', dragLeaveEvent);
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

  const [loadingImg, setLoadingImg] = useState(false);
  async function exampleImgClick(
    e: React.MouseEvent<HTMLDivElement | HTMLImageElement, MouseEvent>
  ) {
    if (e.target instanceof HTMLImageElement) {
      setLoadingImg(true);
      const response = await fetch(e.target.src);
      const blob = await response.blob();
      const file = new File([blob], e.target.alt, { type: blob.type });
      handleFiles([file]);
      setLoadingImg(false);
    }
  }

  const imgs = imgSliders
    ?.filter((it) => !!it.afterFile)
    ?.map((it) => it.afterFile);
  const isDone = !isLoading && !!imgs?.length;

  const downloadSingle = () => {
    if (!isDone) return;

    for (let file of imgs) {
      FileSaver.saveAs(file!, file!.name);
    }
  };

  const downloadAll = async () => {
    if (!isDone) return;

    try {
      const zip = new JSZip();
      imgs.forEach((file) => {
        zip.file(file!.name, file!);
      });
      const content = await zip.generateAsync({ type: 'blob' });
      FileSaver.saveAs(content, 'BgGone.zip');
    } catch (err) {
      console.error(err);
      alert('Failed to package images.');
    }
  };

  return (
    <>
      <div className="main-width">
        <div className="glass-effect relative text-sm h-48 xs:h-56 sm:h-60 md:h-64 lg:h-72 xl:h-80 3xl:h-96 h- m-auto transition-[border-color]">
          <input
            type="file"
            accept="image/*"
            multiple
            id={fileInputId}
            className="opacity-0 h-0"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {/* <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-4 border-sky-500 border-t-black/10 border-r-black/10 rounded-full animate-spin"></div>
            <p className="text-sky-500 mt-4">
              {isDownloading
                ? 'Downloading AI model...'
                : 'Removing background...'}
            </p>
          </div> */}
          <label
            ref={dropRef}
            htmlFor={fileInputId}
            className="drop-zone absolute inset-6 border-3 border-dashed border-black/10 dark:border-white/40 rounded-xl flex justify-center items-center cursor-pointer text-center"
          >
            <div>
              <svg
                className="w-10 h-10 m-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                ></path>
              </svg>
              <div className="text-sm sm:text-base">
                <p className="mt-2">Click</p>
                <p className="my-1">Drag & Drop</p>
                <p>Paste Image (Ctrl+V/Cmd+V)</p>
              </div>
            </div>
          </label>
        </div>
        <div className="my-4 block sm:flex items-center">
          <div className="text-center mb-2 sm:text-start text-sm sm:mr-8 xl:text-lg xl:mr-16">
            <p>Start Removing Backgrounds</p>
            <p>No image? Try one of these:</p>
          </div>
          <div
            className="relative flex flex-1 justify-around sm:justify-between"
            onClickCapture={exampleImgClick}
          >
            <div
              className={`absolute inset-0 bg-black/3 ${
                loadingImg ? 'flex' : 'hidden'
              } items-center justify-center`}
            >
              <div className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mb-2"></div>
            </div>
            {children}
          </div>
        </div>
      </div>
      {!!imgSliders?.length && (
        <div>
          <div className="glass-effect p-4 main-width">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-black/90 dark:text-white/90 flex items-center gap-4">
                <span className="font-semibold">
                  Selected: <span>{imgSliders?.length}</span>
                </span>
                <div className="flex items-center gap-2">
                  <label>Output format:</label>
                  <select
                    className="px-3 py-1 rounded-lg bg-white/20 border border-black/30"
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                  >
                    <option value="image/png">PNG</option>
                    {/* <option value="image/jpeg">JPEG</option> */}
                    <option value="image/webp">WebP</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  disabled={isLoading}
                  onClick={remove}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all transform hover:scale-105 shadow-lg"
                >
                  {isDownloading
                    ? 'Loading model...'
                    : isLoading
                    ? 'Removing...'
                    : 'Start'}
                </button>
                <button
                  disabled={isLoading}
                  onClick={() => setImgSliders([])}
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700 transition-all transform hover:scale-105"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
          <div className="main-width text-rose-600 rounded-md pt-2 pb-6 md:text-lg">
            {outOfMemory && (
              <span>
                ⚠️ Your device may struggle with this task. Try using a desktop
                for better results.
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mx-auto sm:w-lg md:w-2xl lg:w-4xl xl:w-5xl 2xl:w-6xl">
            {imgSliders?.map(({ beforeFile, afterFile, status }, index) => (
              <PreviewDownload
                className="break-inside-avoid mb-5 image-card border border-gray-200"
                key={beforeFile.name + (afterFile?.name || '')}
                beforeFile={beforeFile}
                afterFile={afterFile}
                processing={status === 'processing'}
                onClose={() =>
                  setImgSliders(imgSliders.filter((_, i) => i !== index))
                }
              />
            ))}
          </div>
          <div
            className={`main-width glass-effect p-6 mt-4 ${
              isDone ? 'block' : 'hidden'
            }`}
          >
            <div className="text-center">
              <h3 className="text-2xl font-semibold mb-4">
                🎉 Done! Time taken: {time}
              </h3>
              <div className="flex justify-center gap-4">
                <button
                  onClick={downloadSingle}
                  className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-semibold hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg"
                >
                  Download
                </button>
                <button
                  onClick={downloadAll}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all transform hover:scale-105 shadow-lg"
                >
                  Download All as ZIP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
