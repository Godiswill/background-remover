window.dataLayer = window.dataLayer || [];
function gtag() {
  dataLayer.push(arguments);
}
gtag('js', new Date());

gtag('config', 'G-CZS9K7V64W');

const params = new URLSearchParams(window.location.search);

const isDebug = !!params.get('debug');
if (
  (isDebug || window.location.protocol !== 'https:') &&
  /mobile/i.test(navigator.userAgent)
) {
  const script = document.createElement('script');
  script.src = '/eruda.js';
  script.onload = () => eruda.init();
  document.body.appendChild(script);
}
