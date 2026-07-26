import { describe, expect, it } from 'vitest';
import { getRangeByText } from '../finder';

function assertRange(html: string, search: string, expected: string) {
  document.body.innerHTML = html;
  const range = getRangeByText(document.body, search);
  expect(range).toBeDefined();
  expect(range!.toString()).toBe(expected);
}

function assertNotFound(html: string, search: string) {
  document.body.innerHTML = html;
  expect(getRangeByText(document.body, search)).toBeUndefined();
}

describe('getRangeByText', () => {
  describe('single', () => {
    it.each([
      {
        name: 'whole',
        html: '<p>hello world</p>',
        search: 'hello world',
        expected: 'hello world',
      },
      {
        name: 'prefix',
        html: '<p>hello world</p>',
        search: 'hello',
        expected: 'hello',
      },
      {
        name: 'suffix',
        html: '<p>hello world</p>',
        search: 'world',
        expected: 'world',
      },
      {
        name: 'middle',
        html: '<p>the quick brown fox</p>',
        search: 'quick',
        expected: 'quick',
      },
      {
        name: 'single char',
        html: '<p>only one</p>',
        search: 'n',
        expected: 'n',
      },
      {
        name: 'deeply nested',
        html:
          '<div><section><article><p>deep text</p></article></section></div>',
        search: 'deep text',
        expected: 'deep text',
      },
      {
        name: 'collapsed spaces',
        html: '<p>the  quick  brown  fox</p>',
        search: 'quick brown',
        expected: 'quick  brown',
      },
      {
        name: 'newlines',
        html: '<p>hello\nworld</p>',
        search: 'hello world',
        expected: 'hello\nworld',
      },
      {
        name: 'tabs',
        html: '<p>hello\tworld</p>',
        search: 'hello world',
        expected: 'hello\tworld',
      },
      {
        name: 'extra search spaces',
        html: '<p>hello world</p>',
        search: 'hello   world',
        expected: 'hello world',
      },
      {
        name: 'leading',
        html: '<p> hello world</p>',
        search: 'hello world',
        expected: 'hello world',
      },
      {
        name: 'trailing',
        html: '<p>hello world </p>',
        search: 'hello world',
        expected: 'hello world',
      },
      {
        name: 'laeding and trailing',
        html: '<p> hello world </p>',
        search: 'hello world',
        expected: 'hello world',
      },
      {
        name: 'unicode',
        html: '<p>café 北京 👋</p>',
        search: 'café',
        expected: 'café',
      },
    ])(
      '$name',
      ({ html, search, expected }) => assertRange(html, search, expected),
    );

    it.each([
      { name: 'not found', html: '<p>hello world</p>', search: 'xyz' },
      { name: 'empty', html: '<p>hello</p>', search: '' },
      { name: 'no text nodes', html: '<div></div>', search: 'hello' },
      { name: 'all whitespace', html: '<p>   </p>', search: 'hello' },
    ])('$name', ({ html, search }) => assertNotFound(html, search));
  });

  describe('multiple', () => {
    it.each([
      {
        name: 'contiguous',
        html: '<p>hello<b>world</b></p>',
        search: 'helloworld',
        expected: 'helloworld',
      },
      {
        name: 'cross boundary',
        html: '<p>hello<i>world</i></p>',
        search: 'lowo',
        expected: 'lowo',
      },
      {
        name: 'multiple elements',
        html: '<p>one <b>two</b> three <em>four</em> five</p>',
        search: 'one two three four five',
        expected: 'one two three four five',
      },
      {
        name: 'zero-width',
        html: '<p> one <i></i> two </p>',
        search: 'one two',
        expected: 'one  two',
      },
      {
        name: 'empty middle',
        html: '<p> one <i>  </i> two </p>',
        search: 'one two',
        expected: 'one    two',
      },
      {
        name: 'consecutive empty',
        html: '<p> one <b>   </b><i>   </i> two </p>',
        search: 'one two',
        expected: 'one        two',
      },
      {
        name: 'leading empty',
        html: '<p><i> </i>   <b> one </b></p>',
        search: 'one',
        expected: 'one',
      },
      {
        name: 'trailing empty',
        html: '<p><b> one </b>  <i> </i> </p>',
        search: 'one',
        expected: 'one',
      },
    ])(
      '$name',
      ({ html, search, expected }) => assertRange(html, search, expected),
    );
  });
});
