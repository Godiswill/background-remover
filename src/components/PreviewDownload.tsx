import ImgCompareSlider from './ImgCompareSlider';

export interface IPreviewDownloadProps {
  beforeSrc: string;
  afterSrc: string;
  afterFile: Blob;
  className?: string;
}

export default function PreviewDownload({
  beforeSrc,
  afterSrc,
  afterFile,
  className,
}: IPreviewDownloadProps) {
  function preview() {
    window.open(afterSrc, '_blank');
  }

  async function copyFile() {
    const clipboardItem = new ClipboardItem({
      [afterFile.type]: afterFile,
    });
    await navigator.clipboard.write([clipboardItem]);
    console.log('good');
  }

  async function saveFile() {
    const a = document.createElement('a');
    a.href = afterSrc;
    a.download = 'download.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className={className}>
      <ImgCompareSlider beforeSrc={beforeSrc} afterSrc={afterSrc} />
      <div className="my-4 flex justify-between">
        <button
          onClick={preview}
          className="cursor-pointer inline-flex justify-center rounded-md text-sm/6 font-semibold text-gray-950 ring-1 ring-gray-950/10 hover:ring-gray-950/20 px-4 py-2"
        >
          Preview
        </button>
        <button
          onClick={copyFile}
          className="cursor-pointer inline-flex justify-center rounded-md bg-sky-600 px-4 py-2 text-sm/6∂ leading-5 font-semibold text-white hover:bg-sky-500  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
        >
          Copy
        </button>
        <button
          onClick={saveFile}
          className="cursor-pointer inline-flex justify-center rounded-md bg-sky-600 px-4 py-2 text-sm/6∂ leading-5 font-semibold text-white hover:bg-sky-700  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
        >
          Save
        </button>
      </div>
    </div>
  );
}
