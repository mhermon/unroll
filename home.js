// Unroll home page. The page is a trace: every section is a record, and the
// extension's keys, search, role filters, timeline and raw-record toggle work on
// it. The playground in line 3 is a small in-page reader for JSONL files; files
// people drop on it are read in this tab and never uploaded.
(() => {
  const $ = (s, r = document) => r.querySelector(s)
  const $$ = (s, r = document) => [...r.querySelectorAll(s)]
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

  const TOK = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}[\],:])/g
  function hl(src) {
    let out = '', last = 0
    src.replace(TOK, (m, str, colon, lit, num, p, idx) => {
      out += esc(src.slice(last, idx))
      if (str) out += colon ? `<span class="k">${esc(str)}</span><span class="p">${esc(colon)}</span>` : `<span class="s">${esc(str)}</span>`
      else if (lit) out += `<span class="l">${lit}</span>`
      else if (num) out += `<span class="n">${num}</span>`
      else out += `<span class="p">${esc(p)}</span>`
      last = idx + m.length
      return m
    })
    return out + esc(src.slice(last))
  }

  /* ---------------- the page as a trace ---------------- */

  const recs = $$('.rec')
  const lineOf = rec => recs.indexOf(rec) + 1
  const uuid = n => `a3c9${String(n).padStart(4, '0')}-5e21-4b8f-b0d2-7c41e9f3${String(n).padStart(4, '0')}`
  const callId = n => `toolu_01Unr${String(n).padStart(3, '0')}`

  function recordJSON(rec) {
    const i = lineOf(rec), role = rec.dataset.role
    const body = $('.body', rec)
    const clone = body.cloneNode(true)
    $$('.call, .pg, video, .chapters, .back-link, .reasoning, .shot, .actions', clone).forEach(n => n.remove())
    const text = clone.textContent.replace(/\s+/g, ' ').trim()
    const content = []
    const thought = $('.reasoning p', body)
    if (thought) content.push({ type: 'thinking', thinking: thought.textContent.trim() })
    if (role === 'tool') {
      const from = Number(($('.back-link', body)?.getAttribute('href') || '').replace('#r', ''))
      content.push({ type: 'tool_result', tool_use_id: from ? callId(from) : undefined, content: $('.pg', body) ? `${text} [interactive viewer]` : text })
    } else {
      if (text) content.push({ type: 'text', text })
      for (const c of $$('.call[data-name]', body)) {
        let input = {}
        try { input = JSON.parse(c.dataset.input) } catch {}
        content.push({ type: 'tool_use', id: callId(i), name: c.dataset.name, input })
      }
    }
    const kind = role === 'tool' ? 'user' : role
    const message = { role: kind, content: role === 'user' && content.length === 1 ? content[0].text : content }
    if (role === 'assistant') message.model = 'claude-sonnet-5'
    return JSON.stringify({
      parentUuid: i > 1 ? uuid(i - 1) : null,
      type: kind,
      message,
      uuid: uuid(i),
      timestamp: `2026-09-23T${$('time', rec).textContent.replace('Z', '.000Z')}`,
    }, null, 2)
  }

  function addActs(rec) {
    const acts = document.createElement('div')
    acts.className = 'acts'
    acts.innerHTML = `<button type="button" data-act="raw" aria-pressed="false" title="Show the raw record (R)">Record</button><button type="button" data-act="copy" title="Copy the record">Copy</button><button type="button" data-act="link" title="Copy a link to this line">Link</button>`
    $('.meta', rec).append(acts)
    rec.tabIndex = -1
  }
  recs.forEach(addActs)

  function toggleRaw(rec, force) {
    const on = force ?? !rec.classList.contains('raw')
    let box = $('.rawbox', rec)
    if (on && !box) {
      box = document.createElement('pre')
      box.className = 'rawbox'
      box.innerHTML = hl(recordJSON(rec))
      $('.body', rec).after(box)
    }
    rec.classList.toggle('raw', on)
    $('[data-act="raw"]', rec).setAttribute('aria-pressed', String(on))
    measureRail()
  }

  async function copy(text, button) {
    try {
      await navigator.clipboard.writeText(text)
      const was = button.textContent
      button.textContent = 'Copied'
      setTimeout(() => { button.textContent = was }, 1200)
    } catch {}
  }

  document.addEventListener('click', e => {
    const act = e.target.closest('.acts button')
    if (act) {
      const rec = act.closest('.rec')
      select(rec, { scroll: false })
      if (act.dataset.act === 'raw') toggleRaw(rec)
      else if (act.dataset.act === 'link') {
        history.replaceState(null, '', `#L${lineOf(rec)}`)
        copy(location.href, act)
      } else copy(recordJSON(rec), act)
      return
    }
    const cp = e.target.closest('[data-copy]')
    if (cp) { copy(cp.dataset.copy, cp); return }
    const jump = e.target.closest('.result-link, .back-link, .activity a, a[href^="#r"]')
    if (jump && jump.hash && /^#r\d+$/.test(jump.hash)) {
      const rec = $(jump.hash)
      if (!rec) return
      e.preventDefault()
      if (rec.hidden) clearFilters()
      select(rec, { flash: true })
      history.replaceState(null, '', jump.hash)
      return
    }
    const rec = e.target.closest('.rec')
    if (rec && !e.target.closest('a, button, input, label, summary, video, .pg')) select(rec, { scroll: false })
  })

  /* selection & navigation */
  let selected = null
  const visible = () => recs.filter(r => !r.hidden)

  function select(rec, { scroll = true, flash = false } = {}) {
    if (!rec) return
    if (selected) selected.classList.remove('selected')
    selected = rec
    rec.classList.add('selected')
    if (scroll) rec.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    if (flash && !reduce) {
      rec.classList.remove('flash')
      void rec.offsetWidth
      rec.classList.add('flash')
    }
    rec.focus({ preventScroll: true })
    updateStatus()
  }

  function topRecord() {
    const line = innerHeight * 0.3
    let best = visible()[0]
    for (const r of visible()) {
      if (r.getBoundingClientRect().top <= line) best = r
      else break
    }
    return best
  }

  function anchor() {
    if (selected && !selected.hidden) {
      const b = selected.getBoundingClientRect()
      if (b.bottom > 0 && b.top < innerHeight) return selected
    }
    return topRecord()
  }

  function step(dir, pred = () => true) {
    const list = visible()
    const from = list.indexOf(anchor())
    for (let i = from + dir; i >= 0 && i < list.length; i += dir) {
      if (pred(list[i])) return select(list[i])
    }
  }
  const hasCall = r => !!$('.call[data-name]:not(.bash)', r)
  function follow() { const list = visible(); select(list[list.length - 1], { flash: true }) }

  $$('.statusbar [data-nav]').forEach(b => b.addEventListener('click', () => {
    const list = visible()
    ;({
      first: () => select(list[0]),
      last: () => select(list[list.length - 1]),
      prev: () => step(-1),
      next: () => step(1),
      follow,
    })[b.dataset.nav]()
  }))

  /* help dialog */
  const help = $('#help')
  $$('[data-help]').forEach(b => b.addEventListener('click', () => help.showModal()))

  /* keyboard */
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 's') { e.preventDefault(); savePage(); return }
    if (e.metaKey || e.ctrlKey || e.altKey) return
    const t = e.target
    const typing = t.matches?.('input:not([type=range]):not([type=file]), textarea, select, [contenteditable]')
    if (e.key === 'Escape') {
      if (help.open) return
      if (q.value || roleFilter !== 'all') { clearFilters(); q.blur(); e.preventDefault() }
      else if (typing) t.blur()
      return
    }
    if (typing) return
    if (help.open) return
    const k = e.shiftKey && /^[a-z]$/.test(e.key) ? e.key.toUpperCase() : e.key
    const actions = {
      j: () => step(1), k: () => step(-1),
      n: () => step(1, hasCall), p: () => step(-1, hasCall),
      r: () => { const r = anchor(); select(r, { scroll: false }); toggleRaw(r) },
      f: follow, F: follow,
      g: () => select(visible()[0]), G: () => select(visible().at(-1)),
      J: () => rowStep(1), K: () => rowStep(-1),
      '/': () => q.focus(), '?': () => help.showModal(),
      u: () => setMode(mode === 'raw' ? 'unrolled' : 'raw'),
      Enter: () => { if (mode === 'raw' && selected) openLine(selected) },
    }
    if (k === 'Enter' && t.closest?.('a, button, summary, input, video, .pg')) return
    if (mode === 'raw' && ['/', 'r', 'R', 'n', 'N', 'p', 'P'].includes(k)) {
      if (k === '/') { e.preventDefault(); toast('Search works on the unrolled view. Press U to unroll.') }
      return
    }
    const fn = actions[k] || (e.shiftKey ? null : actions[k.toLowerCase()])
    if (!fn || (t.closest?.('.pg') && ['ArrowLeft', 'ArrowRight'].includes(k))) return
    e.preventDefault()
    if (mode === 'raw') stopCountdown()
    fn()
  })

  /* role filter & search */
  const q = $('#q')
  const qHint = $('#q-hint')
  let roleFilter = 'all'
  let query = ''

  function clearMarks() {
    for (const m of $$('mark.hit')) {
      const p = m.parentNode
      p.replaceChild(document.createTextNode(m.textContent), m)
      p.normalize()
    }
  }
  function markIn(rec, needle) {
    let found = 0
    const walker = document.createTreeWalker($('.body', rec), NodeFilter.SHOW_TEXT, {
      acceptNode: n => n.parentElement.closest('.pg, script, style, .acts') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    })
    const nodes = []
    while (walker.nextNode()) nodes.push(walker.currentNode)
    for (const node of nodes) {
      const text = node.nodeValue, lower = text.toLowerCase()
      let at = lower.indexOf(needle)
      if (at < 0) continue
      const frag = document.createDocumentFragment()
      let last = 0
      while (at >= 0) {
        frag.append(text.slice(last, at))
        const m = document.createElement('mark')
        m.className = 'hit'
        m.textContent = text.slice(at, at + needle.length)
        frag.append(m)
        found++
        last = at + needle.length
        at = lower.indexOf(needle, last)
      }
      frag.append(text.slice(last))
      node.replaceWith(frag)
    }
    // Tool names and call arguments count even when they live in attributes.
    if (!found && $$('.call[data-name]', rec).some(c => (c.dataset.name + c.dataset.input).toLowerCase().includes(needle))) found = 1
    return found
  }

  function applyFilters() {
    clearMarks()
    const needle = query.trim().toLowerCase()
    let hits = 0, shown = 0
    for (const rec of recs) {
      const roleOk = roleFilter === 'all' || rec.dataset.role === roleFilter
      let match = true
      if (needle.length >= 2 && roleOk) { const n = markIn(rec, needle); match = n > 0; hits += n }
      rec.hidden = !(roleOk && match)
      if (!rec.hidden) shown++
    }
    qHint.textContent = needle.length >= 2 ? (hits ? `${hits} match${hits === 1 ? '' : 'es'} in ${shown}` : 'No matches') : '/'
    $('#sb-loaded').textContent = `${shown} loaded`
    railButtons.forEach((b, i) => {
      b.classList.toggle('dim', recs[i].hidden)
      b.classList.toggle('hit', needle.length >= 2 && !recs[i].hidden)
    })
    measureRail()
    updateStatus()
  }
  function clearFilters() {
    q.value = ''; query = ''; roleFilter = 'all'
    $$('.roles button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.role === 'all')))
    applyFilters()
  }
  let qTimer
  q.addEventListener('input', () => {
    clearTimeout(qTimer)
    qTimer = setTimeout(() => {
      query = q.value
      applyFilters()
      const first = visible()[0]
      if (query.trim().length >= 2 && first) first.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    }, 140)
  })
  q.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); const first = visible()[0]; if (first) { q.blur(); select(first, { flash: true }) } }
  })
  $$('.roles button').forEach(b => b.addEventListener('click', () => {
    roleFilter = b.dataset.role
    $$('.roles button').forEach(x => x.setAttribute('aria-pressed', String(x === b)))
    applyFilters()
    const first = visible()[0]
    if (first && first.getBoundingClientRect().top < 0) first.scrollIntoView({ block: 'start' })
  }))

  /* timeline rail */
  const rail = $('#rail'), peek = $('#peek')
  const railButtons = []
  function railButton(rec) {
    const b = document.createElement('button')
    b.type = 'button'
    b.style.setProperty('--r', `var(--role-${rec.dataset.role})`)
    b.setAttribute('aria-label', `Line ${lineOf(rec)}, ${rec.dataset.role}: ${rec.dataset.title}`)
    b.addEventListener('click', () => { if (rec.hidden) clearFilters(); select(rec, { flash: true }) })
    b.addEventListener('pointerenter', () => {
      if (mode === 'raw') return
      peek.innerHTML = `<span class="r" style="color:var(--role-${rec.dataset.role})">${rec.dataset.role} · L${lineOf(rec)}</span><strong>${esc(rec.dataset.title)}</strong>`
      peek.hidden = false
      const rr = rail.parentElement.getBoundingClientRect(), br = b.getBoundingClientRect()
      peek.style.top = `${Math.max(0, br.top - rr.top + br.height / 2 - 26)}px`
    })
    b.addEventListener('pointerleave', () => { peek.hidden = true })
    rail.append(b)
    railButtons.push(b)
    rec.addEventListener('pointerenter', () => b.classList.add('hot'))
    rec.addEventListener('pointerleave', () => b.classList.remove('hot'))
  }
  recs.forEach(railButton)
  // Drag along the rail to scrub through the page, as in the extension.
  rail.addEventListener('pointerdown', e => {
    if (e.button !== 0 || mode === 'raw') return
    e.preventDefault()
    let last = null
    const scrub = ev => {
      const b = document.elementFromPoint(rail.getBoundingClientRect().left + 8, ev.clientY)?.closest('.rail-track button')
      if (!b || b === last) return
      last = b
      const rec = recs[railButtons.indexOf(b)]
      if (rec && !rec.hidden) select(rec, { scroll: false }), rec.scrollIntoView({ block: 'start' })
    }
    const end = () => { removeEventListener('pointermove', scrub); removeEventListener('pointerup', end); rail.classList.remove('scrubbing') }
    rail.classList.add('scrubbing')
    addEventListener('pointermove', scrub)
    addEventListener('pointerup', end)
  })
  function measureRail() {
    recs.forEach((rec, i) => { railButtons[i].style.flexGrow = rec.hidden ? .6 : Math.max(1, Math.sqrt(rec.offsetHeight) / 6) })
  }
  $('#rail-last').textContent = recs.length

  // Hovering a call or result link lights up the record at the other end.
  document.addEventListener('pointerover', e => {
    const a = e.target.closest('.result-link, .back-link')
    if (!a) return
    const rec = $(a.hash)
    if (!rec) return
    rec.classList.add('linked')
    railButtons[recs.indexOf(rec)]?.classList.add('hot')
    a.addEventListener('pointerleave', () => { rec.classList.remove('linked'); railButtons[recs.indexOf(rec)]?.classList.remove('hot') }, { once: true })
  })

  /* status, activity bar, tokens-in-view */
  const textLen = new Map(recs.map(r => [r, r.textContent.replace(/\s+/g, ' ').length]))
  const actLinks = $$('.activity a[href^="#r"]')
  const tokensEl = $('#tokens'), lineEl = $('#sb-line')
  function updateStatus() {
    const top = selected && !selected.hidden && (() => { const b = selected.getBoundingClientRect(); return b.bottom > 0 && b.top < innerHeight })() ? selected : topRecord()
    if (top) lineEl.textContent = `Line ${lineOf(top)}`
    let chars = 0
    recs.forEach((rec, i) => {
      const b = rec.getBoundingClientRect()
      const inView = !rec.hidden && b.bottom > 0 && b.top < innerHeight
      railButtons[i].setAttribute('aria-current', String(inView))
      if (inView) chars += textLen.get(rec)
    })
    tokensEl.textContent = Math.round(chars / 4).toLocaleString('en-US')
    const topLine = top ? lineOf(top) : 1
    let current = actLinks[0]
    for (const a of actLinks) if (Number(a.hash.slice(2)) <= topLine) current = a
    actLinks.forEach(a => a.setAttribute('aria-current', String(a === current)))
  }
  let ticking = false
  addEventListener('scroll', () => {
    if (ticking) return
    ticking = true
    requestAnimationFrame(() => { ticking = false; updateStatus() })
  }, { passive: true })
  addEventListener('resize', () => { measureRail(); updateStatus() })


  /* the headline word unrolls */
  const word = $('#unroll-word')
  word.setAttribute('aria-label', word.textContent)
  word.innerHTML = [...word.textContent].map((c, i) => `<span class="ch" aria-hidden="true" style="--i:${i}">${esc(c)}</span>`).join('')

  /* raw first: the page opens as its own JSONL, then unrolls */
  const root = document.documentElement
  const live = $('#live'), cta = $('#unroll-cta'), ctaGo = $('#unroll-go')
  const modeButtons = $$('.mode button')
  const tools = $('#tools')
  const compact = rec => JSON.stringify(JSON.parse(recordJSON(rec)))
  function rawLine(rec) {
    const line = document.createElement('div')
    line.className = 'rawline'
    line.title = 'Unroll this line'
    line.innerHTML = `<span class="num">${lineOf(rec)}</span><span class="src">${hl(compact(rec))}</span>`
    rec.prepend(line)
  }
  recs.forEach(rawLine)
  const toastEl = $('#sb-toast')
  let toastTimer
  function toast(text) {
    toastEl.textContent = text
    toastEl.classList.add('on')
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => toastEl.classList.remove('on'), 4200)
  }
  let mode = 'unrolled', countdown = true

  function replay(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls) }
  function stopCountdown() {
    if (!countdown) return
    countdown = false
    cta.classList.add('waiting')
  }
  function setMode(next, { animate = !reduce } = {}) {
    if (next === mode) return
    const pin = anchor(), before = pin?.getBoundingClientRect().top
    if (next === 'raw') { clearFilters(); peek.hidden = true }
    tools.inert = next === 'raw'
    mode = next
    const t0 = performance.now()
    root.classList.toggle('rawmode', next === 'raw')
    void document.body.offsetHeight
    const ms = performance.now() - t0
    cta.hidden = next !== 'raw'
    modeButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === next)))
    recs.forEach(r => r.classList.remove('open', 'unfurl', 'rollin'))
    if (pin && scrollY > 0) scrollBy(0, pin.getBoundingClientRect().top - before)
    if (animate) {
      const near = recs.filter(r => { if (r.hidden) return false; const b = r.getBoundingClientRect(); return b.bottom > -100 && b.top < innerHeight + 100 })
      const gap = next === 'raw' ? 14 : 34
      near.forEach((r, i) => { r.style.setProperty('--d', `${i * gap}ms`); replay(r, next === 'raw' ? 'rollin' : 'unfurl') })
      if (next === 'unrolled') {
        live.hidden = false
        setTimeout(() => { live.hidden = true }, near.length * gap + 600)
      }
    }
    if (next === 'unrolled') {
      // The raw opening is a first-visit moment; returning visitors start reading.
      try { localStorage.setItem('unroll-seen', '1') } catch {}
      replay(word, 'go')
      toast(`Unrolled ${visible().length} records in ${ms < 10 ? ms.toFixed(1) : Math.round(ms)} ms`)
    }
    measureRail()
    updateStatus()
  }
  function openLine(rec) {
    rec.classList.add('open')
    if (!reduce) { rec.style.setProperty('--d', '0ms'); replay(rec, 'unfurl') }
    if (rec.id === 'r2') replay(word, 'go')
    measureRail()
  }
  const settle = r => r.addEventListener('animationend', e => { if (e.target === r) r.classList.remove('unfurl', 'rollin', 'append') })
  recs.forEach(settle)
  modeButtons.forEach(b => b.addEventListener('click', () => { stopCountdown(); setMode(b.dataset.mode) }))
  ctaGo.addEventListener('click', () => setMode('unrolled'))
  ctaGo.addEventListener('animationend', e => { if (e.animationName === 'countdown' && countdown && mode === 'raw') setMode('unrolled') })
  document.addEventListener('click', e => {
    const line = e.target.closest('.rawline')
    if (line) { stopCountdown(); const rec = line.closest('.rec'); select(rec, { scroll: false }); openLine(rec) }
  })
  // Trying to read the raw opening unrolls it: a visitor who scrolls wants the page,
  // not escaped JSON. Once someone opens a raw line or picks Raw, scrolling stays raw.
  const readOn = () => { if (mode === 'raw' && countdown) { stopCountdown(); setMode('unrolled') } }
  for (const ev of ['wheel', 'touchmove']) addEventListener(ev, readOn, { passive: true })
  addEventListener('keydown', e => { if ([' ', 'PageDown', 'ArrowDown', 'End'].includes(e.key) && !e.target.closest?.('input, textarea, select, button')) readOn() })
  cta.addEventListener('pointerenter', stopCountdown)

  if (root.classList.contains('start-raw')) setMode('raw', { animate: false })
  else if (!reduce) word.classList.add('go')
  root.classList.remove('start-raw')
  if (mode === 'raw' && !reduce) {
    // Type the file in, line by line, like a log being written.
    recs.forEach((r, i) => { r.style.setProperty('--d', `${i * 18}ms`); r.classList.add('rollin') })
  }
  if (reduce) stopCountdown()

  /* walkthrough chapters */
  ;(() => {
    const video = $('#r15 video')
    const buttons = $$('.chapters button')
    if (!video) return
    const seek = t => { video.currentTime = t; video.play().catch(() => {}) }
    buttons.forEach(b => b.addEventListener('click', () => {
      const t = Number(b.dataset.t)
      if (video.readyState >= 1) seek(t)
      else { video.addEventListener('loadedmetadata', () => seek(t), { once: true }); video.load() }
    }))
    video.addEventListener('timeupdate', () => {
      let active = null
      for (const b of buttons) if (video.currentTime >= Number(b.dataset.t) - .05) active = b
      buttons.forEach(b => b.setAttribute('aria-current', String(b === active)))
    })
  })()

  /* ---------------- playground: a small reader in the page ---------------- */

  const pg = $('#pg'), list = $('#pg-list'), range = $('#pg-range'), count = $('#pg-count')
  const playBtn = $('#pg-play'), pgRail = $('#pg-rail'), rowBar = $('#pg-row'), note = $('#pg-note'), drop = $('#pg-drop')
  const pgTime = $('#pg-time'), liveBtn = $('#pg-live'), jumpForm = $('#pg-jump'), jumpInput = $('#pg-jump-line')
  const formatSelect = $('#pg-format'), formatTab = $('#pg-format-tab'), stressTab = $('#pg-stress')
  const DEFAULT_NOTE = note.innerHTML
  const cache = new Map()
  const ROW_KEYS = ['messages', 'conversations', 'conversation', 'trajectory', 'history', 'chat']
  const LC = { human: 'user', ai: 'assistant', system: 'system', tool: 'tool', function: 'tool' }
  // Past this many records, only a window is rendered, the way the extension reads what you scroll to.
  const BIG = 400, WINDOW = 150
  const S = { items: [], k: 0, rows: null, row: 0, timer: null, start: 0, live: null, file: '' }
  const big = () => S.items.length > BIG
  const num = n => n.toLocaleString('en-US')
  const fmtMs = ms => ms < 1 ? `${ms.toFixed(2)} ms` : ms < 10 ? `${ms.toFixed(1)} ms` : `${num(Math.round(ms))} ms`
  const fmtBytes = b => b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`

  const flat = c => c == null ? '' : typeof c === 'string' ? c
    : Array.isArray(c) ? c.map(x => typeof x === 'string' ? x : x?.text ?? JSON.stringify(x)).join('\n')
    : typeof c === 'object' && c.type && 'value' in c ? flat(c.value)
    : JSON.stringify(c, null, 2)

  function parseText(text) {
    text = text.replace(/^\uFEFF/, '')
    const t = text.trim()
    let lines = []
    if (t.startsWith('[') || (t.startsWith('{') && !/\}\s*\n\s*\{/.test(t))) {
      try {
        const v = JSON.parse(t)
        lines = Array.isArray(v) ? v.map((o, i) => ({ n: i + 1, obj: o, src: JSON.stringify(o) })) : [{ n: 1, obj: v, src: JSON.stringify(v) }]
      } catch {}
    }
    if (!lines.length) {
      const raw = text.split('\n')
      for (let i = 0; i < raw.length; i++) {
        const src = raw[i].endsWith('\r') ? raw[i].slice(0, -1) : raw[i]
        if (!src.trim()) continue
        let obj = null
        try { obj = JSON.parse(src) } catch {}
        lines.push({ n: i + 1, obj, src })
      }
    }
    return lines
  }

  const rowKey = o => o && typeof o === 'object' && !Array.isArray(o) ? ROW_KEYS.find(k => Array.isArray(o[k]) && o[k].length && typeof o[k][0] === 'object') : null

  function norm(o) {
    if (!o || typeof o !== 'object') return { role: 'event', blocks: [{ k: 'raw' }] }
    const ts = o.timestamp || o.created_at || o.time
    let m = o
    if (o.message && typeof o.message === 'object') m = o.message
    else if (o.payload && typeof o.payload === 'object') m = o.payload
    else if (o.data && typeof o.data === 'object' && LC[o.type]) m = o.data
    let role = m.role
      || (m.from ? ({ human: 'user', gpt: 'assistant', system: 'system', tool: 'tool', observation: 'tool', function_call: 'assistant' }[m.from] || m.from) : null)
      || LC[o.type] || LC[m.type] || null
    if (role === 'model' || role === 'ai') role = 'assistant'
    if (role === 'human') role = 'user'
    const blocks = []
    const push = c => {
      if (c == null) return
      if (typeof c === 'string') { if (c.trim()) blocks.push({ k: 'text', text: c }); return }
      if (!Array.isArray(c)) { if (c.text) blocks.push({ k: 'text', text: c.text }); return }
      for (const b of c) {
        if (typeof b === 'string') { blocks.push({ k: 'text', text: b }); continue }
        const t = b?.type
        if (t === 'text' || t === 'input_text' || t === 'output_text') blocks.push({ k: 'text', text: b.text || '' })
        else if (t === 'thinking' || t === 'reasoning') blocks.push({ k: 'think', text: b.thinking || b.text || b.reasoning || '' })
        else if (t === 'tool_use' || t === 'tool-call' || t === 'tool_call') blocks.push({ k: 'call', name: b.name || b.toolName, input: b.input ?? b.args, id: b.id || b.toolCallId })
        else if (t === 'tool_result' || t === 'tool-result') blocks.push({ k: 'result', id: b.tool_use_id || b.toolCallId, name: b.toolName, text: flat(b.content ?? b.result ?? b.output), err: !!b.is_error })
        else blocks.push({ k: 'text', text: b?.text || JSON.stringify(b) })
      }
    }
    push(m.content ?? m.value ?? (typeof m.text === 'string' ? m.text : null))
    if (Array.isArray(m.parts)) for (const p of m.parts) {
      if (p.text) blocks.push({ k: p.thought ? 'think' : 'text', text: p.text })
      if (p.functionCall) blocks.push({ k: 'call', name: p.functionCall.name, input: p.functionCall.args })
      if (p.functionResponse) blocks.push({ k: 'result', name: p.functionResponse.name, text: flat(p.functionResponse.response) })
    }
    if (Array.isArray(m.tool_calls)) for (const tc of m.tool_calls) {
      const f = tc.function || tc
      let a = f.arguments ?? f.args
      if (typeof a === 'string') { try { a = JSON.parse(a) } catch {} }
      blocks.push({ k: 'call', name: f.name, input: a, id: tc.id })
    }
    if (m.type === 'reasoning') {
      role = 'assistant'
      const text = (m.summary || []).map(x => x.text).join('\n')
      if (text) blocks.push({ k: 'think', text: text.replace(/\*\*/g, '') })
    }
    if (m.type === 'function_call') {
      role = 'assistant'
      let a = m.arguments
      try { a = JSON.parse(a) } catch {}
      blocks.push({ k: 'call', name: m.name, input: a, id: m.call_id })
    }
    if (m.type === 'function_call_output') {
      role = 'tool'
      let text = m.output, err = false
      try { const v = JSON.parse(text); if (typeof v?.output === 'string') { text = v.output; err = !!v.metadata?.exit_code } } catch {}
      blocks.push({ k: 'result', id: m.call_id, text: flat(text), err })
    }
    if (role === 'tool' || role === 'function') {
      role = 'tool'
      if (!blocks.some(b => b.k === 'result')) {
        const text = blocks.filter(b => b.k === 'text').map(b => b.text).join('\n')
        blocks.length = 0
        blocks.push({ k: 'result', id: m.tool_call_id, name: m.name, text })
      }
    }
    if (blocks.length && blocks.every(b => b.k === 'result')) role = 'tool'
    if (!role || !blocks.length) return { role: role && blocks.length ? role : 'event', ts, blocks: blocks.length ? blocks : [{ k: 'raw' }] }
    return { role, ts, blocks }
  }

  function link(items) {
    // Formats without call IDs (Gemini) pair a call with the next result of the same name.
    const pending = new Map()
    items.forEach((it, i) => it.blocks.forEach(b => {
      if (b.k === 'call' && !b.id && b.name) { b.id = `~${i}`; if (!pending.has(b.name)) pending.set(b.name, []); pending.get(b.name).push(b.id) }
      if (b.k === 'result' && !b.id && b.name) b.id = pending.get(b.name)?.shift()
    }))
    const callAt = new Map(), resAt = new Map()
    items.forEach((it, i) => it.blocks.forEach(b => {
      if (b.k === 'call' && b.id) callAt.set(b.id, i)
      if (b.k === 'result' && b.id) resAt.set(b.id, i)
    }))
    items.forEach(it => it.blocks.forEach(b => {
      if (b.k === 'call' && resAt.has(b.id)) b.to = resAt.get(b.id)
      if (b.k === 'result' && callAt.has(b.id)) {
        b.from = callAt.get(b.id)
        b.name ||= items[b.from].blocks.find(x => x.k === 'call' && x.id === b.id)?.name
      }
    }))
    return items
  }

  function inl(s) {
    return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  }
  function md(src) {
    let html = ''
    src.split('```').forEach((part, i) => {
      if (i % 2) {
        const nl = part.indexOf('\n')
        html += `<pre><code>${esc((nl >= 0 ? part.slice(nl + 1) : part).replace(/\n$/, ''))}</code></pre>`
        return
      }
      let para = [], items = null, table = null
      const flushP = () => { if (para.length) { html += `<p>${inl(para.join(' '))}</p>`; para = [] } }
      const flushL = () => { if (items) { html += `<ul>${items.map(x => `<li>${inl(x)}</li>`).join('')}</ul>`; items = null } }
      const flushT = () => {
        if (!table) return
        const rows = table.filter(r => !/^\s*\|?\s*:?-{2,}/.test(r)).map(r => r.replace(/^\s*\||\|\s*$/g, '').split('|').map(c => c.trim()))
        html += `<table>${rows.map((r, ri) => `<tr>${r.map(c => ri ? `<td>${inl(c)}</td>` : `<th>${inl(c)}</th>`).join('')}</tr>`).join('')}</table>`
        table = null
      }
      for (const line of part.split('\n')) {
        if (/^\s*\|.*\|\s*$/.test(line)) { flushP(); flushL(); (table ||= []).push(line); continue }
        flushT()
        const h = line.match(/^#{1,6}\s+(.*)/)
        if (h) { flushP(); flushL(); html += `<h4>${inl(h[1])}</h4>`; continue }
        const li = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*)/)
        if (li) { flushP(); (items ||= []).push(li[1]); continue }
        if (!line.trim()) { flushP(); flushL(); continue }
        flushL()
        para.push(line)
      }
      flushP(); flushL(); flushT()
    })
    return html
  }

  const clip = (s, n) => s.length > n ? `${s.slice(0, n)}…` : s
  function args(input) {
    if (input == null) return ''
    if (typeof input !== 'object') return esc(clip(String(input), 160))
    const parts = Object.entries(input).map(([k, v]) => `<span class="k">"${esc(k)}"</span>: ${esc(clip(JSON.stringify(v), 90))}`)
    return `{ ${parts.join(', ')} }`
  }
  const where = it => S.rows ? `#${it.sub}` : `line ${num(it.n)}`
  const stamp = ts => {
    if (!ts) return ''
    const m = String(ts).match(/T(\d\d:\d\d:\d\d)/)
    return m ? `${m[1]}Z` : ''
  }

  function cardHTML(it, i) {
    const c = it.blocks.map(b => {
      if (b.k === 'text') return md(b.text)
      if (b.k === 'think') return `<details class="think"><summary>reasoning · ${b.text.split(/\s+/).filter(Boolean).length} words</summary><p>${esc(b.text)}</p></details>`
      if (b.k === 'call') return `<div class="tc">▸ <b>${esc(b.name || 'call')}</b> <span class="a">${args(b.input)}</span></div>${b.to != null ? `<button type="button" class="lnk" data-go="${b.to}">→ result at ${where(S.items[b.to])}</button>` : ''}`
      if (b.k === 'result') return `${b.from != null ? `<button type="button" class="from" data-go="${b.from}">↳ ${esc(b.name || 'call')} · ${where(S.items[b.from])}</button>` : ''}${b.err ? '<span class="err">error</span>' : ''}<pre class="out">${esc(clip(b.text || '(empty)', 2400))}</pre>`
      return `<pre class="out">${hl(clip(it.src, 1600))}</pre>`
    }).join('')
    return `<div class="pg-card" data-i="${i}"><div class="m"><b>${esc(it.role)}</b><span>▾ ${S.rows ? `#${it.sub}` : `L${num(it.n)}`}</span><span>${stamp(it.ts)}</span></div><div class="c">${c}</div></div>`
  }
  const rawHTML = it => `<div class="pg-raw"><span class="num">${S.rows ? it.sub : it.n}</span><span class="txt">${hl(clip(it.src, 600))}</span></div>`
  const liFor = i => list.querySelector(`li[data-i="${i}"]`)
  const inWindow = i => i >= S.start && i < S.start + (big() ? WINDOW : Infinity)

  function renderItem(i, animate) {
    const li = liFor(i)
    if (!li) return
    li.innerHTML = i < S.k ? cardHTML(S.items[i], i) : rawHTML(S.items[i])
    if (animate && i < S.k && !reduce) $('.pg-card', li).classList.add('unfurl')
  }

  /* The playground's own timeline: one tick per record, or buckets for big files. */
  function buildRail() {
    const n = S.items.length, B = Math.min(n, 200)
    S.buckets = B
    pgRail.innerHTML = Array.from({ length: B }, (_, b) => `<i data-b="${b}" style="--r:var(--role-${S.items[Math.floor(b * n / B)].role})"></i>`).join('')
    paintRail()
  }
  function paintRail() {
    const n = S.items.length, B = S.buckets
    ;[...pgRail.children].forEach((el, b) => {
      const i = Math.floor(b * n / B)
      el.classList.toggle('on', i < S.k)
      el.classList.toggle('win', big() && i >= S.start && i < S.start + WINDOW)
    })
    pgRail.parentElement.classList.toggle('big', big())
  }
  pgRail.addEventListener('click', e => {
    const b = e.target.closest('i')
    if (!b || !big()) return
    setWindow(Math.floor(Number(b.dataset.b) * S.items.length / S.buckets))
  })

  function buildList() {
    const n = S.items.length
    if (!n) { list.innerHTML = '<li class="pg-empty">Nothing to show. Is this a JSON or JSONL file?</li>'; return }
    const a = big() ? S.start : 0, b = big() ? Math.min(n, S.start + WINDOW) : n
    let html = a > 0 ? `<li class="pg-more"><button type="button" data-win="-1">↑ ${num(a)} earlier lines</button></li>` : ''
    for (let i = a; i < b; i++) html += `<li data-i="${i}" data-role="${S.items[i].role}"></li>`
    if (b < n) html += `<li class="pg-more"><button type="button" data-win="1">↓ ${num(n - b)} later lines</button></li>`
    list.innerHTML = html
    for (let i = a; i < b; i++) renderItem(i)
    if (big()) note.textContent = `Lines ${num(S.items[a].n)}–${num(S.items[b - 1].n)} of ${num(S.items.at(-1).n)}. Like the extension, only what’s in view is rendered. Drag on the timeline or jump to a line.`
  }
  function setWindow(i, { focus } = {}) {
    S.start = Math.max(0, Math.min(S.items.length - WINDOW, i - 20))
    buildList()
    paintRail()
    const li = liFor(focus ?? i)
    list.scrollTop = li ? li.offsetTop - 12 : 0
  }

  const scrollList = top => list.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' })

  function setK(k, { animate = false, reveal = false } = {}) {
    k = Math.max(0, Math.min(S.items.length, k))
    const old = S.k
    S.k = k
    range.value = k
    count.textContent = `${num(k)} / ${num(S.items.length)}`
    const lo = Math.max(Math.min(old, k), S.start)
    const hi = Math.min(Math.max(old, k), big() ? S.start + WINDOW : Infinity)
    for (let i = lo; i < hi; i++) renderItem(i, animate && k > old)
    paintRail()
    if (reveal && k > old && !big()) {
      const li = liFor(k - 1)
      if (li) scrollList(li.offsetTop - list.clientHeight * 0.55)
    }
  }

  function load(items) {
    stop()
    S.items = link(items)
    S.k = 0
    S.start = 0
    range.max = items.length
    list.scrollTop = 0
    jumpForm.hidden = !big()
    if (items.length) buildRail(); else pgRail.innerHTML = ''
    buildList()
    setK(0)
  }

  /* datasets: a run per row */
  const OUTCOME = ['resolved', 'success', 'passed', 'correct', 'solved']
  function outcome(o) {
    const k = OUTCOME.find(k => typeof o[k] === 'boolean')
    if (k) return o[k]
    if (typeof o.reward === 'number') return o.reward > 0
    return null
  }
  function showRow(r) {
    S.row = r
    const row = S.rows[r]
    const key = rowKey(row.obj)
    const skip = new Set([key, ...ROW_KEYS])
    const id = row.obj.instance_id ?? row.obj.id ?? row.obj.title ?? `row ${r + 1}`
    const fields = Object.entries(row.obj).filter(([k, v]) => !skip.has(k) && v !== null && typeof v !== 'object' && String(v) !== String(id)).slice(0, 4)
    const runs = S.rows.length > 1 && S.rows.length <= 60 ? `<span class="runs" aria-label="Runs">${S.rows.map((x, i) => {
      const ok = outcome(x.obj)
      return `<button type="button" data-run="${i}" class="${ok === true ? 'ok' : ok === false ? 'bad' : ''}" aria-current="${i === r}" title="${esc(String(x.obj.instance_id ?? x.obj.id ?? x.obj.title ?? `Row ${i + 1}`))}">${i + 1}</button>`
    }).join('')}</span>` : ''
    rowBar.hidden = false
    rowBar.innerHTML = `<span class="rownav"><button type="button" data-row="-1" aria-label="Previous row (Shift+K)" ${r ? '' : 'disabled'}>‹</button>Row ${r + 1} of ${S.rows.length}<button type="button" data-row="1" aria-label="Next row (Shift+J)" ${r < S.rows.length - 1 ? '' : 'disabled'}>›</button></span>${runs}<span class="rid">${esc(clip(String(id), 60))}</span>${fields.map(([k, v]) => `<span class="fld">${esc(k)}<b class="${typeof v === 'boolean' ? v : ''}">${esc(clip(String(v), 40))}</b></span>`).join('')}`
    load(row.obj[key].map((m, i) => ({ ...norm(m), n: row.n, sub: i + 1, src: JSON.stringify(m) })))
  }
  function rowStep(d) {
    if (!S.rows) return false
    const b = pg.getBoundingClientRect()
    if (b.bottom < 0 || b.top > innerHeight) return false
    const r = Math.max(0, Math.min(S.rows.length - 1, S.row + d))
    if (r !== S.row) { showRow(r); play() }
    return true
  }
  rowBar.addEventListener('click', e => {
    const step = e.target.closest('[data-row]'), run = e.target.closest('[data-run]')
    if (!S.rows) return
    if (step) { showRow(S.row + Number(step.dataset.row)); play() }
    if (run) { showRow(Number(run.dataset.run)); play() }
  })

  function open(text, { autoplay = true } = {}) {
    stopLive()
    const t0 = performance.now()
    const lines = parseText(text)
    const MAX = 200000
    const rowish = lines.filter(l => rowKey(l.obj))
    if (rowish.length && rowish.length >= lines.length / 2) {
      S.rows = rowish.slice(0, MAX)
      showRow(0)
    } else {
      S.rows = null
      rowBar.hidden = true
      rowBar.innerHTML = ''
      load(lines.slice(0, MAX).map(l => ({ ...norm(l.obj), n: l.n, src: l.src })))
    }
    const ms = performance.now() - t0
    pgTime.textContent = lines.length > 1000 ? `opened ${num(lines.length)} lines (${fmtBytes(text.length)}) in ${fmtMs(ms)}` : `opened in ${fmtMs(ms)}`
    if (lines.length > MAX) note.textContent = `Showing the first ${num(MAX)} of ${num(lines.length)} lines. The extension reads files of any size.`
    liveBtn.hidden = S.file !== 'examples/claude-session.jsonl'
    if (autoplay) play()
  }

  function stop() {
    clearInterval(S.timer)
    S.timer = null
    playBtn.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.2v9.6L12.6 8z" fill="currentColor"/></svg>'
    playBtn.setAttribute('aria-label', 'Unroll')
  }
  function play() {
    if (reduce) { setK(S.items.length); return }
    if (S.k >= S.items.length) { setK(0); list.scrollTop = 0 }
    stop()
    // Quick on purpose: a cascade of about fifteen frames whatever the file size.
    const chunk = Math.max(1, Math.ceil(S.items.length / 15))
    playBtn.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 3h2.5v10H4.5zM9 3h2.5v10H9z" fill="currentColor"/></svg>'
    playBtn.setAttribute('aria-label', 'Pause')
    S.timer = setInterval(() => {
      if (S.k >= S.items.length) return stop()
      setK(S.k + chunk, { animate: true, reveal: true })
    }, 55)
  }
  playBtn.addEventListener('click', () => (S.timer ? stop() : play()))
  range.addEventListener('input', () => { stop(); stopLive(); setK(Number(range.value), { animate: true, reveal: true }) })

  jumpForm.addEventListener('submit', e => {
    e.preventDefault()
    const want = Number(jumpInput.value)
    if (!want) return
    let i = S.items.findIndex(it => it.n >= want)
    if (i < 0) i = S.items.length - 1
    setWindow(i, { focus: i })
    const card = $('.pg-card, .pg-raw', liFor(i))
    if (card && !reduce) replay(card, 'flash')
  })

  list.addEventListener('click', e => {
    const more = e.target.closest('[data-win]')
    if (more) { const d = Number(more.dataset.win); setWindow(d > 0 ? S.start + WINDOW + 20 : S.start - WINDOW + 20, { focus: d > 0 ? S.start + WINDOW : S.start - 1 }); return }
    const go = e.target.closest('[data-go]')
    if (go) {
      const i = Number(go.dataset.go)
      if (!inWindow(i)) setWindow(i)
      if (S.k <= i) setK(i + 1, { animate: true })
      const li = liFor(i)
      if (li) scrollList(li.offsetTop - 12)
      const card = li && $('.pg-card', li)
      if (card && !reduce) replay(card, 'flash')
      return
    }
    if (e.target.closest('summary, a, pre, button')) return
    const card = e.target.closest('.pg-card')
    if (!card) {
      // A raw line: unroll up to it.
      const li = e.target.closest('li[data-i]')
      if (li) { stop(); setK(Number(li.dataset.i) + 1, { animate: true }) }
      return
    }
    const i = Number(card.dataset.i)
    if (card.classList.contains('showraw')) { renderItem(i); return }
    card.classList.add('showraw', 'sel')
    let src = S.items[i].src
    try { src = JSON.stringify(JSON.parse(src), null, 2) } catch {}
    $('.c', card).innerHTML = hl(src)
  })

  /* simulate live: the example session keeps going, as a running agent would */
  const LIVE = [
    { type: 'user', message: { role: 'user', content: 'Nice. Can you add a test for a fixed-amount coupon too?' } },
    { type: 'assistant', message: { role: 'assistant', model: 'claude-sonnet-5', content: [{ type: 'text', text: 'I’ll add it next to the percentage test.' }, { type: 'tool_use', id: 'toolu_01Lv1Fx', name: 'Edit', input: { file_path: '/Users/sam/shopfront/src/cart.test.ts', old_string: '  it(\'applies a percentage coupon to items only\'', new_string: '  it(\'applies a fixed coupon before shipping\', () => {\n    expect(checkoutTotal(items(40), { kind: \'fixed\', value: 5 }, 4.99)).toBe(39.99)\n  })\n\n  it(\'applies a percentage coupon to items only\'' } }] } },
    { type: 'user', message: { role: 'user', content: [{ tool_use_id: 'toolu_01Lv1Fx', type: 'tool_result', content: 'The file /Users/sam/shopfront/src/cart.test.ts has been updated.' }] } },
    { type: 'assistant', message: { role: 'assistant', model: 'claude-sonnet-5', content: [{ type: 'tool_use', id: 'toolu_01Lv2Rn', name: 'Bash', input: { command: 'npm test -- cart', description: 'Run the cart tests' } }] } },
    { type: 'user', message: { role: 'user', content: [{ tool_use_id: 'toolu_01Lv2Rn', type: 'tool_result', content: ' ✓ src/cart.test.ts (13 tests) 15ms\n\n Test Files  1 passed (1)\n      Tests  13 passed (13)' }] } },
    { type: 'assistant', message: { role: 'assistant', model: 'claude-sonnet-5', content: [{ type: 'text', text: 'Added **applies a fixed coupon before shipping**. All 13 cart tests pass.' }] } },
  ]
  function stopLive() {
    clearInterval(S.live)
    S.live = null
    liveBtn.setAttribute('aria-pressed', 'false')
  }
  function appendItem(obj) {
    obj = { ...obj, uuid: crypto.randomUUID?.() ?? String(Math.random()), timestamp: new Date().toISOString() }
    const src = JSON.stringify(obj)
    const i = S.items.length
    S.items.push({ ...norm(obj), n: (S.items.at(-1)?.n ?? 0) + 1, src })
    link(S.items)
    range.max = S.items.length
    list.insertAdjacentHTML('beforeend', `<li data-i="${i}" data-role="${S.items[i].role}"></li>`)
    S.items.forEach((it, j) => { if (j < i && it.blocks.some(b => b.to === i)) renderItem(j) })
    buildRail()
    setK(S.items.length, { animate: true })
    scrollList(list.scrollHeight)
  }
  liveBtn.addEventListener('click', () => {
    if (S.live) return stopLive()
    stop()
    setK(S.items.length)
    liveBtn.setAttribute('aria-pressed', 'true')
    let step = S.items.length - 13
    if (step >= LIVE.length) return stopLive()
    const tick = () => {
      if (step >= LIVE.length) { stopLive(); liveBtn.hidden = true; return }
      appendItem(LIVE[step++])
    }
    tick()
    S.live = setInterval(tick, 1300)
  })

  /* example files, other formats, the stress test, your own file */
  const SAMPLES = {
    openai: { file: 'examples/checkout-debug.jsonl' },
    codex: { name: 'rollout-2026-09-20T11-00-00.jsonl', lines: [
      { timestamp: '2026-09-20T11:00:00.000Z', type: 'session_meta', payload: { id: '0199a1c2-5b7e-7f10-9c3a-2f6e1d0c8a41', cwd: '/Users/sam/shopfront', originator: 'codex_cli_rs', cli_version: '0.41.0' } },
      { timestamp: '2026-09-20T11:00:04.000Z', type: 'response_item', payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Why does `npm run build` fail on main?' }] } },
      { timestamp: '2026-09-20T11:00:06.000Z', type: 'response_item', payload: { type: 'reasoning', summary: [{ type: 'summary_text', text: '**Reproducing the failure** Run the build and read the first error before touching code.' }], content: null, encrypted_content: 'gAAAAABo8x2…' } },
      { timestamp: '2026-09-20T11:00:07.000Z', type: 'response_item', payload: { type: 'function_call', name: 'shell', arguments: JSON.stringify({ command: ['bash', '-lc', 'npm run build'], workdir: '/Users/sam/shopfront' }), call_id: 'call_Q3m8Vt' } },
      { timestamp: '2026-09-20T11:00:12.000Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'call_Q3m8Vt', output: JSON.stringify({ output: 'src/cart.ts(42,17): error TS2554: Expected 2 arguments, but got 1.\n\nFound 1 error in src/cart.ts:42', metadata: { exit_code: 2, duration_seconds: 4.1 } }) } },
      { timestamp: '2026-09-20T11:00:14.000Z', type: 'response_item', payload: { type: 'function_call', name: 'shell', arguments: JSON.stringify({ command: ['bash', '-lc', "sed -n '38,44p' src/cart.ts"], workdir: '/Users/sam/shopfront' }), call_id: 'call_R7k2Pw' } },
      { timestamp: '2026-09-20T11:00:14.000Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'call_R7k2Pw', output: JSON.stringify({ output: 'export function checkoutTotal(items: Item[], coupon?: Coupon) {\n  const subtotal = sum(items)\n  const shipping = shippingFor(subtotal)\n  return round(applyCoupon(subtotal) + shipping)\n}', metadata: { exit_code: 0, duration_seconds: 0.1 } }) } },
      { timestamp: '2026-09-20T11:00:18.000Z', type: 'response_item', payload: { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: '`applyCoupon` now takes the coupon as a second argument, but `checkoutTotal` still calls it with one. Passing `coupon` through fixes the build:\n\n```ts\nreturn round(applyCoupon(subtotal, coupon) + shipping)\n```' }] } },
    ] },
    gemini: { name: 'gemini-contents.jsonl', lines: [
      { role: 'user', parts: [{ text: 'List the open issues labelled "checkout" and summarize them.' }] },
      { role: 'model', parts: [{ text: 'Search the tracker first, then group by cause.', thought: true }, { functionCall: { name: 'search_issues', args: { label: 'checkout', state: 'open' } } }] },
      { role: 'user', parts: [{ functionResponse: { name: 'search_issues', response: { issues: [{ number: 412, title: 'Coupon applied to shipping' }, { number: 418, title: 'Empty cart total is NaN' }] } } }] },
      { role: 'model', parts: [{ text: 'Two open checkout issues:\n\n- **#412** Coupons are applied to shipping as well as items.\n- **#418** An empty cart shows a total of `NaN`.\n\nBoth live in `src/cart.ts`.' }] },
    ] },
    aisdk: { name: 'ai-sdk-messages.jsonl', lines: [
      { role: 'system', content: 'You are the Shopfront support assistant. Use tools to look up orders.' },
      { role: 'user', content: 'Where is order 10482?' },
      { role: 'assistant', content: [{ type: 'reasoning', text: 'Look the order up before answering.' }, { type: 'tool-call', toolCallId: 'call_a1', toolName: 'getOrder', input: { orderId: '10482' } }] },
      { role: 'tool', content: [{ type: 'tool-result', toolCallId: 'call_a1', toolName: 'getOrder', output: { type: 'json', value: { status: 'shipped', carrier: 'UPS', eta: '2026-09-24' } } }] },
      { role: 'assistant', content: [{ type: 'text', text: 'Order 10482 has shipped with UPS and should arrive on **September 24**.' }] },
    ] },
    langchain: { name: 'langgraph-state.jsonl', lines: [
      { type: 'system', data: { content: 'You are a research assistant. Cite the changelog when you answer.', type: 'system' } },
      { type: 'human', data: { content: 'What changed in the checkout API this week?', type: 'human' } },
      { type: 'ai', data: { content: '', type: 'ai', tool_calls: [{ name: 'search_changelog', args: { query: 'checkout', since: '2026-09-14' }, id: 'call_lc1', type: 'tool_call' }] } },
      { type: 'tool', data: { content: '2026-09-18  POST /checkout accepts an optional `coupon` field.\n2026-09-19  Coupons no longer discount shipping.', type: 'tool', name: 'search_changelog', tool_call_id: 'call_lc1' } },
      { type: 'ai', data: { content: 'Two changes: `POST /checkout` accepts a `coupon` field (September 18), and coupons stopped discounting shipping (September 19).', type: 'ai' } },
    ] },
  }
  async function getText(file) {
    if (!cache.has(file)) {
      const res = await fetch(file)
      if (!res.ok) throw new Error(res.status)
      cache.set(file, await res.text())
    }
    return cache.get(file)
  }
  const tabs = $$('.pg-tabs [data-file]')
  function selectTab(tab) {
    $$('.pg-tabs [role=tab]').forEach(t => t.setAttribute('aria-selected', String(t === tab)))
    formatTab.classList.toggle('on', tab === formatTab)
    if (tab !== formatTab) formatSelect.value = ''
  }
  async function openExample(tab, opts) {
    selectTab(tab)
    await openPath(tab.dataset.file, opts)
  }
  async function openPath(file, opts) {
    note.innerHTML = DEFAULT_NOTE
    S.file = file
    try {
      open(await getText(file), opts)
    } catch {
      stop()
      list.innerHTML = `<li class="pg-empty">Couldn’t load <code>${esc(file)}</code>. <a href="${esc(file)}" download>Download it</a> or open your own file.</li>`
      pgRail.innerHTML = ''
    }
  }
  tabs.forEach(t => t.addEventListener('click', () => openExample(t)))
  formatSelect.addEventListener('change', async () => {
    const sample = SAMPLES[formatSelect.value]
    if (!sample) return
    selectTab(formatTab)
    if (sample.file) return openPath(sample.file)
    S.file = sample.name
    note.innerHTML = `<code>${esc(sample.name)}</code>: a small made-up example in this format.`
    open(sample.lines.map(o => JSON.stringify(o)).join('\n'))
  })
  stressTab.addEventListener('click', async () => {
    selectTab(stressTab)
    stopLive()
    stop()
    S.file = 'stress'
    pgTime.textContent = 'generating…'
    const base = (await getText('examples/claude-session.jsonl')).trim().split('\n')
    await new Promise(r => setTimeout(r, 30))
    const N = 50000, out = new Array(N)
    for (let i = 0; i < N; i++) {
      const c = Math.floor(i / base.length).toString(36)
      out[i] = base[i % base.length].replaceAll('toolu_01', `toolu_${c}_`).replaceAll('"a3c9000', `"${c.padStart(4, '0')}000`)
    }
    open(out.join('\n'))
  })

  async function openFile(file) {
    if (!file) return
    const LIMIT = 60e6
    const text = await (file.size > LIMIT ? file.slice(0, LIMIT) : file).text()
    let tab = $('.pg-tabs .custom')
    if (!tab) {
      tab = document.createElement('button')
      tab.type = 'button'
      tab.setAttribute('role', 'tab')
      tab.className = 'custom'
      $('.pg-open').before(tab)
      tab.addEventListener('click', () => { selectTab(tab); S.file = tab._name; open(tab._text) })
    }
    tab._text = file.size > LIMIT ? text.slice(0, text.lastIndexOf('\n')) : text
    tab._name = file.name
    tab.innerHTML = `<span class="ic braces">{}</span>${esc(file.name)}`
    selectTab(tab)
    S.file = file.name
    open(tab._text)
    if (!big()) note.textContent = `${file.name} was read in this tab and not uploaded.${file.size > LIMIT ? ' Only the first 60 MB is shown here; the extension reads the whole file.' : ''}`
  }
  $('#pg-file').addEventListener('change', e => { openFile(e.target.files[0]); e.target.value = '' })

  let dragDepth = 0
  pg.addEventListener('dragenter', e => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); dragDepth++; drop.hidden = false } })
  pg.addEventListener('dragover', e => { if (!drop.hidden) e.preventDefault() })
  pg.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; drop.hidden = true } })
  pg.addEventListener('drop', e => {
    e.preventDefault()
    dragDepth = 0
    drop.hidden = true
    openFile(e.dataTransfer.files[0])
  })

  // Load the first example raw, and unroll it the first time it scrolls into view.
  openExample(tabs[0], { autoplay: false }).then(() => {
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) {
        io.disconnect()
        if (S.k === 0) setTimeout(play, reduce ? 0 : 350)
      }
    }, { threshold: 0.35 })
    io.observe(pg)
  })

  /* save the page as the trace it is */
  function savePage() {
    const url = URL.createObjectURL(new Blob([`${window.unroll.jsonl()}\n`], { type: 'application/x-ndjson' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'unroll.jsonl'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    toast('Saved unroll.jsonl. Open it with Unroll to read this page in VS Code.')
  }
  $$('[data-save]').forEach(b => b.addEventListener('click', savePage))
  if (!/Mac|iPhone|iPad/.test(navigator.platform)) $$('.help kbd').forEach(k => { if (k.textContent === '⌘S') k.textContent = 'Ctrl S' })

  /* a spine in the gutter from a call to its result */
  const main = $('#main')
  const spine = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  spine.classList.add('spine')
  spine.setAttribute('aria-hidden', 'true')
  main.append(spine)
  document.addEventListener('pointerover', e => {
    const a = e.target.closest('.rec .result-link, .rec .back-link')
    if (!a || mode === 'raw' || innerWidth < 860) return
    const from = a.closest('.rec'), to = $(a.hash)
    if (!to || to.hidden || to === from) return
    const box = main.getBoundingClientRect(), ab = a.getBoundingClientRect(), fb = from.getBoundingClientRect(), tb = to.getBoundingClientRect()
    const x = Math.min(fb.left, tb.left) - box.left - 2
    const bend = Math.min(30, x - 6)
    if (bend < 10) return
    const y1 = ab.top + ab.height / 2 - box.top, y2 = tb.top + 24 - box.top
    spine.innerHTML = `<path d="M ${x} ${y1} C ${x - bend} ${y1}, ${x - bend} ${y2}, ${x} ${y2}" style="stroke: var(--role-${to.dataset.role})"/><circle cx="${x}" cy="${y1}" r="2.5" style="fill: var(--role-${from.dataset.role})"/><circle cx="${x}" cy="${y2}" r="3" style="fill: var(--role-${to.dataset.role})"/>`
    const path = spine.querySelector('path')
    path.style.setProperty('--len', path.getTotalLength())
    spine.classList.remove('on'); void spine.offsetWidth; spine.classList.add('on')
    a.addEventListener('pointerleave', () => spine.classList.remove('on'), { once: true })
  })

  /* phones and tablets: send the install link to a computer (see .touch-only) */
  const installLink = new URL('#install', $('link[rel=canonical]')?.href ?? location.href).href
  function confirmHandoff(button, text) {
    const label = $('span', button), before = label.textContent
    label.textContent = text
    setTimeout(() => { label.textContent = before }, 2400)
  }
  $$('[data-handoff]').forEach(button => button.addEventListener('click', async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Unroll for VS Code', text: 'Install Unroll on my computer to read agent traces in VS Code.', url: installLink })
        return
      } catch (error) {
        if (error?.name === 'AbortError') return // the share sheet was dismissed
      }
    }
    try {
      await navigator.clipboard.writeText(installLink)
      confirmHandoff(button, 'Link copied')
    } catch {
      // No share sheet and no clipboard: show the link to copy by hand.
      if (!button.nextElementSibling?.matches('.handoff-url')) button.insertAdjacentHTML('afterend', `<code class="handoff-url">${esc(installLink)}</code>`)
    }
  }))

  /* the window's traffic lights (window.js): minimizing rolls this file back up to raw */
  const say = text => window.unrollWindow?.say(text)
  addEventListener('unroll:minimize', () => {
    stopCountdown()
    if (mode === 'raw') setMode('unrolled')
    else { setMode('raw'); say('Rolled back up. Press U to unroll.') }
  })
  addEventListener('unroll:layout', measureRail)

  /* a live tail: linger at the end of the file and a new line is written */
  const eofLine = $('#eof-line')
  let tailTimer, tailed = false
  new IntersectionObserver(([entry]) => {
    clearTimeout(tailTimer)
    if (entry.isIntersecting && !tailed && mode === 'unrolled') tailTimer = setTimeout(appendLive, 2200)
  }, { threshold: 1 }).observe(eofLine)
  function appendLive() {
    if (tailed || mode !== 'unrolled') return
    tailed = true
    const now = new Date().toISOString().slice(11, 19)
    const rec = document.createElement('article')
    rec.className = 'rec'
    rec.dataset.role = 'assistant'
    rec.dataset.title = 'Written while you were reading'
    rec.id = `r${recs.length + 1}`
    rec.innerHTML = `<div class="meta"><span class="who">assistant</span><span class="ln">L${recs.length + 1}</span><time>${now}Z</time></div>
      <div class="body"><p>This line was written a moment ago, while you were reading. Leave a session open in Unroll and new steps arrive the same way. Press <kbd>F</kbd> any time to follow the latest.</p></div>`
    $('.eof').before(rec)
    recs.push(rec)
    addActs(rec)
    rawLine(rec)
    railButton(rec)
    settle(rec)
    textLen.set(rec, rec.textContent.length)
    for (const el of [$('#rec-count'), $('#rail-last'), $('[data-count]', eofLine)]) el.textContent = recs.length
    $('.caret', eofLine).textContent = 'following'
    applyFilters()
    live.hidden = false
    setTimeout(() => { live.hidden = true }, 2400)
    if (!reduce) rec.classList.add('append')
    document.title = `● ${document.title}`
    setTimeout(() => { document.title = document.title.replace(/^● /, '') }, 4000)
  }

  /* for anyone who opens devtools on a log viewer's homepage */
  window.unroll = {
    records: () => recs.map(r => JSON.parse(recordJSON(r))),
    jsonl: () => recs.map(compact).join('\n'),
  }
  console.log('%c{} unroll.jsonl%c  %d records · read-only\n\nOf course you opened devtools. This page is a trace too:\n  unroll.records()  every section as a Claude Code record\n  unroll.jsonl()    the whole page as JSONL\n\nThe extension reads files like this one. https://github.com/mhermon/unroll',
    'font: 600 13px ui-monospace, monospace; color: #e8c547', 'font: 12px ui-monospace, monospace; color: #9a9aa3', recs.length)

  /* start */
  measureRail()
  // Section names other pages and older links use, alongside line anchors (#r18, #L18).
  const SECTIONS = { try: 3, demo: 15, walkthrough: 15, formats: 16, install: 18, privacy: 19 }
  const target = hash => {
    const line = hash.match(/^#[rL](\d+)$/)
    return recs[(line ? Number(line[1]) : SECTIONS[hash.slice(1)] ?? 0) - 1]
  }
  const deep = target(location.hash)
  // Arriving from a link lands on the section at once, as a native anchor would.
  if (deep) requestAnimationFrame(() => { select(deep, { scroll: false }); deep.scrollIntoView({ block: 'start' }) })
  addEventListener('hashchange', () => { const r = target(location.hash); if (r && !/^#r\d+$/.test(location.hash)) select(r, { scroll: true }) })
  updateStatus()
  addEventListener('load', () => { measureRail(); updateStatus() })
})()
