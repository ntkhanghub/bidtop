// Small "quicktags"-style helpers: wrap the current textarea selection in raw
// HTML tags, or insert text at the cursor. Operates directly on a plain
// <textarea> (not contentEditable) since post/page content is raw HTML the
// admin types/pastes, not a WYSIWYG document model.
export function wrapSelection(
  textarea: HTMLTextAreaElement,
  value: string,
  onChange: (value: string) => void,
  before: string,
  after: string,
  placeholder = "",
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.slice(start, end) || placeholder;
  const newValue = value.slice(0, start) + before + selected + after + value.slice(end);
  onChange(newValue);
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
  });
}

export function wrapList(
  textarea: HTMLTextAreaElement,
  value: string,
  onChange: (value: string) => void,
  ordered: boolean,
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.slice(start, end) || "Mục danh sách";
  const lines = selected.split("\n").filter((line) => line.trim());
  const tag = ordered ? "ol" : "ul";
  const block = `<${tag}>\n${lines.map((line) => `  <li>${line}</li>`).join("\n")}\n</${tag}>`;
  const newValue = value.slice(0, start) + block + value.slice(end);
  onChange(newValue);
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(start, start + block.length);
  });
}

export function insertAtCursor(
  textarea: HTMLTextAreaElement | null,
  value: string,
  onChange: (value: string) => void,
  text: string,
) {
  if (!textarea) {
    onChange(value + text);
    return;
  }
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const newValue = value.slice(0, start) + text + value.slice(end);
  onChange(newValue);
  requestAnimationFrame(() => {
    textarea.focus();
    const pos = start + text.length;
    textarea.setSelectionRange(pos, pos);
  });
}
