export interface StackFrame {
  methodName: string;
  variables: Variable[];
  returnAddress: number;
}

export interface Variable {
  name: string;
  type: string;
  value: any;
  reference?: string;
}

export interface HeapObject {
  id: string;
  type: string;
  fields: Variable[];
  references: number;
}

export interface StringPoolEntry {
  value: string;
  references: number;
}

export interface MethodArea {
  className: string;
  staticVariables: Variable[];
}

export interface ExecutionState {
  stack: StackFrame[];
  heap: HeapObject[];
  methodArea: MethodArea[];
  stringPool: StringPoolEntry[];
  currentLine: number;
  isRunning: boolean;
  breakpoints: number[];
}