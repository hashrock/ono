/**
 * Parser combinators and an ES module-syntax parser.
 *
 * Parses only what the bundler needs — import/export declarations and
 * top-level function names — using parser combinators instead of regular
 * expressions. The rest of the source is skipped by a small scanner that
 * understands strings, template literals, comments, and (heuristically)
 * regex literals, so an "import" inside a string is never misparsed.
 *
 * Browser-compatible: no Node.js APIs.
 */

// --- Combinator core -------------------------------------------------------
// A parser is a function (input, pos) => result.
// Success: { ok: true, value, pos }   Failure: { ok: false, expected, pos }

const ok = (value, pos) => ({ ok: true, value, pos });
const fail = (expected, pos) => ({ ok: false, expected, pos });

/** Match an exact string */
export function str(expected) {
  return (input, pos) =>
    input.startsWith(expected, pos)
      ? ok(expected, pos + expected.length)
      : fail(expected, pos);
}

/** Run parsers in order, collecting their values */
export function seq(...parsers) {
  return (input, pos) => {
    const values = [];
    let current = pos;
    for (const parser of parsers) {
      const result = parser(input, current);
      if (!result.ok) return result;
      values.push(result.value);
      current = result.pos;
    }
    return ok(values, current);
  };
}

/** Try parsers in order, returning the first success */
export function alt(...parsers) {
  return (input, pos) => {
    let furthest = null;
    for (const parser of parsers) {
      const result = parser(input, pos);
      if (result.ok) return result;
      if (!furthest || result.pos > furthest.pos) furthest = result;
    }
    return furthest || fail("no alternative matched", pos);
  };
}

/** Match zero or more repetitions */
export function many(parser) {
  return (input, pos) => {
    const values = [];
    let current = pos;
    for (;;) {
      const result = parser(input, current);
      if (!result.ok || result.pos === current) return ok(values, current);
      values.push(result.value);
      current = result.pos;
    }
  };
}

/** Make a parser optional (yields null when it fails) */
export function opt(parser) {
  return (input, pos) => {
    const result = parser(input, pos);
    return result.ok ? result : ok(null, pos);
  };
}

/** Transform a parser's value */
export function map(parser, fn) {
  return (input, pos) => {
    const result = parser(input, pos);
    return result.ok ? ok(fn(result.value), result.pos) : result;
  };
}

/** Zero or more items separated by a separator */
export function sepBy(item, separator) {
  return (input, pos) => {
    const first = item(input, pos);
    if (!first.ok) return ok([], pos);
    const rest = many(map(seq(separator, item), ([, value]) => value));
    const result = rest(input, first.pos);
    return ok([first.value, ...result.value], result.pos);
  };
}

// --- Lexical helpers -------------------------------------------------------

const isWs = (c) => c === " " || c === "\t" || c === "\n" || c === "\r" || c === "\f" || c === "\v";
const isIdStart = (c) => (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_" || c === "$";
const isIdChar = (c) => isIdStart(c) || (c >= "0" && c <= "9");

/** True when the whole string is a valid (ASCII) identifier name */
export function isIdentifierName(name) {
  if (name.length === 0 || !isIdStart(name[0])) return false;
  for (let i = 1; i < name.length; i++) {
    if (!isIdChar(name[i])) return false;
  }
  return true;
}

/** Skip whitespace and comments, returning the new position */
export function skipTrivia(input, pos) {
  for (;;) {
    while (pos < input.length && isWs(input[pos])) pos++;
    if (input.startsWith("//", pos)) {
      while (pos < input.length && input[pos] !== "\n") pos++;
      continue;
    }
    if (input.startsWith("/*", pos)) {
      const end = input.indexOf("*/", pos + 2);
      pos = end === -1 ? input.length : end + 2;
      continue;
    }
    return pos;
  }
}

/** Wrap a parser so it skips leading trivia */
function token(parser) {
  return (input, pos) => parser(input, skipTrivia(input, pos));
}

/** Any identifier-like word (including reserved words) */
const wordRaw = (input, pos) => {
  if (pos >= input.length || !isIdStart(input[pos])) return fail("identifier", pos);
  let end = pos + 1;
  while (end < input.length && isIdChar(input[end])) end++;
  return ok(input.slice(pos, end), end);
};

const word = token(wordRaw);

/** A specific keyword (whole word) */
const kw = (expected) =>
  token((input, pos) => {
    const result = wordRaw(input, pos);
    return result.ok && result.value === expected ? result : fail(`"${expected}"`, pos);
  });

const punct = (s) => token(str(s));

/** A single- or double-quoted string literal, yielding its contents */
const stringLit = token((input, pos) => {
  const quote = input[pos];
  if (quote !== '"' && quote !== "'") return fail("string literal", pos);
  let out = "";
  let i = pos + 1;
  while (i < input.length) {
    const c = input[i];
    if (c === "\\") {
      out += input[i + 1] ?? "";
      i += 2;
    } else if (c === quote) {
      return ok(out, i + 1);
    } else if (c === "\n") {
      break;
    } else {
      out += c;
      i++;
    }
  }
  return fail("closing quote", pos);
});

// --- Import declaration grammar -------------------------------------------

// { a, b as c, default as d }
const importSpecifier = map(
  seq(word, opt(seq(kw("as"), word))),
  ([imported, alias]) => ({ imported, local: alias ? alias[1] : imported }),
);

const namedList = (specifier) =>
  map(
    seq(punct("{"), sepBy(specifier, punct(",")), opt(punct(",")), punct("}")),
    ([, specs]) => specs,
  );

const namespaceImport = map(seq(punct("*"), kw("as"), word), ([, , name]) => name);

const importClause = alt(
  map(namespaceImport, (namespace) => ({ namespace })),
  map(namedList(importSpecifier), (named) => ({ named })),
  map(
    seq(
      word,
      opt(
        seq(
          punct(","),
          alt(
            map(namespaceImport, (namespace) => ({ namespace })),
            map(namedList(importSpecifier), (named) => ({ named })),
          ),
        ),
      ),
    ),
    ([defaultBinding, rest]) => ({ defaultBinding, ...(rest ? rest[1] : {}) }),
  ),
);

const importDecl = map(
  seq(
    kw("import"),
    alt(
      map(stringLit, (specifier) => ({ specifier, sideEffect: true })),
      map(seq(importClause, kw("from"), stringLit), ([clause, , specifier]) => ({
        ...clause,
        specifier,
      })),
    ),
    opt(punct(";")),
  ),
  ([, decl]) => ({ type: "import", ...decl }),
);

// --- Export declaration grammar --------------------------------------------

// { a, b as c }
const exportSpecifier = map(
  seq(word, opt(seq(kw("as"), word))),
  ([local, alias]) => ({ local, exported: alias ? alias[1] : local }),
);

const exportStarFrom = map(
  seq(punct("*"), opt(seq(kw("as"), word)), kw("from"), stringLit, opt(punct(";"))),
  ([, alias, , specifier]) => ({
    type: "exportStarFrom",
    specifier,
    alias: alias ? alias[1] : null,
  }),
);

const exportNamedFrom = map(
  seq(namedList(exportSpecifier), kw("from"), stringLit, opt(punct(";"))),
  ([named, , specifier]) => ({ type: "exportNamedFrom", named, specifier }),
);

const exportNamed = map(
  seq(namedList(exportSpecifier), opt(punct(";"))),
  ([named]) => ({ type: "exportNamed", named }),
);

// function Foo / async function Foo / class Foo (name optional)
const functionOrClassHead = alt(
  map(seq(opt(kw("async")), kw("function"), opt(punct("*")), opt(word)), ([, , , name]) => ({
    kind: "function",
    name,
  })),
  map(seq(kw("class"), opt(word)), ([, name]) => ({ kind: "class", name })),
);

/**
 * Scan `const a = ..., b = ...;` collecting declared names.
 * Initializers are skipped with depth/string tracking, not parsed.
 */
function scanDeclaratorNames(input, pos) {
  const names = [];
  for (;;) {
    pos = skipTrivia(input, pos);
    const c = input[pos];
    if (c === "{" || c === "[") {
      throw new Error("Destructuring in an exported declaration is not supported by the Ono bundler");
    }
    const nameResult = wordRaw(input, pos);
    if (!nameResult.ok) break;
    names.push(nameResult.value);
    pos = nameResult.pos;

    // Skip to the next top-level "," (next declarator) or ";" (end)
    let depth = 0;
    let done = false;
    while (pos < input.length) {
      pos = skipTrivia(input, pos);
      const ch = input[pos];
      if (ch === undefined) break;
      if (ch === '"' || ch === "'") {
        pos = skipStringLiteral(input, pos);
      } else if (ch === "`") {
        pos = skipTemplateLiteral(input, pos);
      } else if (ch === "(" || ch === "[" || ch === "{") {
        depth++;
        pos++;
      } else if (ch === ")" || ch === "]" || ch === "}") {
        depth--;
        pos++;
      } else if (depth === 0 && ch === ",") {
        pos++;
        break;
      } else if (depth === 0 && ch === ";") {
        done = true;
        break;
      } else {
        pos++;
      }
    }
    if (done || pos >= input.length) break;
  }
  return names;
}

/**
 * Parse an export declaration starting at the `export` keyword.
 * For `export <declaration>` forms only the header span is consumed
 * (the declaration itself stays in place); `consumeTo` says where the
 * scanner should continue.
 */
function exportDecl(input, pos) {
  const head = kw("export")(input, pos);
  if (!head.ok) return head;
  const afterExport = head.pos;

  const fromForm = alt(exportStarFrom, exportNamedFrom, exportNamed)(input, afterExport);
  if (fromForm.ok) {
    return ok({ ...fromForm.value, consumeTo: fromForm.pos }, fromForm.pos);
  }

  const defaultKw = kw("default")(input, afterExport);
  if (defaultKw.ok) {
    const headerEnd = defaultKw.pos;
    const decl = functionOrClassHead(input, headerEnd);
    if (decl.ok && decl.value.name) {
      // export default function Foo() {} — keep the declaration, strip keywords
      return ok(
        {
          type: "exportDefaultDeclaration",
          name: decl.value.name,
          declarationKind: decl.value.kind,
          headerEnd,
          consumeTo: headerEnd,
        },
        headerEnd,
      );
    }
    // export default <expression> (or anonymous function/class)
    return ok({ type: "exportDefaultExpression", headerEnd, consumeTo: headerEnd }, headerEnd);
  }

  const fnHead = functionOrClassHead(input, afterExport);
  if (fnHead.ok && fnHead.value.name) {
    return ok(
      {
        type: "exportDeclaration",
        names: [fnHead.value.name],
        declarationKind: fnHead.value.kind,
        headerEnd: afterExport,
        consumeTo: afterExport,
      },
      afterExport,
    );
  }

  const kind = alt(kw("const"), kw("let"), kw("var"))(input, afterExport);
  if (kind.ok) {
    const names = scanDeclaratorNames(input, kind.pos);
    if (names.length > 0) {
      return ok(
        {
          type: "exportDeclaration",
          names,
          declarationKind: "variable",
          headerEnd: afterExport,
          consumeTo: afterExport,
        },
        afterExport,
      );
    }
  }

  return fail("export declaration", afterExport);
}

// --- Source scanner ---------------------------------------------------------

function skipStringLiteral(input, pos) {
  const quote = input[pos];
  let i = pos + 1;
  while (i < input.length) {
    const c = input[i];
    if (c === "\\") i += 2;
    else if (c === quote) return i + 1;
    else if (c === "\n") return i; // unterminated — bail out
    else i++;
  }
  return i;
}

function skipTemplateLiteral(input, pos) {
  let i = pos + 1;
  while (i < input.length) {
    const c = input[i];
    if (c === "\\") {
      i += 2;
    } else if (c === "`") {
      return i + 1;
    } else if (c === "$" && input[i + 1] === "{") {
      // Skip the embedded expression (may contain nested strings/templates)
      i += 2;
      let depth = 1;
      while (i < input.length && depth > 0) {
        i = skipTrivia(input, i);
        const e = input[i];
        if (e === undefined) break;
        if (e === '"' || e === "'") i = skipStringLiteral(input, i);
        else if (e === "`") i = skipTemplateLiteral(input, i);
        else {
          if (e === "{") depth++;
          else if (e === "}") depth--;
          i++;
        }
      }
    } else {
      i++;
    }
  }
  return i;
}

function skipRegexLiteral(input, pos) {
  let i = pos + 1;
  let inClass = false;
  while (i < input.length) {
    const c = input[i];
    if (c === "\\") i += 2;
    else if (c === "[") { inClass = true; i++; }
    else if (c === "]") { inClass = false; i++; }
    else if (c === "/" && !inClass) {
      i++;
      while (i < input.length && isIdChar(input[i])) i++; // flags
      return i;
    } else if (c === "\n") {
      return i; // not a regex after all — bail out
    } else {
      i++;
    }
  }
  return i;
}

const REGEX_ALLOWED_AFTER_WORD = new Set([
  "return", "typeof", "case", "in", "of", "new", "delete", "void",
  "instanceof", "do", "else", "yield", "await",
]);
const REGEX_ALLOWED_AFTER_CHAR = new Set([...("=([{,;:!&|?+-*%^~<>")]);

/** True when the previous token puts us in expression position */
function isExpressionContext(lastToken) {
  return (
    REGEX_ALLOWED_AFTER_CHAR.has(lastToken) ||
    REGEX_ALLOWED_AFTER_WORD.has(lastToken)
  );
}

/**
 * Parse the module syntax of a JavaScript source file.
 * @param {string} source - JavaScript source (post JSX transform)
 * @returns {{imports: object[], exports: object[], topLevelFunctions: string[]}}
 *   Each statement carries a `start`/`end` (or `headerEnd`) span into `source`.
 */
export function parseModule(source) {
  const imports = [];
  const exportStatements = [];
  const topLevelFunctions = [];

  let pos = 0;
  let braceDepth = 0;
  let lastToken = ""; // previous significant token (word or single char)

  while (pos < source.length) {
    pos = skipTrivia(source, pos);
    if (pos >= source.length) break;
    const c = source[pos];

    if (c === '"' || c === "'") {
      pos = skipStringLiteral(source, pos);
      lastToken = c;
      continue;
    }
    if (c === "`") {
      pos = skipTemplateLiteral(source, pos);
      lastToken = c;
      continue;
    }
    if (c === "/") {
      // skipTrivia already handled comments, so this is division or a regex
      if (lastToken === "" || REGEX_ALLOWED_AFTER_CHAR.has(lastToken) || REGEX_ALLOWED_AFTER_WORD.has(lastToken)) {
        pos = skipRegexLiteral(source, pos);
      } else {
        pos++;
      }
      lastToken = "/";
      continue;
    }

    if (isIdStart(c)) {
      const start = pos;
      let end = pos + 1;
      while (end < source.length && isIdChar(source[end])) end++;
      const wordText = source.slice(start, end);

      if (wordText === "import") {
        const result = importDecl(source, start);
        if (result.ok) {
          imports.push({ ...result.value, start, end: result.pos });
          pos = result.pos;
          lastToken = ";";
          continue;
        }
        // dynamic import() or import.meta — fall through
      } else if (wordText === "export" && braceDepth === 0) {
        const result = exportDecl(source, start);
        if (result.ok) {
          const { consumeTo, ...statement } = result.value;
          exportStatements.push({ ...statement, start, end: result.pos });
          pos = consumeTo;
          lastToken = ";";
          continue;
        }
      } else if (wordText === "function" && braceDepth === 0 && lastToken !== "async" && !isExpressionContext(lastToken)) {
        // A function *declaration* — `const f = function foo() {}` is skipped
        const name = word(source, end);
        if (name.ok) topLevelFunctions.push(name.value);
      } else if (wordText === "async" && braceDepth === 0 && !isExpressionContext(lastToken)) {
        const fn = seq(kw("function"), opt(punct("*")), word)(source, end);
        if (fn.ok) topLevelFunctions.push(fn.value[2]);
      }

      pos = end;
      lastToken = wordText;
      continue;
    }

    if (c === "{") braceDepth++;
    else if (c === "}") braceDepth = Math.max(0, braceDepth - 1);
    lastToken = c;
    pos++;
  }

  return { imports, exports: exportStatements, topLevelFunctions };
}
