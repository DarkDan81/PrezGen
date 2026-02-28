import { Color } from '@tiptap/extension-color';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import StarterKit from '@tiptap/starter-kit';
import { EditorContent, useEditor } from '@tiptap/react';
import { useEffect, useMemo, useState } from 'react';
import type { TranslationKey } from '../shared/i18n/dictionaries';
import { Button } from '../shared/ui/Button';

type Props = {
  value: string;
  onChange: (nextHtml: string) => void;
  themeColors: string[];
  t: (key: TranslationKey) => string;
};

function ensureHtml(value: string) {
  const trimmed = (value || '').trim();
  return trimmed || '<p></p>';
}

export function RichTextEditor({ value, onChange, themeColors, t }: Props) {
  const [mode, setMode] = useState<'visual' | 'html'>('visual');
  const [htmlDraft, setHtmlDraft] = useState(value || '');
  const [customColor, setCustomColor] = useState('#222222');

  const palette = useMemo(() => {
    const valid = themeColors.filter((item) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(item));
    return Array.from(new Set(valid)).slice(0, 10);
  }, [themeColors]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      TextStyle,
      Color,
      Link.configure({
        openOnClick: false,
        protocols: ['http', 'https', 'mailto'],
      }),
    ],
    content: ensureHtml(value),
    editorProps: {
      attributes: {
        class: 'rich-editor-content',
      },
    },
    onUpdate: ({ editor: current }) => {
      const html = current.getHTML();
      setHtmlDraft(html);
      onChange(html);
    },
  });

  useEffect(() => {
    setHtmlDraft(value || '');
    if (!editor) return;
    const current = editor.getHTML();
    if ((value || '') !== current) {
      editor.commands.setContent(ensureHtml(value), { emitUpdate: false });
    }
  }, [editor, value]);

  const applyHtmlDraft = () => {
    if (!editor) return;
    editor.commands.setContent(ensureHtml(htmlDraft));
    onChange(htmlDraft);
  };

  if (!editor) return null;

  return (
    <div className="rich-editor">
      <div className="rich-editor-modes">
        <Button size="small" variant={mode === 'visual' ? 'primary' : 'ghost'} onClick={() => setMode('visual')}>
          {t('block.editorVisual')}
        </Button>
        <Button size="small" variant={mode === 'html' ? 'primary' : 'ghost'} onClick={() => setMode('html')}>
          {t('block.editorHtml')}
        </Button>
      </div>

      {mode === 'visual' ? (
        <>
          <div className="rich-editor-toolbar">
            <Button
              size="small"
              variant={editor.isActive('bold') ? 'primary' : 'ghost'}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              B
            </Button>
            <Button
              size="small"
              variant={editor.isActive('italic') ? 'primary' : 'ghost'}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              I
            </Button>
            <Button
              size="small"
              variant={editor.isActive('bulletList') ? 'primary' : 'ghost'}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              • List
            </Button>
            <Button
              size="small"
              variant={editor.isActive('orderedList') ? 'primary' : 'ghost'}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              1. List
            </Button>
            <Button
              size="small"
              variant={editor.isActive('heading', { level: 2 }) ? 'primary' : 'ghost'}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              H2
            </Button>
            <Button
              size="small"
              variant={editor.isActive('heading', { level: 3 }) ? 'primary' : 'ghost'}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
              H3
            </Button>
            <Button
              size="small"
              variant="ghost"
              onClick={() => {
                const next = window.prompt(t('block.linkPrompt'), '');
                if (!next) {
                  editor.chain().focus().unsetLink().run();
                  return;
                }
                editor.chain().focus().setLink({ href: next }).run();
              }}
            >
              Link
            </Button>
            <Button size="small" variant="ghost" onClick={() => editor.chain().focus().undo().run()}>
              Undo
            </Button>
            <Button size="small" variant="ghost" onClick={() => editor.chain().focus().redo().run()}>
              Redo
            </Button>
          </div>

          <div className="rich-editor-colors">
            <span>{t('block.textColor')}</span>
            <div className="rich-editor-swatches">
              {palette.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="rich-editor-swatch"
                  style={{ backgroundColor: color }}
                  onClick={() => editor.chain().focus().setColor(color).run()}
                  title={color}
                  aria-label={color}
                />
              ))}
            </div>
            <input
              type="color"
              value={customColor}
              onChange={(e) => {
                const next = e.target.value;
                setCustomColor(next);
                editor.chain().focus().setColor(next).run();
              }}
            />
          </div>

          <EditorContent editor={editor} className="rich-editor-frame" />
        </>
      ) : (
        <div className="rich-editor-html">
          <textarea rows={12} value={htmlDraft} onChange={(e) => setHtmlDraft(e.target.value)} />
          <Button size="small" onClick={applyHtmlDraft}>
            {t('block.applyHtml')}
          </Button>
        </div>
      )}
    </div>
  );
}
