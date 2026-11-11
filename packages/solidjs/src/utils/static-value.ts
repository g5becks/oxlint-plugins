/**
 * Static evaluation of simple expressions: a subset of eslint-utils' `getStaticValue`, which
 * upstream eslint-plugin-solid uses (via @typescript-eslint/utils). Handles literals, template
 * literals, unary `- + ! ~ typeof`, binary arithmetic / string `+` / comparisons, logical
 * operators, parentheses and TS wrappers, and `const` identifiers resolved through the scope
 * chain (so `const link = "javascrip" + "t:..."` evaluates). Returns null when the value isn't
 * statically known.
 */
export function getStaticValue(node: any, scope?: any, depth = 0): { value: unknown } | null {
  if (!node || depth > 50) return null;
  switch (node.type) {
    case "Literal":
      // RegExp / BigInt literals: not useful here
      return node.regex || node.bigint !== undefined ? null : { value: node.value };
    case "TemplateLiteral": {
      let out = node.quasis[0]?.value?.cooked ?? "";
      for (let i = 0; i < node.expressions.length; i++) {
        const v = getStaticValue(node.expressions[i], scope, depth + 1);
        if (!v) return null;
        out += String(v.value) + (node.quasis[i + 1]?.value?.cooked ?? "");
      }
      return { value: out };
    }
    case "ParenthesizedExpression":
    case "TSAsExpression":
    case "TSSatisfiesExpression":
    case "TSNonNullExpression":
    case "TSTypeAssertion":
      return getStaticValue(node.expression, scope, depth + 1);
    case "UnaryExpression": {
      const v = getStaticValue(node.argument, scope, depth + 1);
      if (!v) return null;
      const x = v.value as any;
      switch (node.operator) {
        case "-":
          return { value: -x };
        case "+":
          return { value: +x };
        case "!":
          return { value: !x };
        case "~":
          return { value: ~x };
        case "typeof":
          return { value: typeof x };
        default:
          return null;
      }
    }
    case "BinaryExpression": {
      const l = getStaticValue(node.left, scope, depth + 1);
      const r = l && getStaticValue(node.right, scope, depth + 1);
      if (!l || !r) return null;
      const a = l.value as any;
      const b = r.value as any;
      switch (node.operator) {
        case "+":
          return { value: a + b };
        case "-":
          return { value: a - b };
        case "*":
          return { value: a * b };
        case "/":
          return { value: a / b };
        case "%":
          return { value: a % b };
        case "**":
          return { value: a ** b };
        case "==":
          return { value: a == b };
        case "!=":
          return { value: a != b };
        case "===":
          return { value: a === b };
        case "!==":
          return { value: a !== b };
        case "<":
          return { value: a < b };
        case "<=":
          return { value: a <= b };
        case ">":
          return { value: a > b };
        case ">=":
          return { value: a >= b };
        default:
          return null;
      }
    }
    case "LogicalExpression": {
      const l = getStaticValue(node.left, scope, depth + 1);
      if (!l) return null;
      const a = l.value;
      if (node.operator === "&&") return a ? getStaticValue(node.right, scope, depth + 1) : l;
      if (node.operator === "||") return a ? l : getStaticValue(node.right, scope, depth + 1);
      if (node.operator === "??") return a == null ? getStaticValue(node.right, scope, depth + 1) : l;
      return null;
    }
    case "Identifier": {
      if (node.name === "undefined") return { value: undefined };
      let s = scope;
      while (s) {
        const variable = s.set?.get?.(node.name);
        if (variable) {
          const def = variable.defs?.[0];
          if (
            variable.defs?.length === 1 &&
            def?.node?.type === "VariableDeclarator" &&
            def.node.id?.type === "Identifier" &&
            def.node.parent?.kind === "const" &&
            def.node.init
          ) {
            return getStaticValue(def.node.init, scope, depth + 1);
          }
          return null;
        }
        s = s.upper;
      }
      return null;
    }
    default:
      return null;
  }
}

/** The static value if it is a string, else null (eslint-utils' `getStringIfConstant`). */
export function getStaticString(node: any, scope?: any): string | null {
  const v = getStaticValue(node, scope);
  return v && typeof v.value === "string" ? v.value : null;
}
