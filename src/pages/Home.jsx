import { useState, lazy, Suspense, useCallback, useEffect } from "react"
import Wizard from "../components/Wizard"
import FormPreview from "../components/FormPreview"
import useOllama from "../hooks/useOllama"
import { buildPrompt } from "../utils/buildPrompt"

const CodeEditor = lazy(() => import("../components/CodeEditor"))

const loadingMessages = [
    "Reading your form specs...",
    "Thinking about the structure...",
    "Writing the component...",
    "Adding validations...",
    "Almost done..."
]

const Home = () => {
    const { code, loading, error, isValidOutput, generateForm, cancelGeneration } = useOllama()
    const [generated, setGenerated] = useState(false)
    const [msgIndex, setMsgIndex] = useState(0)

    const handleGenerate = useCallback(async (fields, layout) => {
        const prompt = buildPrompt(fields, layout)
        const success = await generateForm(prompt, fields)
        if (success) {
            setGenerated(true)
        }
    }, [generateForm])

    useEffect(() => {
        if (!loading) {
            setMsgIndex(0)
            return
        }
        const interval = setInterval(() => {
            setMsgIndex((i) => (i + 1) % loadingMessages.length)
        }, 15000)
        return () => clearInterval(interval)
    }, [loading])

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            <div className="max-w-7xl mx-auto px-6 py-10">

                {/* header */}
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
                        AI Form Builder
                    </h1>
                    <p className="text-gray-400 text-base">
                        Describe your form — let AI build it for you
                    </p>
                </div>

                {/* error banner */}
                {error && (
                    <div className="max-w-2xl mx-auto mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
                        ⚠️ {error}
                    </div>
                )}

                {/* warn if the model output looked sketchy */}
                {!isValidOutput && code && (
                    <div className="max-w-2xl mx-auto mb-6 px-4 py-3 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-xl text-sm">
                        ⚠️ Output may be incomplete or invalid. Try regenerating.
                    </div>
                )}

                {/* Layout */}
                <div className={`flex flex-col ${(generated || loading) ? "lg:flex-row" : "items-center"} gap-8`}>

                    {/* wizard is always visible */}
                    <div className={(generated || loading) ? "lg:w-1/3" : "w-full max-w-2xl"}>
                        <Wizard onGenerate={handleGenerate} loading={loading} />
                    </div>

                    {/* right panel: loading spinner or preview + editor */}
                    {(generated || loading) && (
                        <div className="flex-1 flex flex-col gap-6">
                            {loading ? (
                                <div className="bg-white rounded-2xl shadow-lg h-64 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
                                        <p className="text-gray-600 text-sm font-semibold animate-pulse">
                                            {loadingMessages[msgIndex]}
                                        </p>
                                        <p className="text-gray-400 text-xs mt-2">
                                            CPU inference can take 1–2 minutes
                                        </p>
                                        {/* cancel button */}
                                        <button
                                            onClick={cancelGeneration}
                                            className="mt-3 text-sm text-gray-400 hover:text-gray-600 underline"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <FormPreview code={code} />
                                    <Suspense
                                        fallback={
                                            <div className="bg-white rounded-2xl shadow-lg h-64 flex items-center justify-center">
                                                <p className="text-gray-400 text-sm">Loading code editor...</p>
                                            </div>
                                        }
                                    >
                                        <CodeEditor code={code} />
                                    </Suspense>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Home