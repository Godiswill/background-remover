import { useRef, useEffect } from 'react';

export default function ImgCompareSlider({
  beforeSrc,
  afterSrc,
}: {
  beforeSrc?: string;
  afterSrc?: string;
}) {
  const imgContainerRef = useRef<HTMLDivElement>(null);
  const imgBeforeRef = useRef<HTMLImageElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const imgContainer = imgContainerRef.current;
    const imgBefore = imgBeforeRef.current;
    const slider = sliderRef.current;

    if (!imgContainer || !imgBefore || !slider) return;

    function touchmoveEvent(e: TouchEvent) {
      if (!imgContainer || !imgBefore || !slider) return;

      const containerWidth = imgContainer.offsetWidth;
      const currentPoint = e.changedTouches[0].clientX;

      const startOfDiv = imgContainer.offsetLeft;

      const modifiedCurrentPoint = currentPoint - startOfDiv;

      const leftPercent = (modifiedCurrentPoint * 100) / containerWidth;
      const rightPercent = 100 - leftPercent;

      imgBefore.setAttribute(
        'style',
        `clip-path: inset(0 ${rightPercent}% 0 0);`
      );
      slider.setAttribute('style', 'left:' + leftPercent + '%;');
    }

    imgContainer.addEventListener('touchmove', touchmoveEvent, {
      passive: true,
    });

    function mousemoveEvent(e: MouseEvent) {
      if (!imgContainer || !imgBefore || !slider) return;

      const containerWidth = imgContainer.offsetWidth;
      const leftPercent = (e.offsetX * 100) / containerWidth;
      const rightPercent = 100 - leftPercent;

      // if (e.offsetX > 10 && e.offsetX < containerWidth - 10) {
      imgBefore.setAttribute(
        'style',
        `clip-path: inset(0 ${rightPercent}% 0 0);`
      );
      slider.setAttribute('style', 'left:' + leftPercent + '%;');
      // }
    }
    imgContainer.addEventListener('mousemove', mousemoveEvent);

    return () => {
      imgContainer.removeEventListener('touchmove', touchmoveEvent);
      imgContainer.removeEventListener('mousemove', mousemoveEvent);
    };
  }, []);

  return (
    <div
      className="relative cursor-grab overflow-hidden rounded-lg"
      ref={imgContainerRef}
    >
      <img
        className="w-full h-auto"
        style={{
          backgroundImage: `linear-gradient(45deg, #ccc 25%, transparent 25%),
                            linear-gradient(-45deg, #ccc 25%, transparent 25%),
                            linear-gradient(45deg, transparent 75%, #ccc 75%),
                            linear-gradient(-45deg, transparent 75%, #ccc 75%)`,
          backgroundSize: `20px 20px`,
          backgroundPosition: `0 0, 0 10px, 10px -10px, -10px 0px`,
        }}
        src={afterSrc}
        alt="After | BgGone - Free AI Background Remover"
      />
      <img
        ref={imgBeforeRef}
        className="w-full h-auto absolute top-0"
        src={beforeSrc}
        style={{ clipPath: `inset(0 50% 0 0)` }}
        alt="Before | BgGone - Free AI Background Remover"
      />
      <div
        ref={sliderRef}
        className="bg-white/20 backdrop-blur-md
            h-13 w-13 absolute left-1/2 top-1/2 ml-[-26px] mt-[-26px] border-2 border-white rounded-full 
            shadow-[0 0 10px rgb(12, 12, 12)] pointer-events-none 
            before:content-[' '] before:block before:w-0.5 before:bg-white before:h-[9999px] before:absolute before:left-1/2 before:ml-[-1px] before:bottom-1/2 before:mb-[26px] before:shadow-[0 0 10px rgb(12, 12, 12)]
            after:content-[' '] after:block after:w-0.5 after:bg-white after:h-[9999px] after:absolute after:left-1/2 after:ml-[-1px] after:top-1/2 after:mt-[26px] after:shadow-[0 0 5px rgb(12, 12, 12)]
        "
      >
        <span className="w-0 h-0 border-8 border-solid border-transparent absolute top-1/2 mt-[-8px] border-r-white left-1/2 ml-[-21px]"></span>
        <span className="w-0 h-0 border-8 border-solid border-transparent absolute top-1/2 mt-[-8px] border-l-white right-1/2 mr-[-21px]"></span>
      </div>
    </div>
  );
}
