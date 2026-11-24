import { defineRule, type ESTree, type Fixer } from "@oxlint/plugins";
import { trackImports } from "../utils/imports.ts";
import { readSolidVersion } from "../utils/settings.ts";
import { SOLID_ANY_MODULE } from "../utils/solid2.ts";
import { trace } from "../utils/trace.ts";

// TASK-055. Solid 2.0's reconcile(value, key?) matches items by key, "id" by default; null is
// positional (RFC 04 §reconcile(value, key?); solid-js 2.0.3 store/index.d.ts). Data keyed by
// something else ("_id") is silently mismatched without an explicit key. 1.x passed
// { key, merge } options; 2.0 takes the key directly and always merges.

type Property = Extract<ESTree.ObjectExpression["properties"][number], { type: "Property" }>;

const propertyNamed = (object: ESTree.ObjectExpression, name: string): Property | undefined =>
  object.properties.find(
    (p): p is Property => p.type === "Property" && !p.computed && p.key.type === "Identifier" && p.key.name === name,
  );

export default defineRule({
  meta: {
    type: "problem" as const,
    docs: {
      description: "Require an explicit key for Solid 2.0's reconcile (settings.solidjs.version 2).",
      url: "https://github.com/g5becks/oxlint-plugins/blob/main/packages/solidjs/docs/rules/reconcile-key.md",
    },
    fixable: "code" as const,
    hasSuggestions: true,
    schema: [],
    messages: {
      missingKey:
        'reconcile without a key matches items by "id". Pass the key your data uses ("_id", a function, or null for positional matching), so items aren\'t silently mismatched.',
      suggestId: 'Make the default explicit: reconcile(value, "id").',
      suggestPositional: "Match by position: reconcile(value, null).",
      optionsObject: "In Solid 2.0, reconcile takes the key as its second argument, not an options object.",
      mergeFalse: "`merge: false` has no Solid 2.0 equivalent: reconcile always merges.",
    },
  },
  createOnce(context) {
    const imports = trackImports(SOLID_ANY_MODULE);

    const reportMissingKey = (
      node: ESTree.Node,
      replace: (fixer: Fixer, key: string) => ReturnType<Fixer["replaceText"]>,
    ) =>
      context.report({
        node,
        messageId: "missingKey",
        suggest: [
          { messageId: "suggestId", fix: (fixer) => replace(fixer, '"id"') },
          { messageId: "suggestPositional", fix: (fixer) => replace(fixer, "null") },
        ],
      });

    return {
      before() {
        imports.clear();
        return readSolidVersion(context) === 2;
      },
      ImportDeclaration(node) {
        imports.handleImportDeclaration(node);
      },
      CallExpression(node) {
        if (node.callee.type !== "Identifier" || !imports.matchImport("reconcile", node.callee.name)) return;
        const [value, key] = node.arguments;
        if (!value || value.type === "SpreadElement") return;
        if (!key) {
          reportMissingKey(node, (fixer, k) => fixer.insertTextAfter(value, `, ${k}`));
          return;
        }
        if (key.type === "SpreadElement") return;
        const traced = trace(key, context);
        if (traced?.type !== "ObjectExpression") return; // a key: string, null, function or variable
        if (traced !== key) {
          context.report({ node: key, messageId: "optionsObject" });
          return;
        }
        const options = key;
        const merge = propertyNamed(options, "merge");
        if (merge?.value.type === "Literal" && merge.value.value === false) {
          context.report({ node: merge, messageId: "mergeFalse" });
          return;
        }
        const keyProp = propertyNamed(options, "key");
        const onlyKnown = options.properties.every((p) => p === keyProp || p === merge);
        if (!keyProp) {
          if (onlyKnown) reportMissingKey(options, (fixer, k) => fixer.replaceText(options, k));
          else context.report({ node: options, messageId: "optionsObject" });
          return;
        }
        const literalKey =
          keyProp.value.type === "Literal" && (typeof keyProp.value.value === "string" || keyProp.value.value === null);
        const mergeIsTrue = !merge || (merge.value.type === "Literal" && merge.value.value === true);
        context.report({
          node: options,
          messageId: "optionsObject",
          ...(literalKey && mergeIsTrue && onlyKnown
            ? { fix: (fixer: Fixer) => fixer.replaceText(options, context.sourceCode.getText(keyProp.value)) }
            : {}),
        });
      },
    };
  },
});
