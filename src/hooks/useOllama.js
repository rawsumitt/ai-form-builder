import { useState, useRef, useCallback } from "react"

const OLLAMA_BASE = import.meta.env.VITE_OLLAMA_API_URL || "http://localhost:11434"
const OLLAMA_URL = `${OLLAMA_BASE}/api/generate`
const OLLAMA_MODEL = "llama3.2:3b"
const REQUEST_TIMEOUT_MS = 600_000 // 10 min, enough for a cold model load

// "Full Name" -> "fullName"
const toVarName = (name) => {
    const raw = name
        .trim()
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
        .replace(/^\s/, "") || "field"
    return raw.charAt(0).toLowerCase() + raw.slice(1)
}

// llama often wraps output in ```jsx ... ``` — strip that
const extractCode = (raw) => {
    if (!raw || typeof raw !== "string") return ""
    const fenceMatch = raw.match(/```(?:jsx?|tsx?|javascript)?\s*\n([\s\S]*?)```/)
    return fenceMatch ? fenceMatch[1].trim() : raw.trim()
}

// quick check that the output actually looks like a React component
const isValidComponent = (code) =>
    code.includes("function GeneratedForm") &&
    code.includes("return") &&
    (code.includes("React.createElement") || code.includes("JSX") || code.includes("<"))

const useOllama = () => {
    const [code, setCode] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [isValidOutput, setIsValidOutput] = useState(true)
    const abortControllerRef = useRef(null)

    const generateForm = useCallback(async (prompt, fields = []) => {
        // kill any previous request first
        abortControllerRef.current?.abort()

        const controller = new AbortController()
        abortControllerRef.current = controller

        // need to know if the abort came from the timeout or the user hitting Cancel
        let timedOut = false
        const timeoutId = setTimeout(() => {
            timedOut = true
            controller.abort()
        }, REQUEST_TIMEOUT_MS)

        setLoading(true)
        setError(null)
        setCode("")
        setIsValidOutput(true)

        try {
            const response = await fetch(OLLAMA_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: OLLAMA_MODEL,
                    prompt,
                    stream: false,
                    options: {
                        temperature: 0.2, // low = more predictable output
                    },
                }),
                signal: controller.signal,
            })

            if (!response.ok) {
                const status = response.status
                if (status === 404) {
                    throw new Error(
                        `Model "${OLLAMA_MODEL}" not found. Run: ollama pull ${OLLAMA_MODEL}`
                    )
                }
                throw new Error(
                    `Ollama returned HTTP ${status}. Make sure Ollama is running and the model is available.`
                )
            }

            const data = await response.json()

            if (!data.response) {
                throw new Error("Ollama returned an empty response. Try again.")
            }

            const cleaned = extractCode(data.response)

            // if the model forgot the function wrapper, build one around the raw output
            let finalCode = cleaned
            if (!cleaned.includes("function GeneratedForm")) {
                const stateDecls = fields.map(field => {
                    const v = toVarName(field.name)
                    const init = field.type === "checkbox" ? "false" : field.type === "file" ? "null" : '""'
                    return `  const [${v}, set${v.charAt(0).toUpperCase() + v.slice(1)}] = React.useState(${init});`
                }).join("\n")

                finalCode = `function GeneratedForm() {
${stateDecls}
  const [errors, setErrors] = React.useState({});
  const handleSubmit = (e) => { e.preventDefault(); };
  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-8 bg-white rounded-2xl shadow-lg">
      ${cleaned}
    </form>
  );
}`
                setIsValidOutput(false)
            }

            // model used errors/setErrors but forgot to declare the state
            if (
                (finalCode.includes("errors.") || finalCode.includes("setErrors(")) &&
                !finalCode.includes("[errors, setErrors]")
            ) {
                finalCode = finalCode.replace(
                    "function GeneratedForm() {",
                    "function GeneratedForm() {\n  const [errors, setErrors] = React.useState({});"
                )
            }

            // model built newErrors but forgot to call setErrors
            if (
                finalCode.includes("const newErrors") &&
                !finalCode.includes("setErrors(newErrors)")
            ) {
                finalCode = finalCode.replace(
                    "if (Object.keys(newErrors).length === 0)",
                    "setErrors(newErrors);\n    if (Object.keys(newErrors).length === 0)"
                )
            }

            // model referenced handleSubmit but never defined it
            if (
                finalCode.includes("handleSubmit") &&
                !finalCode.includes("const handleSubmit") &&
                !finalCode.includes("function handleSubmit")
            ) {
                finalCode = finalCode.replace(
                    /return\s*\(/,
                    `const handleSubmit = (e) => {\n    e.preventDefault();\n    alert("Submitted!");\n  };\n\n  return (`
                )
            }

            // model used a field variable but forgot to declare its useState
            fields.forEach(field => {
                const v = toVarName(field.name)
                const stateStr = `[${v},`
                if (finalCode.includes(v) && !finalCode.includes(stateStr)) {
                    const init = field.type === "checkbox" ? "false" : field.type === "file" ? "null" : '""'
                    finalCode = finalCode.replace(
                        "function GeneratedForm() {",
                        `function GeneratedForm() {\n  const [${v}, set${v.charAt(0).toUpperCase() + v.slice(1)}] = React.useState(${init});`
                    )
                }
            })

            // CRITICAL: Strip 'value' from file inputs to avoid InvalidStateError in React
            finalCode = finalCode.replace(/<input([^>]*?)>/gi, (match) => {
                if (match.includes('type="file"') || match.includes("type='file'") || match.includes('type={file}') || match.includes('type={"file"}')) {
                    return match
                        .replace(/\s*value=\{[^}]+\}/gi, '')
                        .replace(/\s*value="[^"]*"/gi, '')
                        .replace(/\s*value='[^']*'/gi, '')
                }
                return match
            })

            if (!isValidComponent(finalCode)) {
                setIsValidOutput(false)
            }

            setCode(finalCode)
            return true
        } catch (err) {
            if (err.name === "AbortError") {
                // timeout shows an error, manual cancel is silent
                if (timedOut) {
                    setError("Request timed out. Ollama may be overloaded — please try again.")
                }
                return false
            }

            if (err instanceof TypeError && err.message.includes("fetch")) {
                setError(`Cannot connect to Ollama. Make sure it is running on ${OLLAMA_BASE.replace(/^https?:\/\//, "")}.`)
            } else {
                setError(err.message || "An unexpected error occurred.")
            }
            return false
        } finally {
            clearTimeout(timeoutId)
            setLoading(false)
        }
    }, [])

    const cancelGeneration = useCallback(() => {
        abortControllerRef.current?.abort()
        setLoading(false)
    }, [])

    return { code, loading, error, isValidOutput, generateForm, cancelGeneration }
}

export default useOllama