// A Markdown file open in the site window. The outline and the breadcrumb's section
// menu are built from the page's own headings, follow the section being read, and
// the file can be read as the Markdown it is (Source) or rendered (Preview), the
// way the home page is its own JSONL file, raw or unrolled.
;(() => {
  const $ = (s, r = document) => r.querySelector(s)
  const $$ = (s, r = document) => [...r.querySelectorAll(s)]
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  const prose = $('.prose'), win = $('.window')
  if (!prose) return

  /* ---------- outline ---------- */
  const slug = text => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const sections = $$('h2', prose)
  for (const h of sections) h.id ||= slug(h.textContent)
  const outlineItems = sections.map(h => `<li><a href="#${h.id}">${esc(h.textContent)}</a></li>`).join('')
  const outline = $('#outline'), menu = $('#crumb-menu'), crumb = $('#crumb-section')
  if (outline) { outline.innerHTML = outlineItems; outline.closest('section').hidden = !sections.length }
  if (menu) { $('ol', menu).innerHTML = outlineItems; menu.hidden = !sections.length }
  const links = $$('#outline a, #crumb-menu a')

  // Unset until the first pass, which also names the page's title before its first section.
  let current
  function follow() {
    ticking = false
    if (mode === 'source') return
    // The last heading above the reading line is the section being read.
    const line = innerHeight * 0.3
    let next = null
    for (const h of sections) if (h.getBoundingClientRect().top <= line) next = h
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2 && sections.length) next = sections[sections.length - 1]
    if (next === current) return
    current = next
    for (const a of links) a.setAttribute('aria-current', String(!!next && a.hash === `#${next.id}`))
    if (crumb) crumb.textContent = next ? next.textContent : $('h1', prose).textContent
    // Keep the current section visible in a long outline.
    $('#outline a[aria-current="true"]')?.scrollIntoView({ block: 'nearest' })
  }
  let ticking = false
  const schedule = () => { if (!ticking) { ticking = true; requestAnimationFrame(follow) } }
  addEventListener('scroll', schedule, { passive: true })
  // A link to a section scrolls after this script runs; follow it there.
  addEventListener('hashchange', schedule)
  addEventListener('load', schedule)

  // The section menu closes once a section is chosen, or on a click or Escape elsewhere.
  if (menu) {
    menu.addEventListener('click', e => { if (e.target.closest('a')) menu.open = false })
    document.addEventListener('click', e => { if (!menu.contains(e.target)) menu.open = false })
    menu.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.open) { menu.open = false; $('summary', menu).focus() } })
  }

  /* ---------- explorer ---------- */
  const explorer = $('[data-explorer]')
  explorer?.addEventListener('click', () => {
    const shown = win.classList.toggle('side-hidden') === false
    explorer.setAttribute('aria-pressed', String(shown))
  })

  /* ---------- source / preview ---------- */
  // The preview's content as Markdown: headings, paragraphs, lists and tables,
  // with inline emphasis, code, keys and links. Logos and other decoration drop out.
  function inline(node) {
    let out = ''
    for (const n of node.childNodes) {
      if (n.nodeType === Node.TEXT_NODE) { out += n.textContent.replace(/\s+/g, ' '); continue }
      if (n.nodeType !== Node.ELEMENT_NODE) continue
      const tag = n.tagName.toLowerCase(), inner = () => inline(n).trim()
      if (tag === 'strong' || tag === 'b') out += `**${inner()}**`
      else if (tag === 'em' || tag === 'i') out += `*${inner()}*`
      else if (tag === 'code') out += `\`${n.textContent}\``
      else if (tag === 'kbd') out += `<kbd>${n.textContent}</kbd>`
      else if (tag === 'a') out += `[${inner()}](${n.getAttribute('href')})`
      else if (tag === 'br') out += '  \n'
      else if (tag !== 'svg') out += inline(n)
    }
    return out
  }
  const cell = el => inline(el).trim().replace(/\|/g, '\\|')
  function markdown(root) {
    const lines = [], anchors = new Map()
    const block = text => { if (lines.length && lines[lines.length - 1] !== '') lines.push(''); lines.push(...text.split('\n')) }
    const walk = el => {
      for (const child of el.children) {
        const tag = child.tagName.toLowerCase()
        if (/^h[1-6]$/.test(tag)) {
          block(`${'#'.repeat(Number(tag[1]))} ${inline(child).trim()}`)
          if (child.id) anchors.set(child.id, lines.length - 1)
        } else if (tag === 'p') block(inline(child).trim())
        else if (tag === 'ul' || tag === 'ol')
          block([...child.children].map((li, i) => `${tag === 'ol' ? `${i + 1}.` : '-'} ${inline(li).trim()}`).join('\n'))
        else if (tag === 'table') {
          const [head, ...rows] = [...child.rows].map(row => `| ${[...row.cells].map(cell).join(' | ')} |`)
          block([head, `|${' --- |'.repeat(child.rows[0].cells.length)}`, ...rows].join('\n'))
        } else walk(child)
      }
    }
    walk(root)
    return { lines, anchors }
  }
  // Colour it as an editor would: heading markers, emphasis, code, keys and links.
  const TOKENS = /(`[^`]*`)|(\*\*[^*]+\*\*)|(\[[^\]]*\]\([^)]*\))|(&lt;\/?kbd&gt;)|(\*[^*\s][^*]*\*)/g
  function paint(line) {
    const heading = line.match(/^(#{1,6}) (.*)$/)
    if (heading) return `<span class="md-h"><span class="md-p">${heading[1]}</span> ${esc(heading[2])}</span>`
    const marker = line.match(/^(-|\d+\.|\|)( .*|$)/)
    const body = esc(marker ? line.slice(marker[1].length) : line).replace(TOKENS, (m, code, bold, link, kbd, em) =>
      code ? `<span class="md-c">${m}</span>`
        : bold ? `<span class="md-p">**</span><span class="md-b">${m.slice(2, -2)}</span><span class="md-p">**</span>`
          : link ? m.replace(/^\[(.*)\]\((.*)\)$/, '<span class="md-p">[</span><span class="md-l">$1</span><span class="md-p">](</span><span class="md-u">$2</span><span class="md-p">)</span>')
            : kbd ? `<span class="md-p">${m}</span>`
              : `<span class="md-i">${m}</span>`)
    return (marker ? `<span class="md-p">${esc(marker[1])}</span>` : '') + (line.startsWith('|') ? body.replace(/ \| /g, ' <span class="md-p">|</span> ').replace(/ \|$/, ' <span class="md-p">|</span>') : body)
  }

  let mode = 'preview', source = null, anchors = new Map()
  const status = $('#sb-mode')
  function show(next) {
    if (next === mode) return
    const at = mode === 'preview' ? current?.id : topSourceSection()
    if (next === 'source' && !source) {
      const md = markdown(prose)
      anchors = md.anchors
      source = document.createElement('pre')
      source.className = 'md-source'
      source.setAttribute('aria-label', `${$('.file-name')?.textContent ?? 'This file'} as Markdown`)
      const sectionAt = new Map([...anchors].map(([id, line]) => [line, id]))
      source.innerHTML = md.lines.map((line, i) => `<span${sectionAt.has(i) ? ` data-section="${sectionAt.get(i)}"` : ''}>${paint(line) || ' '}</span>`).join('')
      prose.after(source)
    }
    mode = next
    prose.hidden = next === 'source'
    source.hidden = next !== 'source'
    for (const b of $$('[data-view]')) b.setAttribute('aria-pressed', String(b.dataset.view === next))
    if (status) status.textContent = next === 'source' ? `Markdown · ${source.children.length} lines` : 'Preview'
    // Stay in the same section across the switch.
    const target = next === 'source' ? (at && $(`[data-section="${at}"]`, source)) : (at && document.getElementById(at))
    if (target) target.scrollIntoView({ block: 'start' })
    else scrollTo(0, 0)
    if (next === 'preview') { current = null; follow() }
  }
  function topSourceSection() {
    let id = null
    for (const line of $$('[data-section]', source)) if (line.getBoundingClientRect().top <= innerHeight * 0.3) id = line.dataset.section
    return id
  }
  for (const b of $$('[data-view]')) b.addEventListener('click', () => show(b.dataset.view))
  addEventListener('unroll:minimize', () => {
    show(mode === 'preview' ? 'source' : 'preview')
    window.unrollWindow?.say(mode === 'source' ? 'The Markdown behind this page. Minimize again to render it.' : 'Rendered again.')
  })

  follow()
})()
