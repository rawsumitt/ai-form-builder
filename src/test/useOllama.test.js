import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useOllama from '../hooks/useOllama'

// valid minimal component the hook accepts as a clean response
const VALID_COMPONENT = 'function GeneratedForm() { return <div>hi</div>; }'

// fetch response helpers
const mockOk = (responseText = VALID_COMPONENT) =>
  vi.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({ response: responseText }),
  })

const mockHttpError = (status) =>
  vi.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status })

const mockNetworkError = () =>
  vi.spyOn(global, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))

const mockNeverResolves = () =>
  vi.spyOn(global, 'fetch').mockReturnValue(new Promise(() => {}))

describe('useOllama', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // ── initial state ─────────────────────────────────────────────────────────

  it('starts with the correct initial state', () => {
    const { result } = renderHook(() => useOllama())
    expect(result.current.code).toBe('')
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.isValidOutput).toBe(true)
  })

  // ── loading state ─────────────────────────────────────────────────────────

  it('sets loading to true while a request is in flight', () => {
    mockNeverResolves()
    const { result } = renderHook(() => useOllama())

    act(() => { result.current.generateForm('prompt', []) })

    expect(result.current.loading).toBe(true)
  })

  it('sets loading back to false after a successful response', async () => {
    mockOk()
    const { result } = renderHook(() => useOllama())

    await act(async () => { await result.current.generateForm('prompt', []) })

    expect(result.current.loading).toBe(false)
  })

  it('sets loading back to false after a failed response', async () => {
    mockNetworkError()
    const { result } = renderHook(() => useOllama())

    await act(async () => { await result.current.generateForm('prompt', []) })

    expect(result.current.loading).toBe(false)
  })

  it('clears code and error state at the start of each new request', async () => {
    // first call fails, sets an error
    mockNetworkError()
    const { result } = renderHook(() => useOllama())
    await act(async () => { await result.current.generateForm('prompt', []) })
    expect(result.current.error).not.toBeNull()

    // second call succeeds — error should be gone
    mockOk()
    await act(async () => { await result.current.generateForm('prompt', []) })
    expect(result.current.error).toBeNull()
    expect(result.current.code).not.toBe('')
  })

  // ── success ───────────────────────────────────────────────────────────────

  it('returns true on a successful generation', async () => {
    mockOk()
    const { result } = renderHook(() => useOllama())
    let success

    await act(async () => { success = await result.current.generateForm('prompt', []) })

    expect(success).toBe(true)
  })

  it('sets code from the Ollama response', async () => {
    mockOk(VALID_COMPONENT)
    const { result } = renderHook(() => useOllama())

    await act(async () => { await result.current.generateForm('prompt', []) })

    expect(result.current.code).toContain('function GeneratedForm')
  })

  it('strips markdown code fences from the response', async () => {
    mockOk('```jsx\n' + VALID_COMPONENT + '\n```')
    const { result } = renderHook(() => useOllama())

    await act(async () => { await result.current.generateForm('prompt', []) })

    expect(result.current.code).not.toContain('```')
    expect(result.current.code).toContain('function GeneratedForm')
  })

  it('strips ```javascript fences as well', async () => {
    mockOk('```javascript\n' + VALID_COMPONENT + '\n```')
    const { result } = renderHook(() => useOllama())

    await act(async () => { await result.current.generateForm('prompt', []) })

    expect(result.current.code).not.toContain('```')
  })

  // ── output repair patches ─────────────────────────────────────────────────

  it('wraps raw JSX in a GeneratedForm function when the model omits it', async () => {
    mockOk('<div>raw jsx with no wrapper</div>')
    const { result } = renderHook(() => useOllama())

    await act(async () => {
      await result.current.generateForm('prompt', [{ name: 'Name', type: 'text' }])
    })

    expect(result.current.code).toContain('function GeneratedForm')
    expect(result.current.isValidOutput).toBe(false)
  })

  it('injects missing errors/setErrors state declaration', async () => {
    const broken = `function GeneratedForm() {
  const handleSubmit = (e) => { e.preventDefault(); setErrors({}); };
  return <form onSubmit={handleSubmit}>{errors.name && <p>{errors.name}</p>}</form>;
}`
    mockOk(broken)
    const { result } = renderHook(() => useOllama())

    await act(async () => { await result.current.generateForm('prompt', []) })

    expect(result.current.code).toContain('[errors, setErrors]')
  })

  it('injects missing handleSubmit when model references it without defining it', async () => {
    // the repair regex is /return\s*\(/ so the JSX must be wrapped in parens
    const broken = `function GeneratedForm() {
  return (
    <form onSubmit={handleSubmit}><button type="submit">Go</button></form>
  );
}`
    mockOk(broken)
    const { result } = renderHook(() => useOllama())

    await act(async () => { await result.current.generateForm('prompt', []) })

    expect(result.current.code).toMatch(/const handleSubmit|function handleSubmit/)
  })

  it('injects missing setErrors(newErrors) call in handleSubmit', async () => {
    const broken = `function GeneratedForm() {
  const [errors, setErrors] = React.useState({});
  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (Object.keys(newErrors).length === 0) alert("ok");
  };
  return <form onSubmit={handleSubmit} />;
}`
    mockOk(broken)
    const { result } = renderHook(() => useOllama())

    await act(async () => { await result.current.generateForm('prompt', []) })

    expect(result.current.code).toContain('setErrors(newErrors)')
  })

  it('strips value attributes from input elements of type file', async () => {
    const broken = `function GeneratedForm() {
  const [avatar, setAvatar] = React.useState(null);
  return (
    <form>
      <input type="file" value={avatar} onChange={(e) => setAvatar(e.target.files)} />
      <input type="text" value={name} />
    </form>
  );
}`
    mockOk(broken)
    const { result } = renderHook(() => useOllama())

    await act(async () => { await result.current.generateForm('prompt', []) })

    expect(result.current.code).toContain('<input type="file"  onChange={(e) => setAvatar(e.target.files)} />')
    expect(result.current.code).toContain('<input type="text" value={name} />')
  })

  // ── errors ────────────────────────────────────────────────────────────────

  it('returns false on a failed generation', async () => {
    mockNetworkError()
    const { result } = renderHook(() => useOllama())
    let success

    await act(async () => { success = await result.current.generateForm('prompt', []) })

    expect(success).toBe(false)
  })

  it('sets an error when Ollama is unreachable', async () => {
    mockNetworkError()
    const { result } = renderHook(() => useOllama())

    await act(async () => { await result.current.generateForm('prompt', []) })

    expect(result.current.error).toContain('Cannot connect to Ollama')
    expect(result.current.error).toContain('localhost:11434')
  })

  it('sets a descriptive error for 404 (model not pulled)', async () => {
    mockHttpError(404)
    const { result } = renderHook(() => useOllama())

    await act(async () => { await result.current.generateForm('prompt', []) })

    expect(result.current.error).toContain('not found')
    expect(result.current.error).toContain('ollama pull')
  })

  it('sets a descriptive error for other HTTP failures', async () => {
    mockHttpError(500)
    const { result } = renderHook(() => useOllama())

    await act(async () => { await result.current.generateForm('prompt', []) })

    expect(result.current.error).toContain('HTTP 500')
  })

  it('sets an error when Ollama returns an empty response field', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ response: '' }),
    })
    const { result } = renderHook(() => useOllama())

    await act(async () => { await result.current.generateForm('prompt', []) })

    expect(result.current.error).toContain('empty response')
  })

  // ── cancel ────────────────────────────────────────────────────────────────

  it('cancelGeneration sets loading to false without setting an error', () => {
    mockNeverResolves()
    const { result } = renderHook(() => useOllama())

    act(() => { result.current.generateForm('prompt', []) })
    expect(result.current.loading).toBe(true)

    act(() => { result.current.cancelGeneration() })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  // ── concurrent requests ───────────────────────────────────────────────────

  it('cancels the previous request when a new one starts', async () => {
    let callCount = 0
    vi.spyOn(global, 'fetch').mockImplementation(() => {
      callCount++
      if (callCount === 1) return new Promise(() => {}) // first hangs
      return Promise.resolve({
        ok: true,
        json: async () => ({ response: VALID_COMPONENT }),
      })
    })

    const { result } = renderHook(() => useOllama())

    act(() => { result.current.generateForm('first prompt', []) })

    await act(async () => { await result.current.generateForm('second prompt', []) })

    expect(callCount).toBe(2)
    expect(result.current.loading).toBe(false)
    expect(result.current.code).toContain('function GeneratedForm')
  })

})
