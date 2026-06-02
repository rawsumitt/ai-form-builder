const StepIndicator = ({ currentStep, totalSteps, steps }) => {
    return (
        <div className="flex items-center justify-center mb-8">
            {steps.map((step, index) => {
                const stepNumber = index + 1
                const isCompleted = stepNumber < currentStep
                const isActive = stepNumber === currentStep

                return (
                    <div key={index} className="flex items-center">
                        <div className="flex flex-col items-center">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300
                  ${isCompleted ? "bg-green-500 text-white" : ""}
                  ${isActive ? "bg-blue-600 text-white ring-4 ring-blue-100" : ""}
                  ${!isCompleted && !isActive ? "bg-gray-200 text-gray-500" : ""}
                `}
                            >
                                {isCompleted ? "✓" : stepNumber}
                            </div>
                            <span
                                className={`text-xs mt-1 font-medium
                  ${isActive ? "text-blue-600" : "text-gray-400"}
                `}
                            >
                                {step}
                            </span>
                        </div>

                        {index < totalSteps - 1 && (
                            <div
                                className={`w-16 h-0.5 mx-2 mb-4 transition-all duration-300
                  ${isCompleted ? "bg-green-500" : "bg-gray-200"}
                `}
                            />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

export default StepIndicator