// Behaviour every page's window shares: the theme switch, the traffic lights and
// messages in the title bar. What minimizing means belongs to the page's file, so
// the window announces it ("unroll:minimize") and each page decides; a change of
// width is announced as "unroll:layout" for pages that measure themselves.
;(() => {
  const root = document.documentElement
  const win = document.querySelector('.window')
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

  document.getElementById('theme')?.addEventListener('click', () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : !matchMedia('(prefers-color-scheme: light)').matches
    const apply = () => {
      root.dataset.theme = dark ? 'light' : 'dark'
      try { localStorage.setItem('unroll-theme', root.dataset.theme) } catch {}
    }
    if (reduce || !document.startViewTransition) apply()
    else document.startViewTransition(apply)
  })

  const titlePath = document.getElementById('title-path')
  const resting = titlePath?.textContent ?? ''
  let pathTimer
  /** A passing message in the title bar, where the window shows its address. */
  function say(text) {
    if (!titlePath) return
    titlePath.textContent = text
    clearTimeout(pathTimer)
    pathTimer = setTimeout(() => { titlePath.textContent = resting }, 2600)
  }

  for (const light of document.querySelectorAll('.lights i')) light.addEventListener('click', () => {
    const kind = light.dataset.light
    if (kind === 'close') {
      if (!reduce) { win.classList.remove('nope'); void win.offsetWidth; win.classList.add('nope') }
      say('Nothing to save. Unroll never changes your files.')
    } else if (kind === 'min') dispatchEvent(new CustomEvent('unroll:minimize'))
    else if (kind === 'max') {
      win.classList.toggle('wide')
      dispatchEvent(new CustomEvent('unroll:layout'))
    }
  })
  win?.addEventListener('animationend', e => { if (e.animationName === 'nope') win.classList.remove('nope') })

  window.unrollWindow = { say }
})()
