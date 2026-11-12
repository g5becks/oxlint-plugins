import { defineRule, type ESTree, type Fix, type Fixer } from "@oxlint/plugins";
import type { FunctionNode } from "../utils/functions.ts";

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
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/no-destructure.md",
    },
    fixable: "code" as const,
    schema: [],
    messages: {
      noDestructure: "Destructuring component props breaks Solid's reactivity; use property access instead.",
    },
  },
  createOnce(context) {
    const functionStack: Array<{ hasJSX: boolean }> = [];
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
          context.report({
            node: props,
            messageId: "noDestructure",
            fix: (fixer) => fixDestructure(node, props, fixer),
          });
        }
      }
      functionStack.pop();
    };

    function* fixDestructure(func: FunctionNode, props: ESTree.ObjectPattern, fixer: Fixer): Generator<Fix> {
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
      const origProps = !(hasDefaults || rest) ? propsName : "_" + propsName;

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
      if (hasDefaults && rest) {
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
      },
      FunctionDeclaration: onFunctionEnter,
      FunctionExpression: onFunctionEnter,
      ArrowFunctionExpression: onFunctionEnter,
      "FunctionDeclaration:exit": onFunctionExit,
      "FunctionExpression:exit": onFunctionExit,
      "ArrowFunctionExpression:exit": onFunctionExit,
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
