import React from 'react';
import { Box, Cpu, Database, Quote } from 'lucide-react';
import type { ExecutionState } from '../types';

interface MemoryVisualizerProps {
  executionState: ExecutionState;
}

export function MemoryVisualizer({ executionState }: MemoryVisualizerProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Box className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold">Stack Memory</h3>
          </div>
          <div className="space-y-2">
            {executionState.stack.map((frame, index) => (
              <div key={index} className="border rounded p-2 bg-purple-50">
                <div className="font-semibold text-sm">{frame.methodName}</div>
                {frame.variables.map((variable, vIndex) => (
                  <div key={vIndex} className="text-sm flex justify-between">
                    <span>{variable.name}: {variable.type}</span>
                    <span className="text-gray-600">{variable.value}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold">Heap Memory</h3>
          </div>
          <div className="space-y-2">
            {executionState.heap.map((object) => (
              <div key={object.id} className="border rounded p-2 bg-green-50">
                <div className="font-semibold text-sm">{object.type} @{object.id}</div>
                {object.fields.map((field, fIndex) => (
                  <div key={fIndex} className="text-sm flex justify-between">
                    <span>{field.name}: {field.type}</span>
                    <span className="text-gray-600">{field.value}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold">Method Area</h3>
          </div>
          <div className="space-y-2">
            {executionState.methodArea.map((area, index) => (
              <div key={index} className="border rounded p-2 bg-blue-50">
                <div className="font-semibold text-sm">{area.className}</div>
                {area.staticVariables.map((variable, vIndex) => (
                  <div key={vIndex} className="text-sm flex justify-between">
                    <span>{variable.name}: {variable.type}</span>
                    <span className="text-gray-600">{variable.value}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Quote className="w-5 h-5 text-yellow-600" />
            <h3 className="font-semibold">String Pool</h3>
          </div>
          <div className="space-y-2">
            {executionState.stringPool.map((entry, index) => (
              <div key={index} className="border rounded p-2 bg-yellow-50">
                <div className="text-sm flex justify-between">
                  <span className="font-mono">{entry.value}</span>
                  <span className="text-gray-600">refs: {entry.references}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}