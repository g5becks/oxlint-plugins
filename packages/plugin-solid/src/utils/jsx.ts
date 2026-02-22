const HTML_TAGS = new Set<string>([
  "a",
  "abbr",
  "address",
  "article",
  "aside",
  "audio",
  "b",
  "blockquote",
  "body",
  "br",
  "button",
  "canvas",
  "caption",
  "code",
  "col",
  "colgroup",
  "data",
  "datalist",
  "dd",
  "details",
  "dialog",
  "div",
  "dl",
  "dt",
  "em",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hr",
  "html",
  "i",
  "iframe",
  "img",
  "input",
  "label",
  "legend",
  "li",
  "link",
  "main",
  "meta",
  "nav",
  "ol",
  "option",
  "p",
  "pre",
  "script",
  "section",
  "select",
  "small",
  "span",
  "strong",
  "style",
  "svg",
  "table",
  "tbody",
  "td",
  "template",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "title",
  "tr",
  "u",
  "ul",
  "video",
]);

export function isDOMElementName(name: string): boolean {
  return HTML_TAGS.has(name) || /^[a-z]/.test(name);
}

export function isJSXElementOrFragment(node: any): boolean {
  return node?.type === "JSXElement" || node?.type === "JSXFragment";
}

export function getJSXAttributeName(attribute: any): string | null {
  if (!attribute || attribute.type !== "JSXAttribute") {
    return null;
  }

  if (attribute.name?.type === "JSXIdentifier") {
    return attribute.name.name;
  }

  if (attribute.name?.type === "JSXNamespacedName") {
    const ns = attribute.name.namespace?.name;
    const name = attribute.name.name?.name;
    return ns && name ? `${ns}:${name}` : null;
  }

  return null;
}

export function getJSXAttributeValue(attribute: any): any {
  return attribute?.value ?? null;
}

export function jsxPropName(prop: any): string {
  if (prop?.name?.type === "JSXNamespacedName") {
    return `${prop.name.namespace.name}:${prop.name.name.name}`;
  }

  return prop?.name?.name ?? "";
}

export function* jsxGetAllProps(props: Array<any>): Generator<[string, any]> {
  for (const attr of props ?? []) {
    if (attr?.type === "JSXSpreadAttribute" && attr.argument?.type === "ObjectExpression") {
      for (const property of attr.argument.properties ?? []) {
        if (property?.type === "Property") {
          if (property.key?.type === "Identifier") {
            yield [property.key.name, property.key];
          } else if (property.key?.type === "Literal") {
            yield [String(property.key.value), property.key];
          }
        }
      }
    } else if (attr?.type === "JSXAttribute") {
      yield [jsxPropName(attr), attr.name];
    }
  }
}

export function jsxHasProp(props: Array<any>, prop: string): boolean {
  for (const [name] of jsxGetAllProps(props)) {
    if (name === prop) {
      return true;
    }
  }

  return false;
}

export function jsxGetProp(props: Array<any>, prop: string): any | undefined {
  return (props ?? []).find(
    (attribute: any) => attribute?.type !== "JSXSpreadAttribute" && prop === jsxPropName(attribute),
  );
}
