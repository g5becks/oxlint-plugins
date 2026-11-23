import { defineRule, type ESTree, type Fix, type Fixer } from "@oxlint/plugins";
import type { FunctionNode } from "../utils/functions.ts";
import { cannotContainJSX } from "../utils/files.ts";
import { ensureSolidImports } from "../utils/fix-imports.ts";
import { readSolidVersion } from "../utils/settings.ts";

const getName = (node: ESTree.Node): string | null => {
  switch (node.type) {
    case "Literal":
      return typeof node.value === "string" ? node.value : null;
    case "Identifier":
      return node.name;
    case "AssignmentPattern":
      return getName(node.left);
    default:
      if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
        return node.quasis[0]?.value.cooked ?? null;
      }
      return null;
  }
};

interface PropertyInfo {
  real: ESTree.Node;
  var: string;
  computed: boolean;
  init: ESTree.Node | undefined;
}

const getPropertyInfo = (prop: ESTree.BindingProperty): PropertyInfo | null => {
  const valueName = getName(prop.value);
  if (valueName !== null) {
    return {
      real: prop.key,
      var: valueName,
      computed: prop.computed,
      init: prop.value.type === "AssignmentPattern" ? prop.value.right : undefined,
    };
  }
  return null;
};

export default defineRule({
  meta: {
    type: "problem" as const,
    docs: {
      description:
        "Disallow destructuring props. In Solid, props must be used with property accesses (`props.foo`) to preserve reactivity. This rule only tracks destructuring in the parameter list.",
      url: "https://github.com/g5becks/oxlint-plugins/blob/main/packages/solidjs/docs/rules/no-destructure.md",
    },
    fixable: "code" as const,
    schema: [],
    messages: {
      noDestructure: "Destructuring component props breaks Solid's reactivity; use property access instead.",
      noDestructureDefaults:
        "Destructuring component props breaks Solid's reactivity; use property access instead. The defaults aren't fixed automatically in Solid 2.0: merge() treats an explicit undefined as a value, unlike a destructuring default. Use merge({ ... }, props) and check callers that pass undefined.",
    },
  },
  createOnce(context) {
    const functionStack: Array<{ hasJSX: boolean }> = [];
    /** Version 2: the file's fixable reports, sharing one fix. */
    let pending: Array<{ func: FunctionNode; props: ESTree.ObjectPattern }> = [];

    const combinedFix = (fixer: Fixer): Fix[] => {
      const accepted: Fix[] = [];
      let needsOmit = false;
      for (const { func, props } of pending) {
        const fixes = [...fixDestructure(func, props, fixer, true, false)];
        const overlaps = fixes.some((f) => accepted.some((a) => f.range[0] < a.range[1] && a.range[0] < f.range[1]));
        if (overlaps) continue;
        accepted.push(...fixes);
        needsOmit ||= props.properties.some((p) => p.type === "RestElement");
      }
      if (needsOmit) {
        for (const f of ensureSolidImports(fixer, context.sourceCode, ["omit"])) {
          if (!accepted.some((a) => f.range[0] < a.range[1] && a.range[0] < f.range[1])) accepted.push(f);
        }
      }
      return accepted;
    };
    const currentFunction = () => {
      const fn = functionStack[functionStack.length - 1];
      if (!fn) {
        throw new Error("function stack is empty");
      }
      return fn;
    };

    const onFunctionEnter = () => {
      functionStack.push({ hasJSX: false });
    };

    const onFunctionExit = (node: FunctionNode) => {
      if (node.params.length === 1) {
        const props = node.params[0];
        if (
          props?.type === "ObjectPattern" &&
          currentFunction().hasJSX &&
          node.parent.type !== "JSXExpressionContainer"
        ) {
          const v2 = readSolidVersion(context) === 2;
          const hasDefaults = props.properties.some(
            (p) => p.type === "Property" && p.value.type === "AssignmentPattern",
          );
          if (v2 && hasDefaults) {
            // Solid 2.0 (TASK-058): merge() isn't equivalent to destructuring defaults.
            context.report({ node: props, messageId: "noDestructureDefaults" });
          } else if (v2) {
            // One combined fix per file (reported at Program:exit): each fix may add the `omit`
            // import, so separate fixes would overlap at the top of the file.
            pending.push({ func: node, props });
          } else {
            context.report({
              node: props,
              messageId: "noDestructure",
              fix: (fixer) => fixDestructure(node, props, fixer, v2),
            });
          }
        }
      }
      functionStack.pop();
    };

    function* fixDestructure(
      func: FunctionNode,
      props: ESTree.ObjectPattern,
      fixer: Fixer,
      v2 = false,
      addImport = true,
    ): Generator<Fix> {
      const propsName = "props";
      const properties = props.properties;

      const propertyInfo: Array<PropertyInfo> = [];
      let rest: ESTree.BindingRestElement | null = null;

      for (const property of properties) {
        if (property.type === "RestElement") {
          rest = property;
        } else {
          const info = getPropertyInfo(property);
          if (info === null) continue;
          propertyInfo.push(info);
        }
      }

      const hasDefaults = propertyInfo.some((info) => info.init);
      // Version 2 keeps the parameter name: omit() returns a view, props stays the original.
      const origProps = v2 || !(hasDefaults || rest) ? propsName : "_" + propsName;

      if (props.typeAnnotation) {
        const range: [number, number] = [props.range[0], props.typeAnnotation.range[0]];
        yield fixer.replaceTextRange(range, origProps);
      } else {
        yield fixer.replaceText(props, origProps);
      }

      const sourceCode = context.sourceCode;

      const defaultsObjectString = () =>
        propertyInfo
          .filter((info) => info.init)
          .map(
            (info) =>
              `${info.computed ? "[" : ""}${sourceCode.getText(info.real)}${
                info.computed ? "]" : ""
              }: ${sourceCode.getText(info.init)}`,
          )
          .join(", ");

      const splitPropsArray = () =>
        `[${propertyInfo
          .map((info) =>
            info.real.type === "Identifier" ? JSON.stringify(info.real.name) : sourceCode.getText(info.real),
          )
          .join(", ")}]`;

      let lineToInsert = "";
      if (v2) {
        // Solid 2.0 (TASK-058): omit(props, ...keys) replaces splitProps (RFC 04 §omit). Defaults
        // never reach here (reported without a fix).
        if (rest) {
          const restName = (rest.argument.type === "Identifier" && rest.argument.name) || "rest";
          const keys = propertyInfo
            .map((info) =>
              info.real.type === "Identifier" && !info.computed
                ? JSON.stringify(info.real.name)
                : sourceCode.getText(info.real),
            )
            .join(", ");
          const statement = `const ${restName} = omit(${propsName}, ${keys});`;
          lineToInsert = func.body?.type === "BlockStatement" ? `${statement}\n  ` : `  ${statement}\n`;
          if (addImport) yield* ensureSolidImports(fixer, sourceCode, ["omit"]);
        }
      } else if (hasDefaults && rest) {
        lineToInsert = `  const [${propsName}, ${
          (rest.argument.type === "Identifier" && rest.argument.name) || "rest"
        }] = splitProps(mergeProps({ ${defaultsObjectString()} }, ${origProps}), ${splitPropsArray()});`;
      } else if (hasDefaults) {
        lineToInsert = `  const ${propsName} = mergeProps({ ${defaultsObjectString()} }, ${origProps});\n`;
      } else if (rest) {
        lineToInsert = `  const [${propsName}, ${
          (rest.argument.type === "Identifier" && rest.argument.name) || "rest"
        }] = splitProps(${origProps}, ${splitPropsArray()});\n`;
      }

      if (lineToInsert) {
        const body = func.body;
        if (!body) {
          // `declare function` (no body): nothing to insert into
        } else if (body.type === "BlockStatement") {
          const first = body.body[0];
          if (first) {
            yield fixer.insertTextBefore(first, lineToInsert);
          }
        } else {
          const maybeOpenParen = sourceCode.getTokenBefore(body);
          if (maybeOpenParen?.value === "(") {
            yield fixer.remove(maybeOpenParen);
          }
          const maybeCloseParen = sourceCode.getTokenAfter(body);
          if (maybeCloseParen?.value === ")") {
            yield fixer.remove(maybeCloseParen);
          }
          yield fixer.insertTextBefore(body, `{\n${lineToInsert}  return (`);
          yield fixer.insertTextAfter(body, `);\n}`);
        }
      }

      const scope = sourceCode.scopeManager?.acquire(func);
      if (scope) {
        for (const [info, variable] of propertyInfo.map((info) => [info, scope.set.get(info.var)] as const)) {
          if (variable) {
            for (const reference of variable.references) {
              if (reference.isReadOnly()) {
                const access =
                  info.real.type === "Identifier" && !info.computed
                    ? `.${info.real.name}`
                    : `[${sourceCode.getText(info.real)}]`;
                yield fixer.replaceText(reference.identifier, `${propsName}${access}`);
              }
            }
          }
        }
      }
    }

    return {
      // Balanced push/pop per file; reset anyway so a file that aborts mid-traversal
      // can't leave entries for the next file (createOnce runs once per worker).
      before() {
        functionStack.length = 0;
        pending = [];
        // JSX-only rule: skip files that can't contain JSX (audit P3).
        return !cannotContainJSX(context.filename);
      },
      FunctionDeclaration: onFunctionEnter,
      FunctionExpression: onFunctionEnter,
      ArrowFunctionExpression: onFunctionEnter,
      "FunctionDeclaration:exit": onFunctionExit,
      "FunctionExpression:exit": onFunctionExit,
      "ArrowFunctionExpression:exit": onFunctionExit,
      "Program:exit"() {
        for (const { props } of pending) {
          context.report({ node: props, messageId: "noDestructure", fix: combinedFix });
        }
      },
      JSXElement() {
        if (functionStack.length) {
          currentFunction().hasJSX = true;
        }
      },
      JSXFragment() {
        if (functionStack.length) {
          currentFunction().hasJSX = true;
        }
      },
    };
  },
});
