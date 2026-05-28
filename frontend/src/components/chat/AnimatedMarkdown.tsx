import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface AnimatedMarkdownProps {
  content: string;
  isStreaming?: boolean;
}

const AnimatedMarkdown: React.FC<AnimatedMarkdownProps> = ({ content, isStreaming }) => {
  return (
    <div className={cn("markdown-body max-w-none text-sm leading-7 text-on-surface md:text-base", isStreaming && "streaming-content")}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({children}) => <p className="mb-4 text-sm leading-7 text-on-surface md:text-base">{children}</p>,
          h1: ({children}) => <h1 className="mb-3 mt-6 text-2xl font-semibold tracking-tight text-white first:mt-0">{children}</h1>,
          h2: ({children}) => <h2 className="mb-3 mt-6 text-xl font-semibold tracking-tight text-white first:mt-0">{children}</h2>,
          h3: ({children}) => <h3 className="mb-2 mt-5 text-lg font-semibold tracking-tight text-white first:mt-0">{children}</h3>,
          ul: ({children}) => <ul className="mb-4 ml-5 list-disc space-y-2 text-on-surface-variant">{children}</ul>,
          ol: ({children}) => <ol className="mb-4 ml-5 list-decimal space-y-2 text-on-surface-variant">{children}</ol>,
          li: ({children}) => <li className="pl-1 leading-7">{children}</li>,
          blockquote: ({children}) => <blockquote className="mb-4 border-l-2 border-primary/40 bg-primary/10 px-4 py-3 text-on-surface-variant">{children}</blockquote>,
          a: ({children, href}) => (
            <a href={href} className="text-primary underline decoration-primary/50 underline-offset-4 transition hover:text-white">
              {children}
            </a>
          ),
          table: ({children}) => (
            <div className="mb-4 overflow-x-auto rounded-2xl border border-white/10 bg-surface-container-high/60">
              <table className="min-w-full border-collapse text-left text-sm text-on-surface-variant">{children}</table>
            </div>
          ),
          thead: ({children}) => <thead className="bg-white/5 text-xs uppercase tracking-[0.2em] text-outline">{children}</thead>,
          th: ({children}) => <th className="border-b border-white/10 px-4 py-3 font-semibold text-white">{children}</th>,
          td: ({children}) => <td className="border-b border-white/5 px-4 py-3 align-top">{children}</td>,
          code: ({inline, className, children}: any) => {
            const match = /language-(\w+)/.exec(className || '')
            const codeString = String(children).replace(/\n$/, '')

            if (inline) {
              return <code className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[0.85em] text-primary">{children}</code>
            }

            return (
              <SyntaxHighlighter
                language={match?.[1] || 'text'}
                style={oneDark}
                customStyle={{
                  margin: '0 0 1rem',
                  borderRadius: '1rem',
                  padding: '1rem 1.15rem',
                  background: 'rgba(16, 18, 24, 0.95)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  fontSize: '0.875rem',
                  lineHeight: 1.7,
                }}
                PreTag="div"
              >
                {codeString}
              </SyntaxHighlighter>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className="inline-block w-2 h-4 bg-primary ml-1 align-middle"
        />
      )}
    </div>
  );
};

export default AnimatedMarkdown;
