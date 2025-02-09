import React, { useState } from "react";
import { CodeEditor } from "./components/CodeEditor";
import { Controls } from "./components/Controls";
import { DebuggerMenu } from "./components/DebuggerMenu";
import { MemoryVisualizer } from "./components/MemoryVisualizer";
import { useWebSocket } from "./hooks/useWebSocket";
import type { ExecutionState } from "./types";

const initialExecutionState: ExecutionState = {
  stack: [],
  heap: [],
  methodArea: [],
  stringPool: [],
  currentLine: 0,
  isRunning: false,
  breakpoints: [],
};

function App() {
  const [code, setCode] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [executionState, setExecutionState] = useState<ExecutionState>(
    initialExecutionState
  );

  const handleWebSocketMessage = (data: any) => {
    if (data.type === "error") {
      setIsRunning(false);
      // TODO: Add error handling UI
      return;
    }
    console.log("Data received");
    console.log(data);

    setExecutionState((prevState) => ({
      ...prevState,
      ...data.memoryState,
      currentLine: data.stepNumber,
    }));
  };

  const { sendMessage } = useWebSocket(
    import.meta.env.VITE_WS_URL || "ws://localhost:3001",
    handleWebSocketMessage
  );

  const handleRun = () => {
    setIsRunning(true);
    sendMessage({
      type: "execute",
      code: code,
    });
  };

  const handlePlayPause = () => {
    setIsRunning(!isRunning);
    sendMessage({
      type: isRunning ? "pause" : "resume",
    });
  };

  const handleStep = () => {
    sendMessage({
      type: "step",
      stepNumber: executionState.currentLine + 1,
    });
  };

  const handleReset = () => {
    setExecutionState(initialExecutionState);
    setIsRunning(false);
    sendMessage({
      type: "reset",
    });
  };

  const handleToggleBreakpoint = (line: number) => {
    const newBreakpoints = executionState.breakpoints.includes(line)
      ? executionState.breakpoints.filter((bp) => bp !== line)
      : [...executionState.breakpoints, line];

    setExecutionState((prev) => ({
      ...prev,
      breakpoints: newBreakpoints,
    }));

    sendMessage({
      type: "updateBreakpoints",
      breakpoints: newBreakpoints,
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <CodeEditor
              code={code}
              onCodeChange={setCode}
              onRun={handleRun}
              isRunning={isRunning}
            />
          </div>
          <div>
            <DebuggerMenu
              currentLine={executionState.currentLine}
              breakpoints={executionState.breakpoints}
              onToggleBreakpoint={handleToggleBreakpoint}
              variables={[]} // TODO: Add variable tracking
            />
          </div>
        </div>

        <Controls
          isRunning={isRunning}
          onPlayPause={handlePlayPause}
          onStep={handleStep}
          onReset={handleReset}
        />

        <MemoryVisualizer executionState={executionState} />
      </div>
    </div>
  );
}

export default App;
