import React, { useMemo } from 'react';
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
 */
export const MarkdownResponse = React.memo(({ content, isStreaming }: MarkdownResponseProps) => {
    const processedContent = useMemo(() => 
        cleanMarkdownContent(content || ''), [content]
    );

    // Only re-process when content changes by more than 20 characters
    return (
        <div className={`
            prose dark:prose-invert max-w-none overflow-hidden
            
            /* Headings */
            prose-headings:border-b prose-headings:border-gray-200/50 dark:prose-headings:border-gray-700/50
            prose-headings:font-semibold prose-headings:tracking-tight
            prose-h1:text-3xl prose-h1:font-bold prose-h1:mb-6 prose-h1:mt-8 
            prose-h2:text-2xl prose-h2:mb-5 prose-h2:mt-7
            prose-h3:text-xl prose-h3:mb-4 prose-h3:mt-6
            prose-h4:text-lg prose-h5:text-base prose-h6:text-sm
            
            /* Paragraphs and text */
            prose-p:my-4 prose-p:leading-7 prose-p:text-gray-600 dark:prose-p:text-gray-300
            prose-strong:font-semibold prose-strong:text-gray-900 dark:prose-strong:text-gray-100
            prose-em:italic prose-em:text-gray-700 dark:prose-em:text-gray-300
            
            /* Code elements */
            prose-pre:p-0 prose-pre:m-0 prose-pre:bg-transparent
            prose-code:before:hidden prose-code:after:hidden
            prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md
            prose-code:bg-gray-100/80 prose-code:dark:bg-gray-800/80
            prose-code:text-gray-800 prose-code:dark:text-gray-200
            prose-code:text-[0.9em] prose-code:font-medium
            
            /* Fix overflow issues */
            prose-pre:overflow-x-auto prose-pre:max-w-full
            prose-code:break-words prose-code:whitespace-pre-wrap
            prose-p:break-words prose-p:overflow-visible
            
            /* Lists */
            prose-ul:my-4 prose-ul:ml-2 prose-ul:list-disc
            prose-ol:my-4 prose-ol:ml-2 prose-ol:list-decimal
            prose-li:my-1 prose-li:text-gray-600 dark:prose-li:text-gray-300
            
            /* Links */
            prose-a:text-blue-600 dark:prose-a:text-blue-400 
            prose-a:no-underline hover:prose-a:underline
            prose-a:font-medium
            
            /* Images */
            prose-img:rounded-xl prose-img:shadow-md 
            prose-img:max-h-96 prose-img:mx-auto prose-img:my-8
            
            /* Blockquotes */
            prose-blockquote:border-l-4 prose-blockquote:border-brand-500/40
            prose-blockquote:bg-brand-50/30 dark:prose-blockquote:bg-brand-900/10
            prose-blockquote:rounded-r-lg prose-blockquote:pl-6 
            prose-blockquote:py-2 prose-blockquote:my-6
            prose-blockquote:text-gray-700 dark:prose-blockquote:text-gray-300
            prose-blockquote:font-normal
            
            /* Tables */
            prose-table:border prose-table:border-collapse
            prose-table:my-6 prose-table:w-full
            prose-thead:bg-gray-50 dark:prose-thead:bg-gray-800
            prose-th:p-2 prose-th:text-left prose-th:font-semibold
            prose-td:p-2 prose-td:border-t prose-td:border-gray-200 dark:prose-td:border-gray-700
            
            /* Horizontal rules */
            prose-hr:my-8 prose-hr:border-t prose-hr:border-gray-300 dark:prose-hr:border-gray-700
            
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
                <span className="hidden">&#8203;</span> // Using HTML entity instead of invisible character
            )}
        </div>
    );
}, (prevProps, nextProps) => {
    // Prevent unnecessary re-renders for small content changes during streaming
    if (prevProps.isStreaming && 
        nextProps.isStreaming && 
        nextProps.content.length - prevProps.content.length < 15) {
        return true; // Skip re-render
    }
    return prevProps.content === nextProps.content && 
           prevProps.isStreaming === nextProps.isStreaming;
});
