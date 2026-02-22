import { shouldIgnorePattern } from "../utils/ignore";
import { isShallowReadonly } from "../utils/immutability";

type CategoryOption = {
  enforcement?: "ReadonlyShallow";
  ignoreNamePattern?: string | Array<string>;
};

type RuleOptions = [
  {
    parameters?: CategoryOption;
    returnTypes?: CategoryOption;
    variables?: CategoryOption;
  }?,
];

function getCategoryOption(option: any, key: "parameters" | "returnTypes" | "variables"): CategoryOption {
  const value = option?.[key] ?? {};
  return {
    enforcement: value.enforcement ?? "ReadonlyShallow",
    ignoreNamePattern: value.ignoreNamePattern,
  };
}

function getParamName(param: any): string | undefined {
  if (param?.type === "Identifier") {
    return param.name;
  }
  return undefined;
}

function reportIfNotShallowReadonly(
  context: any,
  node: any,
  typeNode: any,
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

export default {
  meta: {
    type: "suggestion",
    docs: {
      description: "Require shallow readonly types for parameters, return types, and variables.",
      recommended: "error",
    },
    schema: [
      {
        type: "object",
        properties: {
          parameters: { type: "object" },
          returnTypes: { type: "object" },
          variables: { type: "object" },
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
  },
  defaultOptions: [
    {
      parameters: { enforcement: "ReadonlyShallow" },
      returnTypes: { enforcement: "ReadonlyShallow" },
      variables: { enforcement: "ReadonlyShallow" },
    },
  ] as RuleOptions,
  createOnce(context: any) {
    const getOpts = () => {
      const option = (context.options?.[0] ?? {}) as RuleOptions[0];
      return {
        parameters: getCategoryOption(option, "parameters"),
        returnTypes: getCategoryOption(option, "returnTypes"),
        variables: getCategoryOption(option, "variables"),
      };
    };

    const checkFunction = (node: any) => {
      const { parameters, returnTypes } = getOpts();
      if (parameters.enforcement === "ReadonlyShallow") {
        for (const param of node.params ?? []) {
          const typeNode = param?.typeAnnotation?.typeAnnotation;
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
      TSPropertySignature(node: any) {
        const { variables } = getOpts();
        if (variables.enforcement !== "ReadonlyShallow") {
          return;
        }

        const typeNode = node.typeAnnotation?.typeAnnotation;
        const name = node.key?.type === "Identifier" ? node.key.name : undefined;
        reportIfNotShallowReadonly(context, node, typeNode, "property", variables.ignoreNamePattern, name);
      },
      VariableDeclarator(node: any) {
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
};
