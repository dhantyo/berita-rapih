// Paragraphs written as one <p> with blank lines between them (Tribrata News, some CMS editors):
//   <p>First…<br><br>Second…<br><br>Third…</p>  →  <p>First…</p><p>Second…</p><p>Third…</p>
// Real paragraphs space correctly, junk rules match each line on its own, and the reader can mark
// a single paragraph with Tandai. A single <br> (a line break inside a paragraph) is kept.
//
// Some sites (Sindonews, Medcom) have no <p> at all: the body container holds bare text and inline
// elements separated by <br>. Those runs get wrapped into <p>, and there a single <br> also ends
// a paragraph, since that is how those sites separate them.

const isBlank = (n: Node) => n.nodeType === 3 && !(n.textContent ?? '').trim();
const isBr = (n: Node | null): n is HTMLBRElement => !!n && n.nodeType === 1 && (n as Element).tagName === 'BR';

const BLOCK = new Set([
  'P', 'DIV', 'FIGURE', 'UL', 'OL', 'LI', 'TABLE', 'BLOCKQUOTE', 'PRE', 'HR', 'SECTION', 'ARTICLE', 'ASIDE',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'IFRAME', 'VIDEO', 'FORM', 'DL', 'SCRIPT', 'STYLE', 'NOSCRIPT',
]);
const isBlock = (n: Node) => n.nodeType === 1 && BLOCK.has((n as Element).tagName);

/** Wraps the container's own bare text/inline runs (split at <br> and block children) into <p>. */
function wrapBareRuns(root: HTMLElement): number {
  const kids = [...root.childNodes];
  // Only a container with no <p> of its own and at least one direct <br> is a "bare text" body.
  if (kids.some((k) => (k as Element).tagName === 'P') || !kids.some(isBr)) return 0;
  const doc = root.ownerDocument;
  let run: Node[] = [];
  let n = 0;
  const flush = () => {
    if (run.some((x) => !isBlank(x))) {
      const p = doc.createElement('p');
      run[0]!.parentNode!.insertBefore(p, run[0]!);
      p.append(...run);
      n++;
    } else run.forEach((x) => x.parentNode?.removeChild(x));
    run = [];
  };
  for (const k of kids) {
    if (isBr(k)) { flush(); k.remove(); } // single or repeated <br>: either way the paragraph ends
    else if (isBlock(k)) flush();
    else run.push(k);
  }
  flush();
  return n;
}

/** Shortest loose run (in characters) that is a paragraph of its own, not a stray label or separator. */
const LOOSE_PARAGRAPH = 40;

/**
 * A body with real <p>s that also holds a long loose run of text. Detik's phone pages write the first paragraph as
 * bare text followed by an empty <p>:  <strong>Jakarta</strong> - Wisata paramotor…<p></p><p>Bagi traveler…</p>
 * Left loose, it has no paragraph spacing and runs into the next one. Each such run becomes its own <p>.
 */
function wrapLooseRuns(root: HTMLElement): number {
  const kids = [...root.childNodes];
  if (!kids.some((k) => (k as Element).tagName === 'P')) return 0;
  const doc = root.ownerDocument;
  let run: Node[] = [];
  let n = 0;
  const flush = () => {
    const text = run.map((x) => x.textContent ?? '').join('').replace(/\s+/g, ' ').trim();
    if (text.length >= LOOSE_PARAGRAPH) {
      const p = doc.createElement('p');
      run[0]!.parentNode!.insertBefore(p, run[0]!);
      p.append(...run);
      n++;
    }
    run = [];
  };
  for (const k of kids) {
    if (isBr(k) || isBlock(k)) flush();
    else if (k.nodeType === 1 || k.nodeType === 3) run.push(k);
  }
  flush();
  return n;
}

/** Returns how many paragraphs were split or created. */
export function splitBreaks(root: HTMLElement): number {
  const doc = root.ownerDocument;
  let n = wrapBareRuns(root) + wrapLooseRuns(root);
  for (const p of [...root.querySelectorAll('p')]) {
    const nodes = [...p.childNodes];
    const groups: Node[][] = [[]];
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]!;
      if (isBr(node)) {
        // A blank line: this <br>, optional whitespace, and another <br>.
        let j = i + 1;
        while (j < nodes.length && isBlank(nodes[j]!)) j++;
        if (isBr(nodes[j] ?? null)) {
          groups.push([]);
          i = j;
          continue;
        }
      }
      groups[groups.length - 1]!.push(node);
    }
    const parts = groups.filter((g) => g.some((x) => !isBlank(x) && !isBr(x)));
    if (parts.length < 2) continue;
    const paragraphs = parts.map((g) => {
      const q = doc.createElement('p');
      q.append(...g);
      return q;
    });
    p.replaceWith(...paragraphs);
    n++;
  }
  return n;
}
