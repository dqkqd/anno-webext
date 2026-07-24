// Given a range, render it to string

export function renderRange(range: Range): string {
  const selection = window.getSelection();
  if (!selection) {
    return '';
  }
  const saved = Array.from(
    { length: selection.rangeCount },
    (_, i) => selection.getRangeAt(i),
  );
  selection.removeAllRanges();
  selection.addRange(range);
  const text = selection.toString();

  // restore
  selection.removeAllRanges();
  saved.forEach(r => selection.addRange(r));

  return text;
}
