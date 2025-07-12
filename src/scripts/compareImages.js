const imgContainer = document.querySelector('#img-compare-slider');
const slider = imgContainer.querySelector('.slider');
const imgBefore = imgContainer.querySelector('.img-before');

imgContainer.addEventListener('touchmove', (e) => {
  const containerWidth = imgContainer.offsetWidth;
  const currentPoint = e.changedTouches[0].clientX;

  const startOfDiv = imgContainer.offsetLeft;

  const modifiedCurrentPoint = currentPoint - startOfDiv;

  // if (
  //   modifiedCurrentPoint > 10 &&
  //   modifiedCurrentPoint < beforeAfterContainer.offsetWidth - 10
  // ) {
  const leftPercent = (modifiedCurrentPoint * 100) / containerWidth;
  const rightPercent = 100 - leftPercent;

  imgBefore.setAttribute('style', `clip-path: inset(0 ${rightPercent}% 0 0);`);
  slider.setAttribute('style', 'left:' + leftPercent + '%;');
  // }
});

imgContainer.addEventListener('mousemove', (e) => {
  const containerWidth = imgContainer.offsetWidth;
  const leftPercent = (e.offsetX * 100) / containerWidth;
  const rightPercent = 100 - leftPercent;

  // if (e.offsetX > 10 && e.offsetX < containerWidth - 10) {
  imgBefore.setAttribute('style', `clip-path: inset(0 ${rightPercent}% 0 0);`);
  slider.setAttribute('style', 'left:' + leftPercent + '%;');
  // }
});
