export type TocItem = { id: string; text: string; level: 1 | 2 | 3 };

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

function decodeEntities(text: string) {
  return text.replace(/&(amp|lt|gt|quot|nbsp|#39);/g, (m) => ENTITIES[m] ?? m);
}

// 제목 안의 태그(굵게·링크 등)는 걷어내고, 줄바꿈(<br>)이 있으면 첫 줄만 목차 제목으로 쓴다
// (한 제목 블록에 여러 줄이 붙어 있는 경우 목차가 너무 길어지지 않게).
function headingText(innerHtml: string) {
  const firstLine = innerHtml.split(/<br\s*\/?>/i).find((part) => stripTags(part).trim()) ?? "";
  return decodeEntities(stripTags(firstLine)).replace(/\s+/g, " ").trim();
}

function stripTags(html: string) {
  return html.replace(/<[^>]*>/g, "");
}

function slugify(text: string) {
  const slug = text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "section";
}

// 본문 HTML의 h1~h3에 id를 달아서(주소 뒤 #제목 이동·스크롤 추적용) 돌려주고, 목차 항목도 함께 뽑는다.
// 서버/클라이언트 어디서든 같은 결과가 나오도록 DOM 없이 문자열로만 처리.
export function buildToc(html: string): { html: string; items: TocItem[] } {
  const items: TocItem[] = [];
  const used = new Map<string, number>();

  const withIds = html.replace(
    /<h([1-3])(\s[^>]*)?>([\s\S]*?)<\/h\1>/gi,
    (match, level: string, attrs: string | undefined, inner: string) => {
      const text = headingText(inner);
      if (!text) return match;

      const base = slugify(text);
      const count = used.get(base) ?? 0;
      used.set(base, count + 1);
      const id = count === 0 ? base : `${base}-${count + 1}`;

      items.push({ id, text, level: Number(level) as 1 | 2 | 3 });
      const otherAttrs = (attrs ?? "").replace(/\sid="[^"]*"/i, "");
      return `<h${level}${otherAttrs} id="${id}">${inner}</h${level}>`;
    },
  );

  return { html: withIds, items };
}
