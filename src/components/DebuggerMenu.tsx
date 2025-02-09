import React from 'react';
import { Bug, List, Hash } from 'lucide-react';

interface DebuggerMenuProps {
  currentLine: number;
  breakpoints: number[];
  onToggleBreakpoint: (line: number) => void;
  variables: { name: string; value: string }[];
}

export function DebuggerMenu({ currentLine, breakpoints, onToggleBreakpoint, variables }: DebuggerMenuProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Bug className="w-5 h-5 text-red-600" />
        <h3 className="font-semibold">Debugger</h3>
      </div>
      
      <div className="space-y-4">
        <div className="border-b pb-2">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium">Current Line: {currentLine}</span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <List className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium">Variables</span>
          </div>
          <div className="bg-gray-50 rounded-md p-2 space-y-1">
            {variables.map((variable, index) => (
              <div key={index} className="text-sm flex justify-between">
                <span className="text-gray-700">{variable.name}</span>
                <span className="text-gray-600">{variable.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium">Breakpoints</span>
          </div>
          <div className="bg-gray-50 rounded-md p-2">
            {breakpoints.length > 0 ? (
              breakpoints.map((line, index) => (
                <div key={index} className="text-sm flex justify-between items-center">
                  <span>Line {line}</span>
                  <button
                    onClick={() => onToggleBreakpoint(line)}
                    className="text-red-600 hover:text-red-700 text-xs"
                  >
                    Remove
                  </button>
                </div>
              ))
            ) : (
              <span className="text-sm text-gray-500">No breakpoints set</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}