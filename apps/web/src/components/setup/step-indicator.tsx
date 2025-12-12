'use client';

import { CheckCircle, Circle } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  steps: string[];
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-1 mb-8 flex-wrap">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        const isPending = stepNumber > currentStep;

        return (
          <div key={step} className="flex items-center">
            <div className="flex items-center gap-1">
              {isCompleted && (
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              )}
              {isCurrent && (
                <Circle className="w-4 h-4 text-blue-500 fill-blue-500 flex-shrink-0" />
              )}
              {isPending && (
                <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
              )}
              <span
                className={`text-xs whitespace-nowrap ${
                  isCurrent
                    ? 'font-semibold text-white'
                    : isCompleted
                      ? 'text-green-400'
                      : 'text-gray-400'
                }`}
              >
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-4 h-0.5 mx-1 flex-shrink-0 ${
                  isCompleted ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
