import { defineRule, type ESTree, type Fixer, type Scope } from "@oxlint/plugins";
import { isFunctionNode } from "../utils/functions.ts";
import { readSolidVersion } from "../utils/settings.ts";
import { trace } from "../utils/trace.ts";
import { getStaticValue } from "../utils/static-value.ts";
import { isDOMElementName } from "../utils/jsx.ts";
import { ruleOptions } from "../utils/options.ts";
import { cannotContainJSX } from "../utils/files.ts";

const COMMON_EVENTS = [
  "onAnimationEnd",
  "onAnimationIteration",
  "onAnimationStart",
  "onBeforeInput",
  "onBlur",
  "onChange",
  "onClick",
  "onContextMenu",
  "onCopy",
  "onCut",
  "onDblClick",
  "onDrag",
  "onDragEnd",
  "onDragEnter",
  "onDragExit",
  "onDragLeave",
  "onDragOver",
  "onDragStart",
  "onDrop",
  "onError",
  "onFocus",
  "onFocusIn",
  "onFocusOut",
  "onGotPointerCapture",
  "onInput",
  "onInvalid",
  "onKeyDown",
  "onKeyPress",
  "onKeyUp",
  "onLoad",
  "onLostPointerCapture",
  "onMouseDown",
  "onMouseEnter",
  "onMouseLeave",
  "onMouseMove",
  "onMouseOut",
  "onMouseOver",
  "onMouseUp",
  "onPaste",
  "onPointerCancel",
  "onPointerDown",
  "onPointerEnter",
  "onPointerLeave",
  "onPointerMove",
  "onPointerOut",
  "onPointerOver",
  "onPointerUp",
  "onReset",
  "onScroll",
  "onSelect",
  "onSubmit",
  "onToggle",
  "onTouchCancel",
  "onTouchEnd",
  "onTouchMove",
  "onTouchStart",
  "onTransitionEnd",
  "onWheel",
] as const;

/** Lowercased DOM event handler name → its camelCase spelling (`onclick` → `onClick`). */
export const COMMON_EVENTS_MAP = new Map<string, string>();
for (const event of COMMON_EVENTS) {
  COMMON_EVENTS_MAP.set(event.toLowerCase(), event);
}

const NONSTANDARD_EVENTS_MAP: Record<string, string> = {
  ondoubleclick: "onDblClick",
};

export default defineRule({
  meta: {
    type: "problem" as const,
    docs: {
      description:
        "Enforce naming DOM element event handlers consistently and prevent Solid's analysis from misunderstanding whether a prop should be an event handler.",
      recommended: "error",
      url: "https://github.com/g5becks/oxlint-plugins/blob/main/packages/solidjs/docs/rules/event-handlers.md",
    },
    fixable: "code" as const,
    hasSuggestions: true,
    schema: [
      {
        type: "object",
        properties: {
          ignoreCase: {
            type: "boolean",
            description: "if true, don't warn on ambiguously named event handlers like `onclick` or `onchange`",
            default: false,
          },
          warnOnSpread: {
            type: "boolean",
            description: "if true, warn when spreading event handlers onto JSX. Enable for Solid < v1.6.",
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      "detected-attr":
        'The {{name}} prop is named as an event handler (starts with "on"), but Solid knows its value ({{staticValue}}) is a string or number, so it will be treated as an attribute. If this is intentional, name this prop attr:{{name}}.',
      naming:
        "The {{name}} prop is ambiguous. If it is an event handler, change it to {{handlerName}}. If it is an attribute, change it to {{attrName}}.",
      capitalization: "The {{name}} prop should be renamed to {{fixedName}} for readability.",
      nonstandard: "The {{name}} prop should be renamed to {{fixedName}}, because it's not a standard event handler.",
      "make-handler": "Change the {{name}} prop to {{handlerName}}.",
      "make-attr": "Change the {{name}} prop to {{attrName}}.",
      "lowercase-handler":
        "`{{name}}` is an attribute in Solid 2.0, not an event handler: a function passed to it is stringified into the attribute and never runs. Use `{{handlerName}}`.",
      "lowercase-ambiguous":
        "`{{name}}` is an attribute in Solid 2.0. If this value is an event handler, use `{{handlerName}}`.",
      "detected-attr-v2":
        "The {{name}} prop is an event handler in Solid 2.0, but its value ({{staticValue}}) is a string or number. For the HTML inline-handler attribute, use the lowercase name {{attrName}}.",
      "spread-handler":
        "The {{name}} prop should be added as a JSX attribute, not spread in. Solid doesn't add listeners when spreading into JSX.",
    },
  },
  createOnce(context) {
    const options = () => ruleOptions<{ ignoreCase?: boolean; warnOnSpread?: boolean }>(context);

    // ---- Version 2 (TASK-052): only `on` + an uppercase letter is an event handler ----

    /** The camelCase handler for an on* name, and whether it's a known DOM event. */
    const handlerFor = (name: string): { handlerName: string; known: boolean } => {
      const lower = name.toLowerCase();
      const known = NONSTANDARD_EVENTS_MAP[lower] ?? COMMON_EVENTS_MAP.get(lower);
      return { handlerName: known ?? `on${name.charAt(2).toUpperCase()}${name.slice(3)}`, known: Boolean(known) };
    };

    /** A value that is certainly a function: inline, or an identifier bound to one. */
    const isFunctionValue = (expr: ESTree.Node): boolean => {
      if (isFunctionNode(expr)) return true;
      if (expr.type !== "Identifier") return false;
      if (isFunctionNode(trace(expr, context))) return true;
      // trace() only looks in the identifier's own scope; resolve through the enclosing ones.
      for (let scope: Scope | null = context.sourceCode.getScope(expr); scope; scope = scope.upper) {
        const variable = scope.set.get(expr.name);
        if (!variable) continue;
        return variable.defs.some(
          (d) =>
            d.node.type === "FunctionDeclaration" ||
            (d.node.type === "VariableDeclarator" &&
              d.node.parent?.type === "VariableDeclaration" &&
              d.node.parent.kind === "const" &&
              isFunctionNode(d.node.init)),
        );
      }
      return false;
    };

    const reportLowercase = (
      node: ESTree.Node,
      nameNode: ESTree.Node,
      name: string,
      replace: (h: string) => string,
    ) => {
      const { handlerName, known } = handlerFor(name);
      const fix = (fixer: Fixer) => fixer.replaceText(nameNode, replace(handlerName));
      context.report({
        node,
        messageId: "lowercase-handler",
        data: { name, handlerName },
        // The guide's rename (onclick → onClick) for known DOM events; a suggestion otherwise.
        ...(known ? { fix } : { suggest: [{ messageId: "make-handler" as const, data: { name, handlerName }, fix }] }),
      });
    };

    const checkV2 = (node: ESTree.JSXAttribute, name: string) => {
      const value = node.value;
      const expr =
        value?.type === "JSXExpressionContainer" && value.expression.type !== "JSXEmptyExpression"
          ? value.expression
          : null;
      const staticValue =
        expr && expr.type !== "ArrayExpression" ? getStaticValue(expr, context.sourceCode.getScope(node)) : null;
      const isStatic =
        staticValue !== null && (typeof staticValue.value === "string" || typeof staticValue.value === "number");

      if (/^on[a-z]/.test(name)) {
        // A string (or no value) is the HTML inline-handler attribute.
        if (!expr || isStatic) return;
        if (isFunctionValue(expr)) {
          reportLowercase(node, node.name, name, (h) => h);
        } else if (!options()?.ignoreCase) {
          const { handlerName } = handlerFor(name);
          context.report({
            node,
            messageId: "lowercase-ambiguous",
            data: { name, handlerName },
            suggest: [
              {
                messageId: "make-handler",
                data: { name, handlerName },
                fix: (fixer) => fixer.replaceText(node.name, handlerName),
              },
            ],
          });
        }
        return;
      }

      if (isStatic || value === null || value?.type === "Literal") {
        const shown = isStatic ? staticValue!.value : value?.type === "Literal" ? value.value : true;
        context.report({
          node,
          messageId: "detected-attr-v2",
          data: { name, staticValue: String(shown), attrName: name.toLowerCase() },
        });
      } else if (!options()?.ignoreCase) {
        const lower = name.toLowerCase();
        const fixedName = NONSTANDARD_EVENTS_MAP[lower] ?? COMMON_EVENTS_MAP.get(lower);
        if (fixedName && fixedName !== name) {
          const messageId = NONSTANDARD_EVENTS_MAP[lower] ? "nonstandard" : "capitalization";
          context.report({
            node: node.name,
            messageId,
            data: { name, fixedName },
            fix: (fixer) => fixer.replaceText(node.name, fixedName),
          });
        }
      }
    };

    return {
      // JSX-only rule: skip files that can't contain JSX (audit P3).
      before() {
        return !cannotContainJSX(context.filename);
      },
      JSXAttribute(node) {
        const openingElement = node.parent;
        if (
          openingElement.type !== "JSXOpeningElement" ||
          openingElement.name.type !== "JSXIdentifier" ||
          !isDOMElementName(openingElement.name.name)
        ) {
          return;
        }

        if (node.name.type === "JSXNamespacedName") {
          return;
        }

        const { name } = node.name;
        if (!name || !/^on[a-zA-Z]/.test(name)) {
          return;
        }
        if (readSolidVersion(context) === 2) {
          checkV2(node, name);
          return;
        }

        let staticValue: { value: unknown } | null = null;
        if (
          node.value?.type === "JSXExpressionContainer" &&
          node.value.expression.type !== "JSXEmptyExpression" &&
          node.value.expression.type !== "ArrayExpression" &&
          (staticValue = getStaticValue(node.value.expression, context.sourceCode.getScope(node))) !== null &&
          (typeof staticValue.value === "string" || typeof staticValue.value === "number")
        ) {
          context.report({
            node,
            messageId: "detected-attr",
            data: { name, staticValue: staticValue.value },
          });
        } else if (node.value === null || node.value?.type === "Literal") {
          context.report({
            node,
            messageId: "detected-attr",
            data: { name, staticValue: node.value !== null ? node.value.value : true },
          });
        } else if (!options()?.ignoreCase) {
          const lowercaseHandlerName = name.toLowerCase();
          if (NONSTANDARD_EVENTS_MAP[lowercaseHandlerName]) {
            const fixedName = NONSTANDARD_EVENTS_MAP[lowercaseHandlerName];
            context.report({
              node: node.name,
              messageId: "nonstandard",
              data: { name, fixedName },
              fix: (fixer) => fixer.replaceText(node.name, fixedName),
            });
          } else if (COMMON_EVENTS_MAP.has(lowercaseHandlerName)) {
            const fixedName = COMMON_EVENTS_MAP.get(lowercaseHandlerName)!;
            if (fixedName !== name) {
              context.report({
                node: node.name,
                messageId: "capitalization",
                data: { name, fixedName },
                fix: (fixer) => fixer.replaceText(node.name, fixedName),
              });
            }
          } else if (name.charAt(2) === name.charAt(2).toLowerCase()) {
            const handlerName = `on${name.charAt(2).toUpperCase()}${name.slice(3)}`;
            const attrName = `attr:${name}`;
            context.report({
              node: node.name,
              messageId: "naming",
              data: { name, attrName, handlerName },
              suggest: [
                {
                  messageId: "make-handler",
                  data: { name, handlerName },
                  fix: (fixer) => fixer.replaceText(node.name, handlerName),
                },
                {
                  messageId: "make-attr",
                  data: { name, attrName },
                  fix: (fixer) => fixer.replaceText(node.name, attrName),
                },
              ],
            });
          }
        }
      },
      Property(node) {
        const objectExpression = node.parent;
        const spread = objectExpression.parent;
        // Version 2: a lowercase on* key spread into a native element is an attribute too.
        if (
          readSolidVersion(context) === 2 &&
          objectExpression.type === "ObjectExpression" &&
          spread?.type === "JSXSpreadAttribute" &&
          spread.parent.type === "JSXOpeningElement" &&
          spread.parent.name.type === "JSXIdentifier" &&
          isDOMElementName(spread.parent.name.name) &&
          !node.computed
        ) {
          const key = node.key;
          const keyName =
            key.type === "Identifier"
              ? key.name
              : key.type === "Literal" && typeof key.value === "string"
                ? key.value
                : null;
          if (keyName && /^on[a-z]/.test(keyName) && !node.shorthand && isFunctionValue(node.value)) {
            reportLowercase(node, key, keyName, (h) => (key.type === "Identifier" ? h : JSON.stringify(h)));
          }
        }
        if (
          options()?.warnOnSpread &&
          objectExpression.type === "ObjectExpression" &&
          spread?.type === "JSXSpreadAttribute" &&
          spread.parent.type === "JSXOpeningElement"
        ) {
          const openingElement = spread.parent;
          if (openingElement.name.type === "JSXIdentifier" && isDOMElementName(openingElement.name.name)) {
            if (node.key.type === "Identifier" && node.key.name.startsWith("on")) {
              const handlerName = node.key.name;
              context.report({
                node,
                messageId: "spread-handler",
                data: { name: node.key.name },
                *fix(fixer) {
                  const commaAfter = context.sourceCode.getTokenAfter(node);
                  yield fixer.remove(objectExpression.properties.length === 1 ? spread : node);
                  if (commaAfter?.value === ",") {
                    yield fixer.remove(commaAfter);
                  }
                  yield fixer.insertTextAfter(spread, ` ${handlerName}={${context.sourceCode.getText(node.value)}}`);
                },
              });
            }
          }
        }
      },
    };
  },
});
