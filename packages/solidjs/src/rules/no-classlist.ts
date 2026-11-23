import { defineRule, type ESTree, type Fixer } from "@oxlint/plugins";
import { cannotContainJSX } from "../utils/files.ts";
import { isDOMElementName } from "../utils/jsx.ts";
import { readSolidVersion } from "../utils/settings.ts";

// TASK-050. Solid 2.0 removes classList and merges it into class, which takes a string, an object or
// an array (MIGRATION §classList → class (object/array forms); RFC 07 §Enhanced class prop). The
// compiler rejects classList on native elements; on components it's an ordinary prop.

type Attribute = ESTree.JSXAttribute;

const attrName = (a: ESTree.JSXOpeningElement["attributes"][number]): string | null =>
  a.type === "JSXAttribute" && a.name.type === "JSXIdentifier" ? a.name.name : null;

export default defineRule({
  meta: {
    type: "problem" as const,
    docs: {
      description:
        "Disallow classList, which Solid 2.0 removed; use class object/array values (settings.solidjs.version 2).",
      url: "https://github.com/g5becks/oxlint-plugins/blob/main/packages/solidjs/docs/rules/no-classlist.md",
    },
    fixable: "code" as const,
    schema: [],
    messages: {
      noClasslist:
        '`classList` is removed in Solid 2.0. Use `class` with an object or array: `class={["card", { active: isActive() }]}`.',
    },
  },
  createOnce(context) {
    return {
      before() {
        return !cannotContainJSX(context.filename) && readSolidVersion(context) === 2;
      },
      JSXOpeningElement(node) {
        if (node.name.type !== "JSXIdentifier" || !isDOMElementName(node.name.name)) return;
        const lists = node.attributes.filter((a): a is Attribute => /^class[lL]ist$/.test(attrName(a) ?? ""));
        if (lists.length === 0) return;
        const classes = node.attributes.filter((a): a is Attribute => attrName(a) === "class");
        const fixable =
          lists.length === 1 &&
          classes.length <= 1 &&
          !node.attributes.some((a) => a.type === "JSXSpreadAttribute") &&
          lists[0]!.value?.type === "JSXExpressionContainer" &&
          lists[0]!.value.expression.type !== "JSXEmptyExpression";

        for (const list of lists) {
          context.report({
            node: list,
            messageId: "noClasslist",
            ...(fixable ? { fix: (fixer: Fixer) => fix(fixer, list, classes[0]) } : {}),
          });
        }
      },
    };

    function fix(fixer: Fixer, list: Attribute, cls: Attribute | undefined) {
      const sourceCode = context.sourceCode;
      const listExpr = (list.value as ESTree.JSXExpressionContainer).expression;
      const listText = sourceCode.getText(listExpr);
      if (!cls) return fixer.replaceText(list.name, "class");

      let classText: string | null = null;
      const value = cls.value;
      if (value?.type === "Literal" && typeof value.value === "string") {
        // A JSX attribute string isn't a JS string literal: re-quote its value.
        classText = `[${JSON.stringify(value.value)}, ${listText}]`;
      } else if (value?.type === "JSXExpressionContainer" && value.expression.type !== "JSXEmptyExpression") {
        const expr = value.expression;
        if (expr.type === "ArrayExpression") {
          if (expr.elements.some((e) => e === null)) return null;
          classText = `[${expr.elements.map((e) => sourceCode.getText(e!)).join(", ")}, ${listText}]`;
        } else {
          classText = `[${sourceCode.getText(expr)}, ${listText}]`;
        }
      }
      if (classText === null) return null;
      const before = sourceCode.getTokenBefore(list);
      return [
        fixer.replaceText(cls.value!, `{${classText}}`),
        fixer.removeRange([before ? before.range[1] : list.range[0], list.range[1]]),
      ];
    }
  },
});
