import ts from "typescript";

// TypeScript diagnostics of one in-memory file, for fix-safety checks (audit T5 / R3; TASK-060).
// Fixtures import packages that aren't installed, so module-resolution errors are compared away.

export function diagnostics(fileName: string, text: string) {
  const options: ts.CompilerOptions = {
    noEmit: true,
    strict: false,
    skipLibCheck: true,
    noResolve: true,
    jsx: ts.JsxEmit.Preserve,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    types: [],
  };
  const host = ts.createCompilerHost(options);
  const original = host.getSourceFile;
  host.getSourceFile = (name, lang) =>
    name === fileName ? ts.createSourceFile(name, text, lang, true) : original.call(host, name, lang);
  const program = ts.createProgram([fileName], options, host);
  const sf = program.getSourceFile(fileName);
  const fmt = (d: ts.Diagnostic) => `TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`;
  return {
    syntactic: program.getSyntacticDiagnostics(sf).map(fmt),
    semantic: program.getSemanticDiagnostics(sf).map(fmt),
  };
}

/**
 * Semantic diagnostics in `after` that `before` didn't have, ignoring module-resolution errors
 * (imports a fix adds can't resolve in fixtures, whose packages aren't installed).
 */
export function introducedDiagnostics(before: { semantic: string[] }, after: { semantic: string[] }): string[] {
  const resolution = /^TS(2307|2792):/;
  const remaining = [...before.semantic];
  return after.semantic.filter((d) => {
    if (resolution.test(d)) return false;
    const i = remaining.indexOf(d);
    if (i === -1) return true;
    remaining.splice(i, 1);
    return false;
  });
}
