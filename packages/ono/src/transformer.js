/**
 * Transformer - Convert JSX to JavaScript using TypeScript compiler
 */

import ts from "typescript";

/**
 * Transform JSX code to JavaScript
 * @param {string} source - JSX source code
 * @param {string} [filename='input.jsx'] - Optional filename for better error messages
 * @returns {string} Transformed JavaScript code
 */
export function transformJSX(source, filename = 'input.jsx') {
  // TypeScript compiler options
  const compilerOptions = {
    jsx: ts.JsxEmit.React,
    jsxFactory: 'h',
    jsxFragmentFactory: 'Fragment',
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ESNext,
    esModuleInterop: true,
  };

  // Transpile the code
  const result = ts.transpileModule(source, {
    compilerOptions,
    fileName: filename,
  });

  return result.outputText;
}
