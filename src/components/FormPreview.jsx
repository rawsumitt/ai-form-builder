import { useMemo } from "react"
import { buildHtml } from "../utils/buildHtml"

const FormPreview = ({ code }) => {
    // Memoised so we don't rebuild on every re-render.
    // Hook is called unconditionally to satisfy Rules of Hooks.
    const htmlContent = useMemo(() => buildHtml(code), [code])

    // Show placeholder when there's no code
    if (!code) {
        return (
            <div className="bg-white rounded-2xl shadow-lg w-full h-64 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-4xl mb-3">👁️</div>
                    <p className="text-gray-400 text-sm font-medium">Live preview will appear here</p>
                    <p className="text-gray-300 text-xs mt-1">Generate a form to see it rendered</p>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden w-full">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <span className="text-sm text-gray-400 font-medium">Live Preview</span>
                <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full font-medium">
                    ● Live
                </span>
            </div>
            <iframe
                srcDoc={htmlContent}
                title="Form Preview"
                className="w-full"
                style={{ height: "450px", border: "none" }}
                sandbox="allow-scripts"
            />
        </div>
    )
}

export default FormPreview