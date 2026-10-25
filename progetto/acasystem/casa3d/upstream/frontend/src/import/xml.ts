// A small XML reader for the importers (Sweet Home 3D's Home.xml): elements with their attributes and children;
// text, comments and processing instructions are skipped. Works the same in the browser and in tests.

export interface XmlNode {
  name: string;
  attrs: Record<string, string>;
  children: XmlNode[];
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
    if (e[0] === "#") return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITIES[e] ?? m;
  });
}

export function parseXml(text: string): XmlNode {
  const root: XmlNode = { name: "#root", attrs: {}, children: [] };
  const stack: XmlNode[] = [root];
  let i = 0;
  const n = text.length;
  while (i < n) {
    const lt = text.indexOf("<", i);
    if (lt < 0) break;
    if (text.startsWith("<!--", lt)) {
      const end = text.indexOf("-->", lt + 4);
      i = end < 0 ? n : end + 3;
      continue;
    }
    if (text.startsWith("<![CDATA[", lt)) {
      const end = text.indexOf("]]>", lt);
      i = end < 0 ? n : end + 3;
      continue;
    }
    if (text[lt + 1] === "?" || text[lt + 1] === "!") {
      const end = text.indexOf(">", lt);
      i = end < 0 ? n : end + 1;
      continue;
    }
    if (text[lt + 1] === "/") {
      const end = text.indexOf(">", lt);
      if (stack.length > 1) stack.pop();
      i = end < 0 ? n : end + 1;
      continue;
    }
    // an element: its name, then attributes up to ">" or "/>" (quoted values may hold ">")
    let j = lt + 1;
    while (j < n && !/[\s/>]/.test(text[j])) j++;
    const node: XmlNode = { name: text.slice(lt + 1, j), attrs: {}, children: [] };
    let selfClosing = false;
    while (j < n) {
      while (j < n && /\s/.test(text[j])) j++;
      if (text[j] === ">") {
        j++;
        break;
      }
      if (text[j] === "/" && text[j + 1] === ">") {
        selfClosing = true;
        j += 2;
        break;
      }
      let k = j;
      while (k < n && !/[\s=/>]/.test(text[k])) k++;
      const key = text.slice(j, k);
      j = k;
      while (j < n && /\s/.test(text[j])) j++;
      if (text[j] === "=") {
        j++;
        while (j < n && /\s/.test(text[j])) j++;
        const q = text[j];
        if (q === '"' || q === "'") {
          const end = text.indexOf(q, j + 1);
          node.attrs[key] = decode(text.slice(j + 1, end < 0 ? n : end));
          j = end < 0 ? n : end + 1;
        } else {
          let e = j;
          while (e < n && !/[\s>]/.test(text[e])) e++;
          node.attrs[key] = decode(text.slice(j, e));
          j = e;
        }
      } else if (key) node.attrs[key] = "";
      else j++;
    }
    stack[stack.length - 1].children.push(node);
    if (!selfClosing) stack.push(node);
    i = j;
  }
  return root;
}

/** All elements of a name below a node, in document order. */
export function findAll(node: XmlNode, name: string, out: XmlNode[] = []): XmlNode[] {
  for (const c of node.children) {
    if (c.name === name) out.push(c);
    findAll(c, name, out);
  }
  return out;
}
