import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';

interface EnhancedAIResponseProps {
  content: string;
  isLoading?: boolean;
}

// Custom code block component with copy functionality like modern chatbots
const CodeBlock = ({ className = '', children, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const code = String(children).replace(/\n$/, '');

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  if (language) {
    return (
      <div className="relative group my-4">
        <div className="flex items-center justify-between theme-surface2 px-4 py-2 border-t border-l border-r theme-border rounded-t-lg">
          <span className="text-sm theme-text opacity-60 font-mono">{language}</span>
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-3 py-1.5 text-sm theme-accent-text hover:bg-opacity-20 theme-surface rounded transition-all duration-200 opacity-60 group-hover:opacity-100"
            title={copied ? 'Copied!' : 'Copy code'}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a1 1 0 011 1v3M9 7h4a1 1 0 011 1v5a1 1 0 01-1 1H9a1 1 0 01-1-1V8a1 1 0 011-1z" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
        <div className="border-l border-r border-b theme-border rounded-b-lg overflow-hidden">
          <SyntaxHighlighter
            style={oneDark}
            language={language}
            PreTag="div"
            customStyle={{
              margin: 0,
              borderRadius: 0,
              border: 'none'
            }}
            {...props}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      </div>
    );
  }

  // Inline code
  return (
    <code className="px-2 py-1 theme-surface2 theme-accent-text rounded text-sm font-mono border theme-border" {...props}>
      {children}
    </code>
  );
};

// Custom components for enhanced markdown rendering
const MarkdownComponents = {
  // Headers with better spacing and styling
  h1: ({ children, ...props }: any) => (
    <h1 className="text-2xl font-bold mb-4 mt-6 theme-accent-text border-b-2 theme-border pb-2" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: any) => (
    <h2 className="text-xl font-semibold mb-3 mt-5 theme-accent-text" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: any) => (
    <h3 className="text-lg font-medium mb-2 mt-4 theme-accent-text" {...props}>
      {children}
    </h3>
  ),
  
  // Enhanced paragraphs
  p: ({ children, ...props }: any) => (
    <p className="mb-3 leading-relaxed theme-text" {...props}>
      {children}
    </p>
  ),
  
  // Styled lists
  ul: ({ children, ...props }: any) => (
    <ul className="list-disc list-inside mb-3 space-y-1 ml-4" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: any) => (
    <ol className="list-decimal list-inside mb-3 space-y-1 ml-4" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }: any) => (
    <li className="theme-text" {...props}>
      {children}
    </li>
  ),
  
  // Enhanced blockquotes
  blockquote: ({ children, ...props }: any) => (
    <blockquote className="border-l-4 theme-border theme-surface2 p-4 my-4 italic" {...props}>
      {children}
    </blockquote>
  ),
  
  // Enhanced code blocks and inline code
  code: CodeBlock,
  pre: ({ children, ...props }: any) => (
    <div {...props}>
      {children}
    </div>
  ),
  
  // Enhanced tables
  table: ({ children, ...props }: any) => (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full border-collapse border theme-border rounded-lg overflow-hidden" {...props}>
        {children}
      </table>
    </div>
  ),
  th: ({ children, ...props }: any) => (
    <th className="border theme-border theme-surface2 px-4 py-3 text-left font-semibold theme-text" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }: any) => (
    <td className="border theme-border px-4 py-3 theme-text" {...props}>
      {children}
    </td>
  ),
  
  // Strong and emphasis with better styling
  strong: ({ children, ...props }: any) => (
    <strong className="font-bold theme-accent-text" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }: any) => (
    <em className="italic theme-accent-text" {...props}>
      {children}
    </em>
  ),
  
  // Links with better styling
  a: ({ children, href, ...props }: any) => (
    <a 
      href={href}
      className="theme-accent-text hover:underline transition-all duration-200"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
  
  // Custom horizontal rule
  hr: ({ ...props }: any) => (
    <hr className="my-6 theme-border" {...props} />
  )
};

const EnhancedAIResponse: React.FC<EnhancedAIResponseProps> = ({ content, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 theme-accent"></div>
        <span className="ml-3 theme-accent-text">AI Guru is thinking...</span>
      </div>
    );
  }

  return (
    <div className="max-w-none prose prose-blue">
      <div className="theme-surface rounded-lg p-6 shadow-sm border theme-border">
        <div className="flex items-center mb-4 pb-2 border-b theme-border">
          <span className="text-2xl mr-3">🎓</span>
          <span className="font-semibold theme-accent-text text-lg">AI Guru Response</span>
        </div>
        
        <div className="theme-text leading-relaxed">
          <ReactMarkdown
            remarkPlugins={[remarkMath, remarkGfm]}
            rehypePlugins={[rehypeKatex]}
            components={MarkdownComponents}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default EnhancedAIResponse;
