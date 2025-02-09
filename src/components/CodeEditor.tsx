import React from 'react';
import { Code } from 'lucide-react';

interface CodeEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  onRun: () => void;
  isRunning: boolean;
}

export function CodeEditor({ code, onCodeChange, onRun, isRunning }: CodeEditorProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Code className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Java Code Editor</h2>
        </div>
        <button
          onClick={onRun}
          disabled={isRunning}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isRunning ? 'Running...' : 'Run'}
        </button>
      </div>
      <textarea
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
        className="w-full h-64 p-4 font-mono text-sm bg-gray-50 rounded-md border focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="Enter Java code here..."
      />
    </div>
  );
}