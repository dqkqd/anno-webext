import { beforeEach, describe, expect, it } from 'vitest';
import { getNodeByXPath, getNodeXPath } from '../location';

function getNthText(parent: Node, index: number): Text {
  const texts = [...parent.childNodes].filter(n =>
    n.nodeType === Node.TEXT_NODE
  );
  return texts[index] as Text;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

it.each([
  {
    name: 'root element',
    html: '<div>hello</div>',
    getNode: () => document.body.firstElementChild!,
  },
  {
    name: 'nested child',
    html: '<div><p>text</p></div>',
    getNode: () => document.querySelector('p')!,
  },
  {
    name: 'first sibling',
    html: '<span>A</span><span>B</span>',
    getNode: () => document.querySelectorAll('span')[0],
  },
  {
    name: 'second sibling',
    html: '<span>A</span><span>B</span>',
    getNode: () => document.querySelectorAll('span')[1],
  },
  {
    name: 'different-tag siblings',
    html: '<div></div><span></span><div></div>',
    getNode: () => document.querySelectorAll('div')[1],
  },
  {
    name: 'deeply nested',
    html: '<section><div><article><span>deep</span></article></div></section>',
    getNode: () => document.querySelector('span')!,
  },
  {
    name: 'uppercase tag',
    html: '<DIV>text</DIV>',
    getNode: () => document.body.firstElementChild!,
  },
  {
    name: 'text in p',
    html: '<p>This is a text node with spaces</p>',
    getNode: () => document.querySelector('p')!.firstChild!,
  },
  {
    name: 'text among siblings',
    html: '<p>first part<b>bold</b>second part<em>italic</em>third part</p>',
    getNode: () => getNthText(document.querySelector('p')!, 2),
  },
  {
    name: 'text in multi-sibling',
    html:
      '<div><p>1</p><p>2</p><p>3</p><p>4</p><p>5</p><p>6</p><p>mid text here</p><p>8</p><p>9</p><p>10</p></div>',
    getNode: () => document.querySelectorAll('p')[6].firstChild!,
  },
])('roundtrip: $name', ({ html, getNode }) => {
  document.body.innerHTML = html;
  const target = getNode();
  const stored = getNodeXPath(target);
  expect(typeof stored.xpath).toBe('string');
  expect(getNodeByXPath(stored)).toBe(target);
});

describe('edge cases', () => {
  it('document node -> empty xpath', () => {
    expect(getNodeXPath(document)).toEqual({ xpath: '' });
  });

  it('comment node -> returns parent xpath', () => {
    document.body.innerHTML = '<div><!-- comment --></div>';
    const comment = document.querySelector('div')!.childNodes[0];
    const stored = getNodeXPath(comment);
    expect(typeof stored.xpath).toBe('string');
    expect(getNodeByXPath(stored)).toBe(comment.parentNode);
  });

  it('orphan element -> empty xpath', () => {
    const orphan = document.createElement('div');
    expect(getNodeXPath(orphan)).toEqual({ xpath: '' });
  });

  it('getNodeByXPath: empty xpath throws', () => {
    expect(() => getNodeByXPath({ xpath: '' })).toThrow();
  });

  it('getNodeByXPath: non-existent xpath -> null', () => {
    document.body.innerHTML = '<div></div>';
    expect(getNodeByXPath({ xpath: '/html[1]/body[1]/span[1]' })).toBeNull();
  });
});
