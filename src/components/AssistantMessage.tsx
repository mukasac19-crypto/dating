'use client';

import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { AlertTriangle, Check } from 'lucide-react';

interface Props {
  content: string;
  onFlagClick?: (flagId: string) => void;
}

const FLAG_REF_REGEX = /\[\[([^\]:]+)::([^\]:]+)::([^\]:]+)\]\]/g;

/**
 * Rewrite [[FLAG_ID::TEXT::TYPE]] markers into Markdown links of the form
 *   [TEXT](#flag/<type>/<encoded-id>)
 * so react-markdown handles them like any other inline element. The custom
 * <a> renderer below converts those links back into clickable flag chips.
 */
function preprocessFlagRefs(input: string): string {
  return input.replace(FLAG_REF_REGEX, (_, id, text, type) => {
    const safeType = type === 'green' ? 'green' : 'red';
    return `[${text}](#flag/${safeType}/${encodeURIComponent(id)})`;
  });
}

function parseFlagHref(href: string): { id: string; type: 'red' | 'green' } | null {
  const match = href.match(/^#flag\/(red|green)\/(.+)$/);
  if (!match) return null;
  try {
    return { type: match[1] as 'red' | 'green', id: decodeURIComponent(match[2]) };
  } catch {
    return null;
  }
}

function FlagChip({
  flagId,
  type,
  onClick,
  children,
}: {
  flagId: string;
  type: 'red' | 'green';
  onClick?: (flagId: string) => void;
  children: React.ReactNode;
}) {
  const styles =
    type === 'red'
      ? 'bg-rose-50 text-rose-800 ring-rose-200 hover:bg-rose-100'
      : 'bg-emerald-50 text-emerald-800 ring-emerald-200 hover:bg-emerald-100';
  const Icon = type === 'red' ? AlertTriangle : Check;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        onClick?.(flagId);
      }}
      className={`inline-flex items-center gap-1 align-baseline rounded-md px-1.5 py-0.5 ring-1 text-[0.92em] font-medium transition-colors ${styles}`}
    >
      <Icon className="w-3 h-3" />
      <span>{children}</span>
    </button>
  );
}

function AssistantMessageInner({ content, onFlagClick }: Props) {
  const processed = useMemo(() => preprocessFlagRefs(content), [content]);

  return (
    <div className="text-slate-800 text-[0.95rem] leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-900">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-slate-700">{children}</em>,
          ul: ({ children }) => (
            <ul className="list-disc pl-5 my-3 space-y-1.5 marker:text-indigo-500">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 my-3 space-y-1.5 marker:font-semibold marker:text-indigo-600">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed pl-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-4 border-indigo-300 pl-3 italic text-slate-700">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="rounded bg-stone-200/70 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-800">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="my-3 rounded-xl bg-slate-900 text-slate-100 p-3 overflow-x-auto text-[0.85em] font-mono">
              {children}
            </pre>
          ),
          h1: ({ children }) => (
            <h3 className="mt-4 mb-2 text-base font-semibold text-slate-900">{children}</h3>
          ),
          h2: ({ children }) => (
            <h3 className="mt-4 mb-2 text-base font-semibold text-slate-900">{children}</h3>
          ),
          h3: ({ children }) => (
            <h3 className="mt-4 mb-2 text-base font-semibold text-slate-900">{children}</h3>
          ),
          hr: () => <hr className="my-4 border-stone-200" />,
          a: ({ href, children, ...props }) => {
            const flag = href ? parseFlagHref(href) : null;
            if (flag) {
              return (
                <FlagChip flagId={flag.id} type={flag.type} onClick={onFlagClick}>
                  {children}
                </FlagChip>
              );
            }
            return (
              <a
                {...props}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}

const AssistantMessage = memo(AssistantMessageInner);
export default AssistantMessage;
