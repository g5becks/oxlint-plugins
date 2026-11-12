import { type Context, defineRule, type ESTree } from "@oxlint/plugins";
import { shouldIgnorePattern } from "../utils/ignore.ts";
import { isShallowReadonly } from "../utils/immutability.ts";
import { ruleOptions } from "../utils/options.ts";

type CategoryOption = {
  enforcement?: "ReadonlyShallow" | "None" | false;
  ignoreNamePattern?: string | Array<string>;
};

type RuleOptions = [
  {
    parameters?: CategoryOption;
    returnTypes?: CategoryOption;
    variables?: CategoryOption;
  }?,
];

/**
 * Options per category. Only ReadonlyShallow is implemented (no type information), so
 * `enforcement` accepts "ReadonlyShallow", or "None" / false to turn the category off (upstream's
 * spellings); upstream-only levels and keys are rejected rather than silently ignored.
 */
const CATEGORY_SCHEMA = {
  type: "object",
  properties: {
    enforcement: { enum: ["ReadonlyShallow", "None", false] },
    ignoreNamePattern: { anyOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] },
  },
  additionalProperties: false,
};

function getCategoryOption(option: RuleOptions[0], key: "parameters" | "returnTypes" | "variables"): CategoryOption {
  const value = option?.[key] ?? {};
  return {
    enforcement: value.enforcement ?? "ReadonlyShallow",
    ignoreNamePattern: value.ignoreNamePattern,
  };
}

type FunctionNode = ESTree.Function | ESTree.ArrowFunctionExpression;

function getParamName(param: ESTree.ParamPattern): string | undefined {
  if (param.type === "Identifier") {
    return param.name;
  }
  return undefined;
}

function reportIfNotShallowReadonly(
  context: Context,
  node: ESTree.Node,
  typeNode: ESTree.TSType | undefined,
  messageId: string,
  ignoreNamePattern?: string | Array<string>,
  name?: string,
) {
  if (ignoreNamePattern && shouldIgnorePattern(name, ignoreNamePattern)) {
    return;
  }

  if (!typeNode || !isShallowReadonly(typeNode)) {
    context.report({ node, messageId });
  }
}

export default defineRule({
  meta: {
    type: "suggestion" as const,
    docs: {
      description: "Require shallow readonly types for parameters, return types, and variables.",
      recommended: "error",
    },
    schema: [
      {
        type: "object",
        properties: {
          parameters: CATEGORY_SCHEMA,
          returnTypes: CATEGORY_SCHEMA,
          variables: CATEGORY_SCHEMA,
        },
        additionalProperties: false,
      },
    ],
    messages: {
      parameter: "Parameter should be typed as ReadonlyShallow.",
      returnType: "Return type should be typed as ReadonlyShallow.",
      variable: "Variable should be typed as ReadonlyShallow.",
      property: "Property should be typed as ReadonlyShallow.",
    },
    defaultOptions: [
      {
        parameters: { enforcement: "ReadonlyShallow" },
        returnTypes: { enforcement: "ReadonlyShallow" },
        variables: { enforcement: "ReadonlyShallow" },
      },
    ],
  },
  createOnce(context) {
    const getOpts = () => {
      const option = ruleOptions<NonNullable<RuleOptions[0]>>(context);
      return {
        parameters: getCategoryOption(option, "parameters"),
        returnTypes: getCategoryOption(option, "returnTypes"),
        variables: getCategoryOption(option, "variables"),
      };
    };

    const checkFunction = (node: FunctionNode) => {
      const { parameters, returnTypes } = getOpts();
      if (parameters.enforcement === "ReadonlyShallow") {
        for (const param of node.params) {
          const typeNode = "typeAnnotation" in param ? (param.typeAnnotation?.typeAnnotation ?? undefined) : undefined;
          reportIfNotShallowReadonly(
            context,
            param,
            typeNode,
            "parameter",
            parameters.ignoreNamePattern,
            getParamName(param),
          );
        }
      }

      if (returnTypes.enforcement === "ReadonlyShallow") {
        const typeNode = node.returnType?.typeAnnotation;
        reportIfNotShallowReadonly(context, node, typeNode, "returnType", returnTypes.ignoreNamePattern);
      }
    };

    return {
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
      ArrowFunctionExpression: checkFunction,
      TSPropertySignature(node) {
        const { variables } = getOpts();
        if (variables.enforcement !== "ReadonlyShallow") {
          return;
        }

        const typeNode = node.typeAnnotation?.typeAnnotation;
        const name = node.key?.type === "Identifier" ? node.key.name : undefined;
        reportIfNotShallowReadonly(context, node, typeNode, "property", variables.ignoreNamePattern, name);
      },
      VariableDeclarator(node) {
        const { variables } = getOpts();
        if (variables.enforcement !== "ReadonlyShallow") {
          return;
        }

        const typeNode = node.id?.typeAnnotation?.typeAnnotation;
        const name = node.id?.type === "Identifier" ? node.id.name : undefined;
        reportIfNotShallowReadonly(context, node, typeNode, "variable", variables.ignoreNamePattern, name);
      },
    };
  },
});
