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

/**
 * Transform JSX file and add necessary imports if not present
 * @param {string} source - JSX source code
 * @param {string} [filename='input.jsx'] - Optional filename
 * @returns {string} Transformed JavaScript with imports
 */
export function transformJSXWithImports(source, filename = 'input.jsx') {
  let transformedCode = transformJSX(source, filename);

  // Check if the code uses 'h' function (JSX was transformed)
  if (transformedCode.includes('h(') && !source.includes('import') && !source.includes('from')) {
    // Add import statement for h function (and Fragment if used)
    const usesFragment = transformedCode.includes('Fragment');
    const imports = usesFragment ? '{ h, Fragment }' : '{ h }';
    transformedCode = `import ${imports} from './jsx-runtime.js';\n${transformedCode}`;
  }

  return transformedCode;
}
