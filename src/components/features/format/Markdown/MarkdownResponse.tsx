import React, { useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from '../Code/CodeBlock';
import { ListRenderer } from './renderers/ListRenderer';
import { HeadingRenderer } from './renderers/HeadingRenderer';
import { TableRenderer } from './renderers/TableRenderer';
import { InlineCode } from '../Code/InlineCode';
import { cleanMarkdownContent } from './markdownParser';
import { OrderedListRenderer } from './renderers/OrderedListRenderer';

interface MarkdownResponseProps {
    content: string;
    isStreaming?: boolean;
}

interface CodeProps extends React.HTMLAttributes<HTMLElement> {
    inline?: boolean;
    className?: string;
    children: React.ReactNode;
}

// Add proper types for list components
interface ListProps {
    ordered?: boolean;
    className?: string;
    children?: React.ReactNode;
    [key: string]: any; // Allow for additional props from ReactMarkdown
}

/**
 * Enhanced markdown component with complete formatting support
 * and optimized rendering
 */
export const MarkdownResponse = React.memo(({ content, isStreaming }: MarkdownResponseProps) => {
    const prevContentLength = useRef(0);
    const shouldProcessContent = useMemo(() => {
        // Only fully process content once it's completed streaming
        // or if the content has changed significantly (more than 100 chars)
        const contentLength = content.length;
        const hasSignificantChange = Math.abs(contentLength - prevContentLength.current) > 100;
        
        if (!isStreaming || hasSignificantChange) {
            prevContentLength.current = contentLength;
            return true;
        }
        return false;
    }, [content, isStreaming]);
    
    // Process content only when needed to avoid unnecessary work during streaming
    const processedContent = useMemo(() => 
        shouldProcessContent 
            ? cleanMarkdownContent(content || '') 
            : content
    , [content, shouldProcessContent]);

    // Skip rendering for tiny incremental updates during streaming
    // to reduce jank and improve perceived performance
    return (
        <div className={`
            prose dark:prose-invert max-w-none overflow-hidden
            
            /* Headings */
            prose-headings:mt-6 prose-headings:mb-4 prose-headings:border-b prose-headings:border-gray-200/50 dark:prose-headings:border-gray-700/50
            prose-headings:pb-1 prose-headings:font-medium prose-headings:tracking-tight
            prose-h1:text-2xl prose-h1:font-semibold prose-h1:mb-5 prose-h1:mt-8 
            prose-h2:text-xl prose-h2:mb-4 prose-h2:mt-7
            prose-h3:text-lg prose-h3:mb-3 prose-h3:mt-6
            prose-h4:text-base prose-h5:text-sm prose-h6:text-xs
            
            /* Paragraphs and text */
            prose-p:my-3 prose-p:leading-relaxed prose-p:text-gray-700 dark:prose-p:text-gray-300
            prose-strong:font-semibold prose-strong:text-gray-900 dark:prose-strong:text-gray-100
            prose-em:italic prose-em:text-gray-700 dark:prose-em:text-gray-300
            
            /* Code elements - updated to match new CodeBlock styling */
            prose-pre:my-6 prose-pre:p-0 prose-pre:bg-transparent prose-pre:overflow-hidden
            prose-pre:border-0 prose-pre:rounded-lg
            prose-pre:shadow-none
            
            prose-code:before:hidden prose-code:after:hidden
            prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md
            prose-code:bg-gray-100/80 prose-code:dark:bg-gray-800/80
            prose-code:text-gray-800 prose-code:dark:text-gray-200
            prose-code:text-[0.9em] prose-code:font-medium
            
            /* Lists */
            prose-ul:my-3 prose-ul:ml-2 prose-ul:list-disc
            prose-ol:my-3 prose-ol:ml-2 prose-ol:list-decimal
            prose-li:my-1 prose-li:text-gray-700 dark:prose-li:text-gray-300
            
            /* Links */
            prose-a:text-brand-600 dark:prose-a:text-brand-400 
            prose-a:no-underline hover:prose-a:underline
            prose-a:font-medium
            
            /* Images */
            prose-img:rounded-lg prose-img:shadow-md 
            prose-img:max-h-96 prose-img:mx-auto prose-img:my-6
            
            /* Blockquotes */
            prose-blockquote:border-l-4 prose-blockquote:border-brand-500/40
            prose-blockquote:bg-brand-50/30 dark:prose-blockquote:bg-brand-900/10
            prose-blockquote:rounded-r-lg prose-blockquote:pl-6 
            prose-blockquote:py-2 prose-blockquote:my-4
            prose-blockquote:text-gray-700 dark:prose-blockquote:text-gray-300
            prose-blockquote:font-normal
            
            /* Tables */
            prose-table:border prose-table:border-collapse prose-table:my-4 prose-table:w-full
            prose-thead:bg-gray-50 dark:prose-thead:bg-gray-800
            prose-th:p-2 prose-th:text-left prose-th:font-medium
            prose-td:p-2 prose-td:border-t prose-td:border-gray-200 dark:prose-td:border-gray-700
            
            /* Horizontal rules */
            prose-hr:my-6 prose-hr:border-t prose-hr:border-gray-200 dark:prose-hr:border-gray-700
            
            /* Animation and state */
            ${isStreaming ? 'streaming opacity-90' : 'completed opacity-100'}
            transition-opacity duration-200
        `}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // Override paragraph wrapper for code blocks
                    p: ({ children, ...props }) => {
                        // Check if children contains a pre or code element
                        const hasCode = React.Children.toArray(children).some(
                            child => React.isValidElement(child) && 
                            (child.type === 'pre' || child.type === 'code')
                        );
                        
                        // If it contains code, render without p wrapper
                        if (hasCode) {
                            return <>{children}</>;
                        }
                        
                        // Otherwise render normal paragraph
                        return <p className="my-4 leading-7" {...props}>{children}</p>;
                    },
                    pre: ({ children }) => {
                        // Render pre content directly to avoid nesting issues
                        return <div className="not-prose my-6">{children}</div>;
                    },
                    code: ({ inline, className, children, ...props }: CodeProps) => {
                        // If it's a code block and has a language specified, use CodeBlock
                        if (!inline && className?.includes('language-')) {
                            return <CodeBlock inline={inline} className={className} {...props}>{children}</CodeBlock>;
                        }
                        
                        // For inline or simple code blocks, use InlineCode
                        return <InlineCode {...props}>{children}</InlineCode>;
                    },
                    // Fix the list rendering with proper type casting
                    ul: (props: ListProps) => {
                        return <ListRenderer ordered={false} {...props} />;
                    },
                    ol: (props: ListProps) => {
                        return <OrderedListRenderer {...props} />;
                    },
                    h1: ({ children }) => <HeadingRenderer level={1}>{children}</HeadingRenderer>,
                    h2: ({ children }) => <HeadingRenderer level={2}>{children}</HeadingRenderer>,
                    h3: ({ children }) => <HeadingRenderer level={3}>{children}</HeadingRenderer>,
                    h4: ({ children }) => <HeadingRenderer level={4}>{children}</HeadingRenderer>,
                    h5: ({ children }) => <HeadingRenderer level={5}>{children}</HeadingRenderer>,
                    h6: ({ children }) => <HeadingRenderer level={6}>{children}</HeadingRenderer>,
                    table: TableRenderer,
                    img: ({ alt, src, ...props }) => (
                        <span className="block my-6">
                            <img 
                                src={src} 
                                alt={alt || ''} 
                                className="rounded-lg max-h-80 object-contain mx-auto" 
                                loading="lazy"
                                {...props} 
                            />
                            {alt && <span className="block text-center text-sm text-gray-500 mt-2">{alt}</span>}
                        </span>
                    ),
                    a: ({ href, children }) => (
                        <a 
                            href={href} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline transition"
                        >
                            {children}
                        </a>
                    ),
                    hr: () => (
                        <hr className="my-8 border-t border-gray-300 dark:border-gray-700" />
                    ),
                    del: ({ children }) => (
                        <del className="line-through text-gray-500">{children}</del>
                    )
                }}
            >
                {processedContent}
            </ReactMarkdown>
            {isStreaming && (
                <span className="hidden">&#8203;</span>
            )}
        </div>
    );
}, (prevProps, nextProps) => {
    // Improved memoization logic to avoid unnecessary re-renders
    // Only re-render in these cases:
    // 1. Streaming state changed 
    // 2. When streaming, only update on substantial content changes
    // 3. When completed, only if content is different
    if (prevProps.isStreaming !== nextProps.isStreaming) {
        return false; // Always re-render when streaming state changes
    }
    
    if (prevProps.isStreaming && nextProps.isStreaming) {
        // During streaming, only re-render when content changes by more than 20 chars
        // This significantly reduces jank during fast token streaming
        return nextProps.content.length - prevProps.content.length < 20;
    }
    
    // For completed messages, only re-render if content actually changed
    return prevProps.content === nextProps.content;
});
