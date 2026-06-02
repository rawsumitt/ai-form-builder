// "Full Name" -> "fullName", used to tell the model what variable name to use
const toVarName = (name) => {
  const raw = name
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^\s/, "") || "field"
  return raw.charAt(0).toLowerCase() + raw.slice(1)
}

// returns an onKeyDown snippet to block invalid key presses for a given field
const getKeyDownRule = (field) => {
  const typableTypes = ["text", "tel", "password", "textarea"]
  if (!typableTypes.includes(field.type)) return ""

  if (field.pattern) {
    const p = field.pattern
    const hasLetters = /A-Za-z/.test(p)
    const hasDigits = /\\d/.test(p)
    const hasSpecial = /\\S|https?|@/.test(p) // url, email, etc.

    if (hasLetters && !hasDigits && !hasSpecial) {
      return `onKeyDown={(e) => { if (e.key.length === 1 && !/^[A-Za-z ]$/.test(e.key)) e.preventDefault(); }}`
    }
    if (hasDigits && !hasLetters && !hasSpecial) {
      return `onKeyDown={(e) => { if (e.key.length === 1 && !/^\\d$/.test(e.key)) e.preventDefault(); }}`
    }
    return ""
  }

  // tel with no pattern -> digits only
  if (field.type === "tel") {
    return `onKeyDown={(e) => { if (e.key.length === 1 && !/^\\d$/.test(e.key)) e.preventDefault(); }}`
  }

  return ""
}

// builds the validation lines that go inside handleSubmit for a single field
const getValidationCode = (field) => {
  const v = toVarName(field.name)
  const label = field.name
  const lines = []

  if (field.required) {
    if (field.type === "checkbox") {
      lines.push(`if (!${v}) newErrors.${v} = "${label} must be checked";`)
    } else if (field.type === "file") {
      lines.push(`if (!${v} || ${v}.length === 0) newErrors.${v} = "${label} is required";`)
    } else if (field.type === "select") {
      lines.push(`if (!${v}) newErrors.${v} = "Please select a ${label}";`)
    } else if (field.type === "number") {
      lines.push(`if (${v} === "" || ${v} === null || ${v} === undefined) newErrors.${v} = "${label} is required";`)
    } else {
      lines.push(`if (!${v}.trim()) newErrors.${v} = "${label} is required";`)
    }
  }

  if (field.pattern && !["checkbox", "file", "select", "number", "date"].includes(field.type)) {
    lines.push(`if (${v} && !/${field.pattern}/.test(${v})) newErrors.${v} = "Invalid ${label} format";`)
  }

  // built-in format checks (skipped if the user already set a custom pattern)
  if (field.type === "email" && !field.pattern) {
    lines.push(`if (${v} && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(${v})) newErrors.${v} = "Invalid email address";`)
  }
  if (field.type === "tel" && !field.pattern) {
    lines.push(`if (${v} && !/^\\d{10}$/.test(${v})) newErrors.${v} = "Must be a 10-digit phone number";`)
  }

  if (field.type === "number") {
    if (field.minValue !== "") {
      lines.push(`if (${v} !== "" && Number(${v}) < ${field.minValue}) newErrors.${v} = "${label} must be at least ${field.minValue}";`)
    }
    if (field.maxValue !== "") {
      lines.push(`if (${v} !== "" && Number(${v}) > ${field.maxValue}) newErrors.${v} = "${label} must be at most ${field.maxValue}";`)
    }
  }

  if (field.type === "date") {
    if (field.minValue) {
      lines.push(`if (${v} && ${v} < "${field.minValue}") newErrors.${v} = "${label} must be on or after ${field.minValue}";`)
    }
    if (field.maxValue) {
      lines.push(`if (${v} && ${v} > "${field.maxValue}") newErrors.${v} = "${label} must be on or before ${field.maxValue}";`)
    }
  }

  return lines
}

// returns HTML attributes (min, max, maxLength, accept) for a field's input
const getHtmlAttributes = (field) => {
  const attrs = []
  const lengthTypes = ["text", "email", "password", "textarea", "tel"]
  const rangeTypes = ["number", "date"]

  if (lengthTypes.includes(field.type)) {
    if (field.pattern) {
      // try to pull a fixed length out of patterns like ^\d{10}$
      const exactLen = field.pattern.match(/\{(\d+)\}\$/)
      if (exactLen) {
        attrs.push(`maxLength={${exactLen[1]}}`)
      }
    } else if (field.type === "tel") {
      attrs.push(`maxLength={10}`)
    }
  }

  if (rangeTypes.includes(field.type)) {
    if (field.minValue) attrs.push(`min="${field.minValue}"`)
    if (field.maxValue) attrs.push(`max="${field.maxValue}"`)
  }
  if (field.type === "file" && field.accept) {
    attrs.push(`accept="${field.accept}"`)
  }

  return attrs.join(" ")
}

export const buildPrompt = (fields, layout) => {
  const layoutInstruction = {
    "single-column": "single full-width column, each field takes full width",
    "two-column": 'CSS grid 2 columns: wrap all fields in <div className="grid grid-cols-2 gap-4"> inside the form',
    "card-sections": 'card sections layout: wrap each individual field container in a separate card container <div className="bg-white p-6 rounded-xl shadow-md mb-4"> inside the form',
    "multi-step": 'all fields visible, add <hr className="border-t my-4"> between every 2 fields',
  }

  const fieldInstructions = fields.map((field) => {
    const v = toVarName(field.name)
    const keyDown = getKeyDownRule(field)
    const validationLines = getValidationCode(field)
    const htmlAttrs = getHtmlAttributes(field)

    const lines = [
      `Field name: "${field.name}" | variable: ${v} | type: ${field.type}`,
    ]

    if (field.type === "select" && field.options) {
      const opts = field.options.split(",").map((o) => o.trim()).filter(Boolean)
      lines.push(`  render: <select> with options: ${opts.map(o => `<option value="${o}">${o}</option>`).join(", ")}`)
      lines.push(`  init state: React.useState("")`)
    } else if (field.type === "textarea") {
      lines.push(`  render: <textarea rows={4}${field.placeholder ? ` placeholder="${field.placeholder}"` : ""}>`)
      lines.push(`  init state: React.useState("")`)
    } else if (field.type === "checkbox") {
      lines.push(`  render: <input type="checkbox"> with label, use className="flex items-center gap-2"`)
      lines.push(`  init state: React.useState(false)`)
    } else if (field.type === "file") {
      lines.push(`  render: <input type="file"${field.accept ? ` accept="${field.accept}"` : ""}> — CRITICAL: Do NOT include a 'value' attribute on file inputs (i.e. NO value={${v}}), as file inputs in React must be uncontrolled.`)
      lines.push(`  init state: React.useState(null) — use onChange={(e) => set${v.charAt(0).toUpperCase() + v.slice(1)}(e.target.files)}`)
    } else if (field.type === "number") {
      lines.push(`  render: <input type="number"${htmlAttrs ? ` ${htmlAttrs}` : ""}>`)
      lines.push(`  init state: React.useState("")`)
    } else if (field.type === "date") {
      lines.push(`  render: <input type="date"${htmlAttrs ? ` ${htmlAttrs}` : ""}>`)
      lines.push(`  init state: React.useState("")`)
    } else if (field.type === "password") {
      lines.push(`  render: <input type="password"${htmlAttrs ? ` ${htmlAttrs}` : ""}>`)
      lines.push(`  init state: React.useState("")`)
    } else if (field.type === "email") {
      lines.push(`  render: <input type="email"${htmlAttrs ? ` ${htmlAttrs}` : ""}>`)
      lines.push(`  init state: React.useState("")`)
    } else {
      lines.push(`  render: <input type="${field.type}"${htmlAttrs ? ` ${htmlAttrs}` : ""}>`)
      lines.push(`  init state: React.useState("")`)
    }

    if (keyDown) {
      lines.push(`  add to input: ${keyDown}`)
    }

    if (validationLines.length > 0) {
      lines.push(`  validation (in handleSubmit):`)
      validationLines.forEach((l) => lines.push(`    ${l}`))
    }

    return lines.join("\n")
  }).join("\n\n")

  const stateDeclarations = fields.map((field) => {
    const v = toVarName(field.name)
    const init = field.type === "checkbox" ? "false" : field.type === "file" ? "null" : '""'
    return `  const [${v}, set${v.charAt(0).toUpperCase() + v.slice(1)}] = React.useState(${init});`
  }).join("\n")

  return `You are a React form expert. Generate ONLY a functional component named "GeneratedForm". No imports, no markdown, no backticks. Raw JSX only.

Layout: ${layoutInstruction[layout] || "single full-width column"}

Fields:
${fieldInstructions}

Styling:
- Form wrapper: className="max-w-2xl mx-auto p-8 bg-white rounded-2xl shadow-lg"
- Field wrapper: className="flex flex-col gap-1"
- Label: className="block text-sm font-medium text-gray-700 mb-1"
- Input/select/textarea: className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
- Error: className="text-red-500 text-xs mt-1"
- Submit: className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition mt-4"

Use this EXACT structure. You MUST include and define the 'handleSubmit' function in your output component:
function GeneratedForm() {
${stateDeclarations}
  const [errors, setErrors] = React.useState({});
  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    // paste ALL validation lines from each field above here
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) alert("Submitted!");
  };
  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-8 bg-white rounded-2xl shadow-lg">
      {/* render each field with its label, input, and error */}
      <button type="submit" className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition mt-4">Submit</button>
    </form>
  );
}`
}