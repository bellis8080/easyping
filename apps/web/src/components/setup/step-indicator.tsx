'use client';

import { CheckCircle, Circle } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  steps: string[];
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        const isPending = stepNumber > currentStep;

        return (
          <div key={step} className="flex items-center">
            <div className="flex items-center gap-2">
              {isCompleted && (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
              {isCurrent && (
                <Circle className="w-5 h-5 text-blue-500 fill-blue-500" />
              )}
              {isPending && <Circle className="w-5 h-5 text-gray-300" />}
              <span
                className={`text-sm ${
                  isCurrent
                    ? 'font-semibold text-gray-900'
                    : isCompleted
                      ? 'text-green-600'
                      : 'text-gray-400'
                }`}
              >
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-8 h-0.5 mx-2 ${
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
