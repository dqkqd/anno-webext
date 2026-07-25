export function getNodeXPath(node: Node): string {
  if (node.nodeType === Node.DOCUMENT_NODE) {
    return '';
  }
  if (node.nodeType === Node.TEXT_NODE) {
    const textIndex = [...node.parentNode!.childNodes]
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .indexOf(node as Text);
    return getNodeXPath(node.parentNode!) + `/text()[${textIndex + 1}]`;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return getNodeXPath(node.parentNode!);
  }

  let ix = 0;
  const siblings = node.parentNode?.childNodes || [];
  for (let i = 0; i < siblings.length; i++) {
    const sibling = siblings[i];
    if (sibling === node) {
      return getNodeXPath(node.parentNode!)
        + '/'
        + (node as Element).tagName.toLowerCase()
        + '['
        + (ix + 1)
        + ']';
    }
    if (
      sibling.nodeType === Node.ELEMENT_NODE
      && (sibling as Element).tagName === (node as Element).tagName
    ) {
      ix++;
    }
  }
  return '';
}

export function getNodeByXPath(xpath: string): Node | null {
  return document.evaluate(
    xpath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  )
    .singleNodeValue;
}
