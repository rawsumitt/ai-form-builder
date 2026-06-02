import Editor from "@monaco-editor/react"
import { useState, useCallback, useMemo } from "react"
import { buildHtml } from "../utils/buildHtml"

const CodeEditor = ({ code }) => {
    const [activeTab, setActiveTab] = useState("react") // "react" | "html"
    const [copied, setCopied] = useState(false)
    const [copyError, setCopyError] = useState(false)

    const htmlCode = useMemo(() => buildHtml(code), [code])

    const activeCode = activeTab === "react" ? code : htmlCode
    const editorLanguage = activeTab === "react" ? "javascript" : "html"
    const fileName = activeTab === "react" ? "GeneratedForm.jsx" : "generated-form.html"

    const handleCopy = useCallback(async () => {
        if (!activeCode) return
        try {
            await navigator.clipboard.writeText(activeCode)
            setCopied(true)
            setCopyError(false)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // clipboard API not available, fall back to execCommand
            try {
                const textarea = document.createElement("textarea")
                textarea.value = activeCode
                textarea.style.position = "fixed"
                textarea.style.opacity = "0"
                document.body.appendChild(textarea)
                textarea.select()
                document.execCommand("copy")
                document.body.removeChild(textarea)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
            } catch {
                setCopyError(true)
                setTimeout(() => setCopyError(false), 2000)
            }
        }
    }, [activeCode])

    const handleDownload = useCallback(() => {
        if (!htmlCode) return
        const blob = new Blob([htmlCode], { type: "text/html" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "generated-form.html"
        a.click()
        URL.revokeObjectURL(url)
    }, [htmlCode])

    return (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden w-full">

            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">

                <div className="flex items-center gap-2">
                    {/* macOS-style traffic lights */}
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />

                    <div className="ml-3 flex gap-1 bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setActiveTab("react")}
                            className={`text-xs px-3 py-1 rounded-md font-medium transition-all ${
                                activeTab === "react"
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            ⚛ React JSX
                        </button>
                        <button
                            onClick={() => setActiveTab("html")}
                            className={`text-xs px-3 py-1 rounded-md font-medium transition-all ${
                                activeTab === "html"
                                    ? "bg-white text-orange-500 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            🌐 Plain HTML
                        </button>
                    </div>

                    <span className="ml-2 text-sm text-gray-400 font-medium">{fileName}</span>
                </div>

                <div className="flex items-center gap-2">
                    {/* download only makes sense on the HTML tab */}
                    {activeTab === "html" && (
                        <button
                            onClick={handleDownload}
                            disabled={!htmlCode}
                            className="text-xs px-3 py-1.5 bg-orange-50 hover:bg-orange-100 disabled:opacity-40 text-orange-600 rounded-lg font-medium transition flex items-center gap-1"
                        >
                            ↓ Download .html
                        </button>
                    )}

                    <button
                        onClick={handleCopy}
                        disabled={!activeCode}
                        className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-600 rounded-lg font-medium transition"
                    >
                        {copyError ? "✗ Failed" : copied ? "✓ Copied!" : "Copy Code"}
                    </button>
                </div>
            </div>

            {/* key=activeTab forces a remount so Monaco picks up the new language */}
            <Editor
                key={activeTab}
                height="450px"
                language={editorLanguage}
                value={
                    activeCode ||
                    (activeTab === "react"
                        ? "// Your generated React JSX code will appear here..."
                        : "<!-- Your generated HTML code will appear here... -->")
                }
                theme="vs-dark"
                options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    padding: { top: 16 },
                }}
            />
        </div>
    )
}

export default CodeEditor