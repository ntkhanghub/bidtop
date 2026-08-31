"use client";

import { useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { insertAtCursor, wrapList, wrapSelection } from "@/lib/html-editor-commands";
import { cn } from "@/lib/utils";
import { MediaLibraryDialog } from "./media-library-dialog";

const EDITOR_HEIGHT = "h-[520px]";

const FORMAT_OPTIONS = [
  { value: "p", label: "Đoạn văn" },
  { value: "h1", label: "Tiêu đề 1" },
  { value: "h2", label: "Tiêu đề 2" },
  { value: "h3", label: "Tiêu đề 3" },
  { value: "h4", label: "Tiêu đề 4" },
];

// Content is raw HTML, pasted/typed directly by the admin (no Markdown
// conversion) — sanitized server-side before it's ever stored or rendered
// publicly (see lib/sanitize-post-html.ts). This preview is the admin's own
// unsanitized draft, rendered only in their own browser before saving.
export function HtmlContentEditor({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [mode, setMode] = useState<"html" | "preview">("html");
  const [mediaOpen, setMediaOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Only called from the toolbar below, which itself only renders in "html"
  // mode — the textarea is always mounted by the time these fire.
  function withTextarea(action: (textarea: HTMLTextAreaElement) => void) {
    const textarea = textareaRef.current;
    if (textarea) action(textarea);
  }

  function handleAddMedia() {
    if (mode !== "html") setMode("html");
    setMediaOpen(true);
  }

  function handleMediaSelect(url: string) {
    insertAtCursor(textareaRef.current, value, onChange, `<img src="${url}" alt="" />`);
  }

  return (
    <div>
      <Button type="button" variant="outline" size="sm" onClick={handleAddMedia}>
        <ImagePlus /> Add Media
      </Button>

      <div className="mt-2 rounded-md border border-border">
        <div className="flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-1 px-1">
            <button
              type="button"
              onClick={() => setMode("html")}
              className={cn(
                "rounded-t-md px-3 py-1.5 text-sm",
                mode === "html"
                  ? "font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              HTML
            </button>
            <button
              type="button"
              onClick={() => setMode("preview")}
              className={cn(
                "rounded-t-md px-3 py-1.5 text-sm",
                mode === "preview"
                  ? "font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Preview
            </button>
          </div>
        </div>

        {mode === "html" && (
          <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 p-1.5">
            <select
              onChange={(e) => {
                const tag = e.target.value;
                withTextarea((t) =>
                  wrapSelection(t, value, onChange, `<${tag}>`, `</${tag}>`, "Nội dung"),
                );
                e.target.value = "";
              }}
              defaultValue=""
              className="h-8 rounded-md border border-input bg-transparent px-2 text-sm outline-none"
            >
              <option value="" disabled>
                Định dạng
              </option>
              {FORMAT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>

            <ToolbarButton
              icon={<Bold className="size-4" />}
              label="In đậm"
              onClick={() =>
                withTextarea((t) => wrapSelection(t, value, onChange, "<strong>", "</strong>", "chữ đậm"))
              }
            />
            <ToolbarButton
              icon={<Italic className="size-4" />}
              label="In nghiêng"
              onClick={() =>
                withTextarea((t) => wrapSelection(t, value, onChange, "<em>", "</em>", "chữ nghiêng"))
              }
            />
            <ToolbarButton
              icon={<List className="size-4" />}
              label="Danh sách"
              onClick={() => withTextarea((t) => wrapList(t, value, onChange, false))}
            />
            <ToolbarButton
              icon={<ListOrdered className="size-4" />}
              label="Danh sách số"
              onClick={() => withTextarea((t) => wrapList(t, value, onChange, true))}
            />
            <ToolbarButton
              icon={<Quote className="size-4" />}
              label="Trích dẫn"
              onClick={() =>
                withTextarea((t) =>
                  wrapSelection(t, value, onChange, "<blockquote>", "</blockquote>", "Trích dẫn"),
                )
              }
            />
            <ToolbarButton
              icon={<AlignLeft className="size-4" />}
              label="Căn trái"
              onClick={() =>
                withTextarea((t) =>
                  wrapSelection(t, value, onChange, '<p style="text-align: left;">', "</p>", "Đoạn văn"),
                )
              }
            />
            <ToolbarButton
              icon={<AlignCenter className="size-4" />}
              label="Căn giữa"
              onClick={() =>
                withTextarea((t) =>
                  wrapSelection(t, value, onChange, '<p style="text-align: center;">', "</p>", "Đoạn văn"),
                )
              }
            />
            <ToolbarButton
              icon={<AlignRight className="size-4" />}
              label="Căn phải"
              onClick={() =>
                withTextarea((t) =>
                  wrapSelection(t, value, onChange, '<p style="text-align: right;">', "</p>", "Đoạn văn"),
                )
              }
            />
            <ToolbarButton
              icon={<Link2 className="size-4" />}
              label="Chèn link"
              onClick={() =>
                withTextarea((t) => {
                  const url = window.prompt("Nhập URL:", "https://");
                  if (!url) return;
                  wrapSelection(t, value, onChange, `<a href="${url}">`, "</a>", "văn bản liên kết");
                })
              }
            />
          </div>
        )}

        {mode === "html" ? (
          <Textarea
            ref={textareaRef}
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn("resize-none rounded-none border-0 font-mono text-xs", EDITOR_HEIGHT)}
            required
          />
        ) : (
          <div className={cn("overflow-y-auto p-4", EDITOR_HEIGHT)}>
            {value.trim() ? (
              <div
                className="prose prose-neutral dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: value }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có nội dung.</p>
            )}
          </div>
        )}
      </div>

      <MediaLibraryDialog open={mediaOpen} onOpenChange={setMediaOpen} onSelect={handleMediaSelect} />
    </div>
  );
}

function ToolbarButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {icon}
    </button>
  );
}
