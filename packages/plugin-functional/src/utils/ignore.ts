function asPatterns(pattern?: string | Array<string>): Array<RegExp> {
  if (pattern == null) {
    return [];
  }

  const values = Array.isArray(pattern) ? pattern : [pattern];
  return values.map((value) => new RegExp(value, "u"));
}

export function shouldIgnorePattern(name: string | null | undefined, pattern?: string | Array<string>): boolean {
  if (!name) {
    return false;
  }

  const patterns = asPatterns(pattern);
  return patterns.some((regex) => regex.test(name));
}

export function isIgnoredViaIdentifierPattern(node: any, pattern?: string | Array<string>): boolean {
  if (!node) {
    return false;
  }

  if (node.type === "Identifier") {
    return shouldIgnorePattern(node.name, pattern);
  }

  if (node.type === "MemberExpression" && node.property?.type === "Identifier") {
    return shouldIgnorePattern(node.property.name, pattern);
  }

  return false;
}
