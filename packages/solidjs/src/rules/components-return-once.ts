import { defineRule, type ESTree, type Location } from "@oxlint/plugins";
import type { FunctionNode } from "../utils/functions.ts";
import { ensureSolidImports } from "../utils/fix-imports.ts";
const getFunctionName = (node: FunctionNode): string | null => {
  if ((node.type === "FunctionDeclaration" || node.type === "FunctionExpression") && node.id != null) {
    return node.id.name;
  }
  if (node.parent.type === "VariableDeclarator" && node.parent.id.type === "Identifier") {
    return node.parent.id.name;
  }
  return null;
};

const isNothing = (node?: ESTree.Node | null): boolean => {
  if (!node) return true;
  switch (node.type) {
    case "Literal":
      return ([null, undefined, false, ""] as Array<unknown>).includes(node.value);
    case "JSXFragment":
      return !node.children || node.children.every((child) => isNothing(child));
    default:
      return false;
  }
};

const getLineLength = (loc: Location) => loc.end.line - loc.start.line + 1;

export default defineRule({
  meta: {
    type: "problem" as const,
    docs: {
      description:
        "Disallow early returns in components. Solid components only run once, and so conditionals should be inside JSX.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/components-return-once.md",
    },
    fixable: "code" as const,
    schema: [],
    messages: {
      noEarlyReturn:
        "Solid components run once, so an early return breaks reactivity. Move the condition inside a JSX element, such as a fragment or <Show />.",
      noConditionalReturn:
        "Solid components run once, so a conditional return breaks reactivity. Move the condition inside a JSX element, such as a fragment or <Show />.",
    },
  },
  createOnce(context) {
    const functionStack: Array<{
      isComponent: boolean;
      lastReturn: ESTree.ReturnStatement | undefined;
      earlyReturns: Array<ESTree.ReturnStatement>;
    }> = [];

    const putIntoJSX = (node: ESTree.Node): string => {
      const text = context.sourceCode.getText(node);
      return node.type === "JSXElement" || node.type === "JSXFragment" ? text : `{${text}}`;
    };

    const currentFunction = () => {
      const fn = functionStack[functionStack.length - 1];
      if (!fn) {
        throw new Error("function stack is empty");
      }
      return fn;
    };

    const onFunctionEnter = (node: FunctionNode) => {
      let lastReturn: ESTree.ReturnStatement | undefined = undefined;
      if (node.body?.type === "BlockStatement") {
        const last = node.body.body.findLast((n) => !n.type.endsWith("Declaration"));
        if (last && last.type === "ReturnStatement") {
          lastReturn = last;
        }
      }
      functionStack.push({ isComponent: false, lastReturn, earlyReturns: [] });
    };

    const onFunctionExit = (node: FunctionNode) => {
      const calleeName = (node.parent.type === "CallExpression" ? node.parent.callee : undefined) as
        | { name?: string }
        | undefined;
      if (
        getFunctionName(node)?.match(/^[a-z]/) ||
        node.parent.type === "JSXExpressionContainer" ||
        (node.parent.type === "CallExpression" &&
          node.parent.arguments.some((n) => n === node) &&
          !calleeName?.name?.match(/^[A-Z]/))
      ) {
        currentFunction().isComponent = false;
      }

      if (currentFunction().isComponent) {
        currentFunction().earlyReturns.forEach((earlyReturn) => {
          context.report({
            node: earlyReturn,
            messageId: "noEarlyReturn",
          });
        });

        const argument = currentFunction().lastReturn?.argument;
        if (argument?.type === "ConditionalExpression") {
          const sourceCode = context.sourceCode;
          context.report({
            node: argument.parent,
            messageId: "noConditionalReturn",
            fix: (fixer) => {
              const { test, consequent, alternate } = argument;
              const conditions: Array<{ test: ESTree.Expression; consequent: ESTree.Expression }> = [
                { test, consequent },
              ];
              let fallback = alternate;

              while (fallback.type === "ConditionalExpression") {
                conditions.push({ test: fallback.test, consequent: fallback.consequent });
                fallback = fallback.alternate;
              }

              if (conditions.length >= 2) {
                const fallbackStr = !isNothing(fallback) ? ` fallback={${sourceCode.getText(fallback)}}` : "";
                return [
                  ...ensureSolidImports(fixer, sourceCode, ["Switch", "Match"]),
                  fixer.replaceText(
                    argument,
                    `<Switch${fallbackStr}>\n${conditions
                      .map(
                        ({ test, consequent }) =>
                          `<Match when={${sourceCode.getText(test)}}>${putIntoJSX(consequent)}</Match>`,
                      )
                      .join("\n")}\n</Switch>`,
                  ),
                ];
              }

              if (isNothing(consequent)) {
                return [
                  ...ensureSolidImports(fixer, sourceCode, ["Show"]),
                  fixer.replaceText(
                    argument,
                    `<Show when={!(${sourceCode.getText(test)})}>${putIntoJSX(alternate)}</Show>`,
                  ),
                ];
              }

              if (isNothing(fallback) || getLineLength(consequent.loc) >= getLineLength(alternate.loc) * 1.5) {
                const fallbackStr = !isNothing(fallback) ? ` fallback={${sourceCode.getText(fallback)}}` : "";
                return [
                  ...ensureSolidImports(fixer, sourceCode, ["Show"]),
                  fixer.replaceText(
                    argument,
                    `<Show when={${sourceCode.getText(test)}}${fallbackStr}>${putIntoJSX(consequent)}</Show>`,
                  ),
                ];
              }

              return fixer.replaceText(argument, `<>${putIntoJSX(argument)}</>`);
            },
          });
        } else if (argument?.type === "LogicalExpression") {
          if (argument.operator === "&&") {
            const sourceCode = context.sourceCode;
            context.report({
              node: argument,
              messageId: "noConditionalReturn",
              fix: (fixer) => {
                const { left: test, right: consequent } = argument;
                return [
                  ...ensureSolidImports(fixer, sourceCode, ["Show"]),
                  fixer.replaceText(
                    argument,
                    `<Show when={${sourceCode.getText(test)}}>${putIntoJSX(consequent)}</Show>`,
                  ),
                ];
              },
            });
          } else {
            context.report({
              node: argument,
              messageId: "noConditionalReturn",
            });
          }
        }
      }

      functionStack.pop();
    };

    return {
      // Balanced push/pop per file; reset anyway so a file that aborts mid-traversal
      // can't leave entries for the next file (createOnce runs once per worker).
      before() {
        functionStack.length = 0;
      },
      FunctionDeclaration: onFunctionEnter,
      FunctionExpression: onFunctionEnter,
      ArrowFunctionExpression: onFunctionEnter,
      "FunctionDeclaration:exit": onFunctionExit,
      "FunctionExpression:exit": onFunctionExit,
      "ArrowFunctionExpression:exit": onFunctionExit,
      JSXElement() {
        if (functionStack.length) {
          currentFunction().isComponent = true;
        }
      },
      JSXFragment() {
        if (functionStack.length) {
          currentFunction().isComponent = true;
        }
      },
      ReturnStatement(node) {
        if (functionStack.length && node !== currentFunction().lastReturn) {
          currentFunction().earlyReturns.push(node);
        }
      },
    };
  },
});
