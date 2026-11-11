// 본문 HTML에서 글자만 뽑아 목록 미리보기로 쓴다 (목록에는 태그를 그대로 보여주면 안 된다). 글자가 없으면 "내용 없음".
export function previewText(html: string): string {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text || "내용 없음";
}
