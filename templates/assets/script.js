/* eslint-disable */

function changeMediaSize(size) {
  document.getElementById('media').style.width = size
}

;(() => {
  const isMobile = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  if (isMobile()) return

  const previewTippy =
    [...document.getElementsByClassName('image-preview')]
      .map((v) => tippy(v, {
        content:
          `<img
              src="${v.getAttribute('data-media-url')}"
              alt="Image Preview"
              style="max-width: 300px; max-height: 300px;"
            />`
      }))

  const tooltipTippy =
    [...document.getElementsByClassName('tooltip')]
      .map((v) => tippy(v, {
        content: `<p class="tooltip-text">${v.getAttribute('data-tooltip')}</p>`,
      }))

  tippy.createSingleton([...previewTippy, ...tooltipTippy], {
    allowHTML: true,
    followCursor: true
  })
})()
