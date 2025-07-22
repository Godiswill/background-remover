import { createPortal } from 'react-dom';
export default function ({
  isVisible,
  url,
  onClose,
}: {
  isVisible: boolean;
  url: string;
  onClose: () => void;
}) {
  return isVisible
    ? createPortal(
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-9999">
          <div className="relative max-w-7xl max-h-full p-4">
            <img src={url} alt="Preview | BgGone" className="w-full h-auto" />
            <button
              className="absolute top-5 right-5 w-10 h-10 bg-white/30 text-white rounded-full hover:bg-white/40 transition-all"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </div>,
        document.body
      )
    : null;
}
