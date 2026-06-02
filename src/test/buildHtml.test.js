import { describe, it, expect } from 'vitest'
import { buildHtml } from '../utils/buildHtml'

describe('buildHtml', () => {

  // ── edge cases ────────────────────────────────────────────────────────────

  it('returns empty string for empty input', () => {
    expect(buildHtml('')).toBe('')
  })

  it('returns empty string for null', () => {
    expect(buildHtml(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(buildHtml(undefined)).toBe('')
  })

  // ── structure ─────────────────────────────────────────────────────────────

  it('is a valid HTML document', () => {
    const html = buildHtml('function GeneratedForm() { return null; }')
    expect(html).toMatch(/^<!DOCTYPE html>/i)
    expect(html).toContain('<html lang="en">')
    expect(html).toContain('</html>')
    expect(html).toContain('<div id="root">')
  })

  it('embeds the generated code inside the script tag', () => {
    const code = 'function GeneratedForm() { return <div>test</div>; }'
    const html = buildHtml(code)
    expect(html).toContain(code)
  })

  // ── CDN scripts ───────────────────────────────────────────────────────────

  it('loads React 18 from unpkg CDN', () => {
    const html = buildHtml('function GeneratedForm() { return null; }')
    expect(html).toContain('unpkg.com/react@18')
    expect(html).toContain('unpkg.com/react-dom@18')
  })

  it('loads Tailwind CSS from CDN', () => {
    const html = buildHtml('function GeneratedForm() { return null; }')
    expect(html).toContain('cdn.tailwindcss.com')
  })

  it('loads Babel standalone for JSX transpilation', () => {
    const html = buildHtml('function GeneratedForm() { return null; }')
    expect(html).toContain('@babel/standalone')
  })

  it('uses type="text/babel" on the script so Babel picks it up', () => {
    const html = buildHtml('function GeneratedForm() { return null; }')
    expect(html).toContain('type="text/babel"')
  })

  // ── security: </script> escaping ─────────────────────────────────────────

  it('escapes </script> inside generated code so the host script tag does not close early', () => {
    const code = 'const x = "</script>"; function GeneratedForm() { return null; }'
    const html = buildHtml(code)
    // the raw string should not appear unescaped inside the host script tag
    // (it can appear in the outer wrapper but must be escaped inside)
    const scriptBlockStart = html.indexOf('<script type="text/babel">')
    const scriptBlockEnd = html.lastIndexOf('</script>')
    const scriptContent = html.slice(scriptBlockStart, scriptBlockEnd)
    expect(scriptContent).not.toContain('</script>')
    expect(scriptContent).toContain('<\\/script>')
  })

  // ── fallback error handling ───────────────────────────────────────────────

  it('includes a try/catch block to show errors in the preview', () => {
    const html = buildHtml('function GeneratedForm() { return null; }')
    expect(html).toContain('try {')
    expect(html).toContain('} catch (err)')
  })

  it('renders GeneratedForm when found', () => {
    const html = buildHtml('function GeneratedForm() { return null; }')
    expect(html).toContain('typeof GeneratedForm')
    expect(html).toContain('ReactDOM.createRoot')
  })

})
