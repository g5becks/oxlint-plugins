function isIdentifierTypeReference(node: any, name: string): boolean {
  return node?.type === "TSTypeReference" && node.typeName?.type === "Identifier" && node.typeName.name === name;
}

export function hasReadonlyModifier(property: any): boolean {
  if (!property) {
    return false;
  }
  if (property.type === "TSPropertySignature" || property.type === "TSIndexSignature") {
    return property.readonly === true;
  }
  return false;
}

export function isReadonlyArrayType(typeNode: any): boolean {
  if (!typeNode) {
    return false;
  }

  if (typeNode.type === "TSArrayType") {
    return false;
  }

  if (typeNode.type === "TSTypeOperator" && typeNode.operator === "readonly" && typeNode.typeAnnotation?.type === "TSArrayType") {
    return true;
  }

  if (isIdentifierTypeReference(typeNode, "ReadonlyArray")) {
    return true;
  }

  if (isIdentifierTypeReference(typeNode, "ReadonlyMap") || isIdentifierTypeReference(typeNode, "ReadonlySet")) {
    return true;
  }

  return false;
}

function isMemberReadonly(member: any): boolean {
  if (!member) {
    return true;
  }

  if (member.type === "TSPropertySignature") {
    if (!member.readonly) {
      return false;
    }
    // A `readonly` property whose type is a plain (non-readonly) array literal is not considered
    // shallowly immutable because the array itself is still mutable.
    if (member.typeAnnotation?.typeAnnotation?.type === "TSArrayType") {
      return false;
    }
    // For all other types (TSTypeReference, TSTypeOperator, primitives, etc.) we treat a
    // `readonly` modifier as sufficient at the shallow level. We cannot resolve type aliases
    // without the type checker, so referenced types are accepted as-is.
    return true;
  }

  if (member.type === "TSIndexSignature") {
    return member.readonly === true;
  }

  return true;
}

export function isShallowReadonly(typeNode: any): boolean {
  if (!typeNode) {
    return false;
  }

  if (isReadonlyArrayType(typeNode)) {
    return true;
  }

  if (typeNode.type === "TSTypeLiteral") {
    return typeNode.members.every((member: any) => isMemberReadonly(member));
  }

  if (typeNode.type === "TSInterfaceBody") {
    return typeNode.body.every((member: any) => isMemberReadonly(member));
  }

  return false;
}
