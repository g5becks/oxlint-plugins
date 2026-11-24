import { defineRule, type ESTree } from "@oxlint/plugins";
import { trackImports } from "../utils/imports.ts";
import { trace } from "../utils/trace.ts";
import { isFunctionNode } from "../utils/functions.ts";
import { readSolidVersion } from "../utils/settings.ts";

/** Solid 2.0 store APIs, exported from solid-js; stores always use a Proxy (TASK-054). */
const STORE_APIS_V2 = new Set(["createStore", "createProjection", "createOptimisticStore"]);

function isPropsByName(name: string): boolean {
  return /^(?:props|_props)$/.test(name);
}

export default defineRule({
  meta: {
    type: "problem" as const,
    docs: {
      description: "Disallow usage of APIs that use ES6 Proxies, only to target environments that don't support them.",
      recommended: "warn",
      url: "https://github.com/g5becks/oxlint-plugins/blob/main/packages/solidjs/docs/rules/no-proxy-apis.md",
    },
    schema: [],
    messages: {
      noStore: "Solid Store APIs use Proxies, which are incompatible with your target environment.",
      spreadCall:
        "Using a function call in JSX spread makes Solid use Proxies, which are incompatible with your target environment.",
      spreadMember:
        "Using a property access in JSX spread makes Solid use Proxies, which are incompatible with your target environment.",
      proxyLiteral: "Proxies are incompatible with your target environment.",
      mergeProps:
        "If you pass a function to `mergeProps`, it will create a Proxy, which are incompatible with your target environment.",
      noStoreV2: "Solid's store APIs ({{name}}) use Proxies, which are incompatible with your target environment.",
      mergeV2:
        "A function passed to `merge` needs a Proxy: without Proxy support, merge falls back to copying properties, which can't read a function source.",
    },
  },
  createOnce(context) {
    const tracker = trackImports();
    let v2 = false;

    const badMergeArgs = (args: ReadonlyArray<ESTree.Node>) =>
      args.filter((arg) => {
        if (arg.type === "SpreadElement") return true;
        const traced = trace(arg, context);
        return (traced?.type === "Identifier" && !isPropsByName(traced.name)) || isFunctionNode(traced);
      });

    return {
      before() {
        tracker.clear();
        v2 = readSolidVersion(context) === 2;
      },

      Program() {
        tracker.clear();
      },

      ImportDeclaration(node) {
        tracker.handleImportDeclaration(node);

        if (node.source?.value === "solid-js/store") {
          context.report({ node, messageId: "noStore" });
        } else if (v2 && node.source?.value === "solid-js" && node.importKind !== "type") {
          // Version 2: the store APIs are exported from solid-js (MIGRATION §Imports).
          for (const specifier of node.specifiers ?? []) {
            if (
              specifier.type === "ImportSpecifier" &&
              specifier.importKind !== "type" &&
              specifier.imported.type === "Identifier" &&
              STORE_APIS_V2.has(specifier.imported.name)
            ) {
              context.report({ node: specifier, messageId: "noStoreV2", data: { name: specifier.imported.name } });
            }
          }
        }
      },

      "JSXSpreadAttribute MemberExpression"(node) {
        context.report({ node, messageId: "spreadMember" });
      },

      "JSXSpreadAttribute CallExpression"(node) {
        context.report({ node, messageId: "spreadCall" });
      },

      CallExpression(node) {
        if (node.callee.type === "Identifier") {
          if (v2 && tracker.matchImport("merge", node.callee.name)) {
            // @solidjs/signals 2.0.3: merge() copies without Proxy, but a function source needs one.
            for (const badArg of badMergeArgs(node.arguments ?? [])) {
              context.report({ node: badArg, messageId: "mergeV2" });
            }
          } else if (tracker.matchImport("mergeProps", node.callee.name)) {
            (node.arguments ?? [])
              .filter((arg) => {
                if (arg.type === "SpreadElement") return true;
                const traced = trace(arg, context);
                return (traced?.type === "Identifier" && !isPropsByName(traced.name)) || isFunctionNode(traced);
              })
              .forEach((badArg) => {
                context.report({ node: badArg, messageId: "mergeProps" });
              });
          }
        } else if (node.callee.type === "MemberExpression") {
          if (
            node.callee.object?.type === "Identifier" &&
            node.callee.object.name === "Proxy" &&
            node.callee.property?.type === "Identifier" &&
            node.callee.property.name === "revocable"
          ) {
            context.report({ node, messageId: "proxyLiteral" });
          }
        }
      },

      NewExpression(node) {
        if (node.callee?.type === "Identifier" && node.callee.name === "Proxy") {
          context.report({ node, messageId: "proxyLiteral" });
        }
      },
    };
  },
});
