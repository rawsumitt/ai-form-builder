import { useState, useCallback, useMemo } from "react"
import StepIndicator from "./StepIndicator"

const FIELD_TYPES = ["text", "email", "password", "number", "date", "select", "checkbox", "file", "textarea", "tel"]
const LAYOUTS = ["single-column", "two-column", "multi-step", "card-sections"]
const STEPS = ["Fields", "Validation", "Layout", "Review"]

const OPTION_TYPES = ["select"]
const PATTERN_TYPES = ["text", "email", "password", "textarea", "tel"]
const RANGE_TYPES = ["number", "date"]
// regex presets — saves users from writing raw patterns
const REGEX_PRESETS = [
    { label: "None", value: "" },
    { label: "Letters only", value: "^[A-Za-z ]+$" },
    { label: "Digits only", value: "^\\d+$" },
    { label: "Email", value: "^\\S+@\\S+\\.\\S+$" },
    { label: "Phone (10 digits)", value: "^\\d{10}$" },
    { label: "URL", value: "^https?:\\/\\/.+" },
    { label: "At least 5 characters", value: "^.{5,}$" },
    { label: "5 to 10 characters", value: "^.{5,10}$" },
    { label: "Custom...", value: "__custom__" },
]
const FILE_ACCEPT_PRESETS = [
    { label: "Any file", value: "" },
    { label: "Images (.jpg, .png, .gif)", value: ".jpg,.jpeg,.png,.gif,.webp" },
    { label: "Documents (.pdf, .doc)", value: ".pdf,.doc,.docx" },
    { label: "Spreadsheets (.csv, .xlsx)", value: ".csv,.xls,.xlsx" },
    { label: "Custom...", value: "__custom__" },
]

const createField = () => ({
    id: crypto.randomUUID(),
    name: "",
    type: "text",
    required: false,
    pattern: "",
    patternPreset: "",       // tracks which preset was selected
    // Select options (comma-separated)
    options: "",
    // File accepted types
    accept: "",
    acceptPreset: "",
    // Number/date range
    minValue: "",
    maxValue: "",
    // Textarea
    placeholder: "",
})

const Wizard = ({ onGenerate, loading }) => {
    const [currentStep, setCurrentStep] = useState(1)
    const [fields, setFields] = useState([createField()])
    const [layout, setLayout] = useState("single-column")
    const [validationErrors, setValidationErrors] = useState([])

    const addField = useCallback(() => {
        setFields((prev) => [...prev, createField()])
    }, [])

    const removeField = useCallback((index) => {
        setFields((prev) => {
            if (prev.length === 1) return prev
            return prev.filter((_, i) => i !== index)
        })
    }, [])

    // always return a new array, never mutate
    const updateField = useCallback((index, key, value) => {
        setFields((prev) =>
            prev.map((f, i) => (i === index ? { ...f, [key]: value } : f))
        )
    }, [])

    const handleGenerate = useCallback(() => {
        onGenerate(fields, layout)
    }, [onGenerate, fields, layout])

    const stepValidation = useMemo(() => {
        const errors = []

        if (currentStep === 1) {
            const hasEmpty = fields.some((f) => f.name.trim() === "")
            if (hasEmpty) errors.push("All fields must have a name.")

            const names = fields.map((f) => f.name.trim().toLowerCase()).filter(Boolean)
            if (new Set(names).size !== names.length) {
                errors.push("Field names must be unique.")
            }

            // select needs at least 2 options to be useful
            fields.forEach((f) => {
                if (OPTION_TYPES.includes(f.type)) {
                    const opts = (f.options || "")
                        .split(",")
                        .map((o) => o.trim())
                        .filter(Boolean)
                    if (opts.length < 2) {
                        errors.push(
                            `"${f.name || "Unnamed"}" (${f.type}): Must have at least 2 options.`
                        )
                    }
                }
            })
        }

        if (currentStep === 2) {
            fields.forEach((f) => {


                // Range validation (number/date)
                if (f.type === "number") {
                    const minV = f.minValue !== "" ? Number(f.minValue) : null
                    const maxV = f.maxValue !== "" ? Number(f.maxValue) : null
                    if (minV !== null && maxV !== null && minV > maxV) {
                        errors.push(`"${f.name || "Unnamed"}": Min value cannot exceed max value.`)
                    }
                }

                // Validate regex pattern
                if (f.pattern) {
                    try {
                        new RegExp(f.pattern)
                    } catch {
                        errors.push(`"${f.name || "Unnamed"}": Invalid regex pattern.`)
                    }
                }
            })
        }

        return { canProceed: errors.length === 0, errors }
    }, [currentStep, fields])

    // extra inputs shown under a field based on its type (options, accept, placeholder)
    const renderTypeConfig = (field, index) => {
        if (OPTION_TYPES.includes(field.type)) {
            return (
                <div className="mt-2">
                    <input
                        type="text"
                        placeholder="Options (comma-separated, e.g. Red, Green, Blue)"
                        value={field.options || ""}
                        onChange={(e) => updateField(index, "options", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {field.options && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {(field.options || "").split(",").map((opt, i) => {
                                const trimmed = opt.trim()
                                return trimmed ? (
                                    <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                        {trimmed}
                                    </span>
                                ) : null
                            })}
                        </div>
                    )}
                </div>
            )
        }

        if (field.type === "file") {
            return (
                <div className="mt-2">
                    <select
                        value={field.acceptPreset || ""}
                        onChange={(e) => {
                            const preset = e.target.value
                            updateField(index, "acceptPreset", preset)
                            if (preset !== "__custom__") {
                                updateField(index, "accept", preset)
                            }
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {FILE_ACCEPT_PRESETS.map((p) => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                    </select>
                    {field.acceptPreset === "__custom__" && (
                        <input
                            type="text"
                            placeholder="e.g. .pdf,.jpg,.png"
                            value={field.accept}
                            onChange={(e) => updateField(index, "accept", e.target.value)}
                            className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    )}
                </div>
            )
        }

        if (field.type === "textarea") {
            return (
                <div className="mt-2">
                    <input
                        type="text"
                        placeholder="Placeholder text (e.g. Tell us about yourself...)"
                        value={field.placeholder || ""}
                        onChange={(e) => updateField(index, "placeholder", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            )
        }

        return null
    }

    // validation controls for step 2 — differs by field type
    const renderValidationConfig = (field, index) => {
        const showRangeFields = RANGE_TYPES.includes(field.type)
        const showPatternField = PATTERN_TYPES.includes(field.type)

        return (
            <>
                {/* Min/Max value — for number & date */}
                {showRangeFields && (
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <input
                            type={field.type === "date" ? "date" : "number"}
                            placeholder="Min value"
                            value={field.minValue || ""}
                            onChange={(e) => updateField(index, "minValue", e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                            type={field.type === "date" ? "date" : "number"}
                            placeholder="Max value"
                            value={field.maxValue || ""}
                            onChange={(e) => updateField(index, "maxValue", e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                )}

                {/* Regex pattern — preset dropdown + custom input */}
                {showPatternField && (
                    <div className="grid grid-cols-2 gap-2">
                        <select
                            value={field.patternPreset || ""}
                            onChange={(e) => {
                                const preset = e.target.value
                                updateField(index, "patternPreset", preset)
                                if (preset !== "__custom__") {
                                    updateField(index, "pattern", preset)
                                }
                            }}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {REGEX_PRESETS.map((p) => (
                                <option key={p.label} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                        {field.patternPreset === "__custom__" && (
                            <input
                                type="text"
                                placeholder="Custom regex (e.g. ^[A-Z]{3}$)"
                                value={field.pattern}
                                onChange={(e) => updateField(index, "pattern", e.target.value)}
                                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        )}
                    </div>
                )}
            </>
        )
    }

    // short summary line shown under each field in the review step
    const getFieldSummary = (f) => {
        const parts = []
        if (f.required) parts.push("required")
        if (f.minValue) parts.push(`min: ${f.minValue}`)
        if (f.maxValue) parts.push(`max: ${f.maxValue}`)
        if (f.pattern) parts.push("pattern ✓")
        if (OPTION_TYPES.includes(f.type) && f.options) {
            const count = (f.options || "").split(",").filter((o) => o.trim()).length
            parts.push(`${count} options`)
        }
        if (f.type === "file" && f.accept) parts.push(f.accept)
        if (f.type === "textarea" && f.placeholder) parts.push("has placeholder")
        return parts.join(" · ")
    }

    return (
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-2xl">
            <StepIndicator
                currentStep={currentStep}
                totalSteps={STEPS.length}
                steps={STEPS}
            />

            {/* Validation errors banner */}
            {validationErrors.length > 0 && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                    {validationErrors.map((err, i) => (
                        <p key={i} className="text-red-600 text-xs">{err}</p>
                    ))}
                </div>
            )}

            {/* Step 1 - Fields */}
            {currentStep === 1 && (
                <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-1">Define your fields</h2>
                    <p className="text-gray-400 text-sm mb-6">Add all the fields you want in your form</p>

                    <div className="space-y-4">
                        {fields.map((field, index) => (
                            <div key={field.id} className="p-4 bg-gray-50 rounded-xl">
                                <div className="flex gap-3 items-center">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            placeholder="Field name (e.g. Full Name)"
                                            value={field.name}
                                            onChange={(e) => updateField(index, "name", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <select
                                        value={field.type}
                                        onChange={(e) => updateField(index, "type", e.target.value)}
                                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {FIELD_TYPES.map((type) => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => removeField(index)}
                                        disabled={fields.length === 1}
                                        className="text-red-400 hover:text-red-600 disabled:opacity-30 text-lg font-bold"
                                        aria-label={`Remove field ${field.name || index + 1}`}
                                    >
                                        ×
                                    </button>
                                </div>
                                {/* Type-specific config (options, file accept, placeholder) */}
                                {renderTypeConfig(field, index)}
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={addField}
                        className="mt-4 w-full py-2 border-2 border-dashed border-blue-300 text-blue-500 rounded-xl hover:bg-blue-50 transition text-sm font-medium"
                    >
                        + Add Field
                    </button>
                </div>
            )}

            {/* Step 2 - Validation */}
            {currentStep === 2 && (
                <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-1">Set validation rules</h2>
                    <p className="text-gray-400 text-sm mb-6">Configure rules for each field</p>

                    <div className="space-y-4">
                        {fields.map((field, index) => (
                            <div key={field.id} className="p-4 bg-gray-50 rounded-xl">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="font-semibold text-gray-700 text-sm">
                                        {field.name || `Field ${index + 1}`}
                                        <span className="ml-2 text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">{field.type}</span>
                                    </span>
                                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={field.required}
                                            onChange={(e) => updateField(index, "required", e.target.checked)}
                                            className="accent-blue-600"
                                        />
                                        Required
                                    </label>
                                </div>

                                {renderValidationConfig(field, index)}

                                {/* If the type has no extra validation, show a hint */}
                                {!PATTERN_TYPES.includes(field.type) && !RANGE_TYPES.includes(field.type) && (
                                    <p className="text-gray-300 text-xs italic">
                                        Only the "Required" toggle applies to {field.type} fields.
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 3 - Layout */}
            {currentStep === 3 && (
                <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-1">Choose a layout</h2>
                    <p className="text-gray-400 text-sm mb-6">How should your form be structured?</p>

                    <div className="grid grid-cols-2 gap-4">
                        {LAYOUTS.map((l) => (
                            <button
                                key={l}
                                onClick={() => setLayout(l)}
                                className={`p-4 rounded-xl border-2 text-sm font-medium transition-all
                  ${layout === l
                                        ? "border-blue-500 bg-blue-50 text-blue-700"
                                        : "border-gray-200 text-gray-600 hover:border-blue-300"
                                    }`}
                            >
                                {l}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 4 - Review */}
            {currentStep === 4 && (
                <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-1">Review & Generate</h2>
                    <p className="text-gray-400 text-sm mb-6">Confirm your form configuration</p>

                    <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
                        <div>
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Layout</span>
                            <p className="text-gray-700 font-medium mt-1">{layout}</p>
                        </div>
                        <div>
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Fields ({fields.length})</span>
                            <div className="mt-2 space-y-2">
                                {fields.map((f) => (
                                    <div key={f.id} className="text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block flex-shrink-0" />
                                            <span className="font-medium">{f.name}</span>
                                            <span className="text-gray-400">({f.type})</span>
                                            {f.required && <span className="text-red-400 text-xs">required</span>}
                                        </div>
                                        {/* Show summary of options/validation */}
                                        {getFieldSummary(f) && (
                                            <p className="ml-4 text-xs text-gray-400 mt-0.5">{getFieldSummary(f)}</p>
                                        )}
                                        {/* Show select options as tags */}
                                        {OPTION_TYPES.includes(f.type) && (f.options || "") && (
                                            <div className="ml-4 flex flex-wrap gap-1 mt-1">
                                                {(f.options || "").split(",").map((opt, i) => {
                                                    const trimmed = opt.trim()
                                                    return trimmed ? (
                                                        <span key={i} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                                                            {trimmed}
                                                        </span>
                                                    ) : null
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl transition-all"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                                Generating... (this may take 1-2 min)
                            </span>
                        ) : "Generate Form"}
                    </button>
                </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8">
                <button
                    onClick={() => {
                        setValidationErrors([])
                        setCurrentStep((s) => s - 1)
                    }}
                    disabled={currentStep === 1}
                    className="px-5 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 font-medium"
                >
                    ← Back
                </button>
                {currentStep < STEPS.length && (
                    <button
                        onClick={() => {
                            if (!stepValidation.canProceed) {
                                setValidationErrors(stepValidation.errors)
                                return
                            }
                            setValidationErrors([])
                            setCurrentStep((s) => s + 1)
                        }}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
                    >
                        Next →
                    </button>
                )}
            </div>
        </div>
    )
}

export default Wizard