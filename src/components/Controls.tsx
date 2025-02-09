import React from 'react';
import { Play, Pause, SkipForward, RotateCcw } from 'lucide-react';

interface ControlsProps {
  isRunning: boolean;
  onPlayPause: () => void;
  onStep: () => void;
  onReset: () => void;
}

export function Controls({ isRunning, onPlayPause, onStep, onReset }: ControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4 my-4">
      <button
        onClick={onPlayPause}
        className="p-2 rounded-full hover:bg-gray-100"
        title={isRunning ? 'Pause' : 'Play'}
      >
        {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
      </button>
      <button
        onClick={onStep}
        className="p-2 rounded-full hover:bg-gray-100"
        title="Step Forward"
      >
        <SkipForward className="w-6 h-6" />
      </button>
      <button
        onClick={onReset}
        className="p-2 rounded-full hover:bg-gray-100"
        title="Reset"
      >
        <RotateCcw className="w-6 h-6" />
      </button>
    </div>
  );
}