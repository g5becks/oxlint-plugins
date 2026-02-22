import { pathAsFirstArgFunctions, pathAsPropertyFunctions, VALID_PARAM_NAME_REGEX } from "../utils/constants";
import { createTanstackRouterImportTracker } from "../utils/detect-router-imports";

type ExtractedParam = {
  fullParam: string;
  paramName: string;
  isOptional: boolean;
  isValid: boolean;
};

function extractParamsFromSegment(segment: string): Array<ExtractedParam> {
  const params: Array<ExtractedParam> = [];

  if (!segment || !segment.includes("$")) {
    return params;
  }

  if (segment === "$" || segment === "{$}") {
    return params;
  }

  if (segment.startsWith("$") && !segment.includes("{")) {
    const paramName = segment.slice(1);
    if (paramName) {
      params.push({
        fullParam: segment,
        paramName,
        isOptional: false,
        isValid: VALID_PARAM_NAME_REGEX.test(paramName),
      });
    }
    return params;
  }

  const bracePattern = /\{(-?\$)([^}]*)\}/g;
  let match: RegExpExecArray | null;

  while ((match = bracePattern.exec(segment)) !== null) {
    const prefix = match[1];
    const paramName = match[2];

    if (!paramName) {
      continue;
    }

    params.push({
      fullParam: `${prefix}${paramName}`,
      paramName,
      isOptional: prefix === "-$",
      isValid: VALID_PARAM_NAME_REGEX.test(paramName),
    });
  }

  return params;
}

function extractParamsFromPath(path: string): Array<ExtractedParam> {
  if (!path || !path.includes("$")) {
    return [];
  }

  return path.split("/").flatMap(extractParamsFromSegment);
}

function getInvalidParams(path: string): Array<ExtractedParam> {
  return extractParamsFromPath(path).filter((param) => !param.isValid);
}

function getStringLiteralValue(node: any): string | null {
  if (node?.type === "Literal" && typeof node.value === "string") {
    return node.value;
  }

  if (node?.type === "TemplateLiteral" && node.quasis?.length === 1) {
    const cooked = node.quasis[0]?.value?.cooked;
    if (cooked != null) {
      return cooked;
    }
  }

  return null;
}

const pathAsFirstArgSet = new Set<string>(pathAsFirstArgFunctions);
const pathAsPropertySet = new Set<string>(pathAsPropertyFunctions);

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Ensure route param names are valid JavaScript identifiers",
      recommended: "error",
    },
    messages: {
      invalidParamName:
        'Invalid param name "{{paramName}}" in route path. Param names must be valid JavaScript identifiers (match /[a-zA-Z_$][a-zA-Z0-9_$]*/).',
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context: any) {
    const tracker = createTanstackRouterImportTracker();

    const reportInvalidParams = (node: any, path: string) => {
      const invalidParams = getInvalidParams(path);
      for (const param of invalidParams) {
        context.report({
          node,
          messageId: "invalidParamName",
          data: { paramName: param.paramName },
        });
      }
    };

    return {
      before() {
        tracker.reset();
      },
      Program() {
        tracker.reset();
      },
      ImportDeclaration(node: any) {
        tracker.handleImportDeclaration(node);
      },
      CallExpression(node: any) {
        if (node?.callee?.type === "Identifier") {
          const funcName = node.callee.name;
          if (!tracker.isTanstackRouterImport(funcName)) {
            return;
          }

          if (pathAsPropertySet.has(funcName)) {
            const arg = node.arguments?.[0];
            if (arg?.type === "ObjectExpression") {
              for (const prop of arg.properties ?? []) {
                if (prop?.type !== "Property") {
                  continue;
                }

                const isPathKey =
                  (prop.key?.type === "Identifier" && prop.key.name === "path") ||
                  (prop.key?.type === "Literal" && prop.key.value === "path");

                if (isPathKey) {
                  const pathValue = getStringLiteralValue(prop.value);
                  if (pathValue != null) {
                    reportInvalidParams(prop.value, pathValue);
                  }
                }
              }
            }
            return;
          }
        }

        if (node?.callee?.type === "CallExpression" && node.callee.callee?.type === "Identifier") {
          const funcName = node.callee.callee.name;
          if (!tracker.isTanstackRouterImport(funcName) || !pathAsFirstArgSet.has(funcName)) {
            return;
          }

          const pathArg = node.callee.arguments?.[0];
          const pathValue = getStringLiteralValue(pathArg);
          if (pathValue != null) {
            reportInvalidParams(pathArg, pathValue);
          }
        }
      },
    };
  },
};
