import { describe, it, expect } from 'vitest'
import { buildPrompt } from '../utils/buildPrompt'

// mirrors createField() from Wizard.jsx — every key must be present
const makeField = (overrides = {}) => ({
  name: 'Full Name',
  type: 'text',
  required: false,
  pattern: '',
  patternPreset: '',
  options: '',
  accept: '',
  acceptPreset: '',
  minValue: '',
  maxValue: '',
  placeholder: '',
  ...overrides,
})

describe('buildPrompt', () => {

  // ── basic output ──────────────────────────────────────────────────────────

  it('returns a non-empty string', () => {
    const prompt = buildPrompt([makeField()], 'single-column')
    expect(typeof prompt).toBe('string')
    expect(prompt.length).toBeGreaterThan(0)
  })

  it('tells the model to output GeneratedForm with no imports or markdown', () => {
    const prompt = buildPrompt([makeField()], 'single-column')
    expect(prompt).toContain('"GeneratedForm"')
    expect(prompt).toContain('No imports, no markdown, no backticks')
  })

  it('includes the field name and its camelCase variable', () => {
    const prompt = buildPrompt([makeField({ name: 'Full Name' })], 'single-column')
    expect(prompt).toContain('Full Name')
    expect(prompt).toContain('fullName')
  })

  it('converts multi-word names to camelCase', () => {
    const prompt = buildPrompt([makeField({ name: 'Street Address' })], 'single-column')
    expect(prompt).toContain('streetAddress')
  })

  it('handles names with special characters gracefully', () => {
    const prompt = buildPrompt([makeField({ name: 'First & Last Name' })], 'single-column')
    // special chars stripped, result should still be a valid identifier
    expect(prompt).toContain('First')
  })

  // ── layouts ───────────────────────────────────────────────────────────────

  it('uses single-column layout instruction', () => {
    const prompt = buildPrompt([makeField()], 'single-column')
    expect(prompt).toContain('single full-width column')
  })

  it('uses two-column grid layout instruction', () => {
    const prompt = buildPrompt([makeField()], 'two-column')
    expect(prompt).toContain('grid grid-cols-2')
  })

  it('uses card-sections layout instruction', () => {
    const prompt = buildPrompt([makeField()], 'card-sections')
    expect(prompt).toContain('bg-white p-6 rounded-xl shadow-md')
  })

  it('uses multi-step layout instruction', () => {
    const prompt = buildPrompt([makeField()], 'multi-step')
    expect(prompt).toContain('border-t my-4')
  })

  it('falls back to single-column for an unrecognised layout', () => {
    const prompt = buildPrompt([makeField()], 'something-weird')
    expect(prompt).toContain('single full-width column')
  })

  // ── field types: render hints ─────────────────────────────────────────────

  it('tells the model to render a <select> with options for select type', () => {
    const field = makeField({ name: 'Color', type: 'select', options: 'Red, Green, Blue' })
    const prompt = buildPrompt([field], 'single-column')
    expect(prompt).toContain('<option value="Red">Red</option>')
    expect(prompt).toContain('<option value="Green">Green</option>')
    expect(prompt).toContain('<option value="Blue">Blue</option>')
  })

  it('trims whitespace from select options', () => {
    const field = makeField({ name: 'Size', type: 'select', options: ' S , M , L ' })
    const prompt = buildPrompt([field], 'single-column')
    expect(prompt).toContain('<option value="S">S</option>')
    expect(prompt).toContain('<option value="M">M</option>')
  })

  it('includes placeholder text for textarea', () => {
    const field = makeField({ name: 'Bio', type: 'textarea', placeholder: 'Tell us about yourself' })
    const prompt = buildPrompt([field], 'single-column')
    expect(prompt).toContain('textarea')
    expect(prompt).toContain('Tell us about yourself')
  })

  it('includes accept attribute for file fields when set', () => {
    const field = makeField({ name: 'Resume', type: 'file', accept: '.pdf,.doc' })
    const prompt = buildPrompt([field], 'single-column')
    expect(prompt).toContain('accept=".pdf,.doc"')
  })

  it('does not include accept attribute when not set', () => {
    const field = makeField({ name: 'Upload', type: 'file', accept: '' })
    const prompt = buildPrompt([field], 'single-column')
    // "accept" should not appear in the render hint if empty
    expect(prompt).not.toMatch(/accept="[^"]/)
  })

  it('includes min and max HTML attributes for number fields', () => {
    const field = makeField({ name: 'Age', type: 'number', minValue: '18', maxValue: '99' })
    const prompt = buildPrompt([field], 'single-column')
    expect(prompt).toContain('min="18"')
    expect(prompt).toContain('max="99"')
  })

  it('includes min and max HTML attributes for date fields', () => {
    const field = makeField({ name: 'DOB', type: 'date', minValue: '1990-01-01', maxValue: '2010-12-31' })
    const prompt = buildPrompt([field], 'single-column')
    expect(prompt).toContain('min="1990-01-01"')
    expect(prompt).toContain('max="2010-12-31"')
  })

  it('derives maxLength from an exact-length pattern like ^\\d{10}$', () => {
    const field = makeField({ name: 'PIN', type: 'text', pattern: '^\\d{10}$' })
    const prompt = buildPrompt([field], 'single-column')
    expect(prompt).toContain('maxLength={10}')
  })

  it('sets maxLength={10} for tel with no custom pattern', () => {
    const field = makeField({ name: 'Phone', type: 'tel' })
    const prompt = buildPrompt([field], 'single-column')
    expect(prompt).toContain('maxLength={10}')
  })

  // ── validation lines ──────────────────────────────────────────────────────

  it('includes required validation for text fields', () => {
    const field = makeField({ name: 'Username', type: 'text', required: true })
    const prompt = buildPrompt([field], 'single-column')
    expect(prompt).toContain('Username is required')
  })

  it('uses .trim() check for text required validation', () => {
    const field = makeField({ name: 'Username', type: 'text', required: true })
    const prompt = buildPrompt([field], 'single-column')
    expect(prompt).toContain('.trim()')
  })

  it('uses a null/undefined/empty check for number required validation', () => {
    const field = makeField({ name: 'Score', type: 'number', required: true })
    const prompt = buildPrompt([field], 'single-column')
    expect(prompt).toContain('=== null || score === undefined')
  })

  it('checks the file list length for required file fields', () => {
    const field = makeField({ name: 'Resume', type: 'file', required: true })
    const prompt = buildPrompt([field], 'single-column')
    expect(prompt).toContain('.length === 0')
  })

  it('uses "must be checked" for required checkbox', () => {
    const field = makeField({ name: 'Agree', type: 'checkbox', required: true })
    const prompt = buildPrompt([field], 'single-column')
    expect(prompt).toContain('Agree must be checked')
  })

  it('uses "Please select" for required select', () => {
    const field = makeField({ name: 'Country', type: 'select', required: true, options: 'USA, UK' })
    const prompt = buildPrompt([field], 'single-column')
    expect(prompt).toContain('Please select a Country')
  })

  it('includes custom regex pattern validation', () => {
    const field = makeField({ name: 'Code', type: 'text', pattern: '^[A-Z]{3}$' })
    const prompt = buildPrompt([field], 'single-column')
    expect(prompt).toContain('^[A-Z]{3}$')
    expect(prompt).toContain('Invalid Code format')
  })

  it('adds built-in email format check when no custom pattern is set', () => {
    const field = makeField({ name: 'Email', type: 'email' })
    const prompt = buildPrompt([field], 'single-column')
    expect(prompt).toContain('Invalid email address')
  })

  it('skips built-in email check when a custom pattern is set', () => {
    const field = makeField({ name: 'Email', type: 'email', pattern: '^.+@company\\.com$' })
    const prompt = buildPrompt([field], 'single-column')
    expect(prompt).not.toContain('Invalid email address')
    expect(prompt).toContain('@company')
  })

  it('adds 10-digit phone check for tel with no pattern', () => {
    const field = makeField({ name: 'Phone', type: 'tel' })
    const prompt = buildPrompt([field], 'single-column')
    expect(prompt).toContain('10-digit phone number')
  })

  it('skips built-in tel check when a custom pattern is set', () => {
    const field = makeField({ name: 'Phone', type: 'tel', pattern: '^\\+\\d{1,3}\\d{10}$' })
    const prompt = buildPrompt([field], 'single-column')
    expect(prompt).not.toContain('10-digit phone number')
  })

  it('includes number min validation', () => {
    const field = makeField({ name: 'Age', type: 'number', minValue: '18' })
    const prompt = buildPrompt([field], 'single-column')
    expect(prompt).toContain('at least 18')
  })

  it('includes number max validation', () => {
    const field = makeField({ name: 'Age', type: 'number', maxValue: '120' })
    const prompt = buildPrompt([field], 'single-column')
    expect(prompt).toContain('at most 120')
  })

  it('includes date min validation', () => {
    const field = makeField({ name: 'Start', type: 'date', minValue: '2024-01-01' })
    const prompt = buildPrompt([field], 'single-column')
    expect(prompt).toContain('on or after 2024-01-01')
  })

  it('includes date max validation', () => {
    const field = makeField({ name: 'End', type: 'date', maxValue: '2025-12-31' })
    const prompt = buildPrompt([field], 'single-column')
    expect(prompt).toContain('on or before 2025-12-31')
  })

  it('does not add validation lines when none are configured', () => {
    const field = makeField({ name: 'Note', type: 'text' })
    const prompt = buildPrompt([field], 'single-column')
    expect(prompt).not.toContain('validation (in handleSubmit)')
  })

  // ── key blocking ──────────────────────────────────────────────────────────

  it('blocks non-digit keys for tel with no pattern', () => {
    const field = makeField({ name: 'Phone', type: 'tel' })
    const prompt = buildPrompt([field], 'single-column')
    expect(prompt).toContain('onKeyDown')
  })

  it('blocks non-letter keys for a letters-only pattern', () => {
    const field = makeField({ name: 'Name', type: 'text', pattern: '^[A-Za-z ]+$' })
    const prompt = buildPrompt([field], 'single-column')
    expect(prompt).toContain('onKeyDown')
    expect(prompt).toContain('[A-Za-z ]')
  })

  it('does not add key blocking for email (special chars needed)', () => {
    const field = makeField({ name: 'Email', type: 'email' })
    const prompt = buildPrompt([field], 'single-column')
    expect(prompt).not.toContain('onKeyDown')
  })

  it('does not add key blocking for select (no keyboard input)', () => {
    const field = makeField({ name: 'Color', type: 'select', options: 'Red, Blue' })
    const prompt = buildPrompt([field], 'single-column')
    expect(prompt).not.toContain('onKeyDown')
  })

  it('does not add key blocking for checkbox', () => {
    const field = makeField({ name: 'Agree', type: 'checkbox' })
    const prompt = buildPrompt([field], 'single-column')
    expect(prompt).not.toContain('onKeyDown')
  })

  // ── multiple fields ───────────────────────────────────────────────────────

  it('includes all fields when multiple are passed', () => {
    const fields = [
      makeField({ name: 'First Name', type: 'text' }),
      makeField({ name: 'Email', type: 'email' }),
      makeField({ name: 'Age', type: 'number' }),
    ]
    const prompt = buildPrompt(fields, 'single-column')
    expect(prompt).toContain('First Name')
    expect(prompt).toContain('Email')
    expect(prompt).toContain('Age')
  })

  it('declares useState for every field in the skeleton', () => {
    const fields = [
      makeField({ name: 'First Name', type: 'text' }),
      makeField({ name: 'Agree', type: 'checkbox' }),
    ]
    const prompt = buildPrompt(fields, 'single-column')
    expect(prompt).toContain('[firstName,')
    expect(prompt).toContain('[agree,')
  })

})
