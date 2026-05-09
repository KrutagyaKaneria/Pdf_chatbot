import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

interface AnimatedMarkdownProps {
  content: string;
  isStreaming?: boolean;
}

const AnimatedMarkdown: React.FC<AnimatedMarkdownProps> = ({ content, isStreaming }) => {
  return (
    <div className={cn("prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-white/5 prose-pre:border-white/10 prose-pre:border prose-a:text-primary", isStreaming && "streaming-content")}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
