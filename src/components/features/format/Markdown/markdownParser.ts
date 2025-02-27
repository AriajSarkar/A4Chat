import { formatCode } from '../utils/PrismLanguages';

/**
 * Enhanced Markdown processor for AI-generated content
 * Handles proper spacing, formatting and preparation for React Markdown
 */
export const cleanMarkdownContent = (content: string): string => {
    if (!content) return '';
    
    // Normalize line endings
    content = content.replace(/\r\n/g, '\n');
    
    // Pre-process C code before code block detection to fix basic structure issues
    content = content.replace(
        /#include\s+<([^>]+)>\s*\/\/([^\n]*)(int\s+main\(\)[^{]*{[^}]*})/g, 
        (match) => {
            // Take the raw C code and format it
            return match.replace(/(\w+);(\w+)/g, '$1;\n$2');
        }
    );
    
    // Handle code blocks with proper spacing, language tags, and indentation
    content = content.replace(
        /```([\w-]*)?(?:\s*\n)?([\s\S]*?)```/g, 
        (match, lang, code) => {
            const language = lang ? lang.trim() : '';
            const formattedCode = formatCode(code.trim(), language);
            return `\n\n\`\`\`${language}\n${formattedCode}\n\`\`\`\n\n`;
        }
    );
    
    // Fix inline code with better detection to avoid splitting function calls
    content = content.replace(
        /([^\s`])`([^`]+)`([^\s`])/g, 
        (match, before, code, after) => {
            // Don't add spaces if this is a function call like functionName`template`
            if (/\w$/.test(before) && /^\w/.test(code) && /^\(/.test(after)) {
                return `${before}\`${code}\`${after}`;
            }
            return `${before} \`${code}\` ${after}`;
        }
    );
    
    // Find patterns like "To compile this program:" followed by steps with numbers
    // Fixed the unnecessary escape characters in the character class
    content = content.replace(
        /([.:;])\s*(\d+)[.|)]\s+/g, 
        (match, punctuation, number) => `${punctuation}\n\n${number}. `
    );
    
    // Fix cases where numbers run together in a list 1.Item2.Item
    content = content.replace(
        /(\d+)\.\s*([^\n.]+?)(\d+)\./g,
        (_, firstNum, text, secondNum) => `${firstNum}. ${text.trim()}\n\n${secondNum}.`
    );
    
    // Insert line breaks between consecutive list items
    content = content.replace(
        /(\d+\.\s+[^\n]+)(\d+\.\s+)/g,
        "$1\n\n$2"
    );
    
    // Ensure periods after numbers in ordered lists
    content = content.replace(
        /^(\d+)(\s+)(?!\.)(?=\w)/gm,
        "$1.$2"
    );
    
    // Special handling for common patterns like "1. First step 2. Second step"
    content = content.replace(
        /(\d+\.\s+[^\d\n]+)(\s*)(\d+\.\s+)/g, 
        "$1\n\n$3"
    );
    
    // Fix problem with "program:1. Step one" where there's no space before the number
    content = content.replace(
        /([a-z]):(\d+)\.\s+/gi,
        "$1:\n\n$2. "
    );
    
    // Ensure lists have proper spacing
    content = content.replace(/^(\s*[-*+]|\s*\d+\.)\s/gm, '\n$&');
    
    // Ensure headings have proper spacing
    content = content.replace(/^(#{1,6}\s.*?)$/gm, '\n$1\n');
    
    // Fix blockquotes formatting
    content = content.replace(/^(>+\s*)/gm, '\n$1');
    
    // Fix horizontal rules with proper spacing
    content = content.replace(/^(\s*[-*_]{3,}\s*)$/gm, '\n\n$1\n\n');
    
    // Fix table formatting
    content = content.replace(/^\|(.+)\|$/gm, (match) => {
        return match.trim();
    });
    
    // Fix common code indentation issues in AI responses
    content = content.replace(/return0;/g, 'return 0;'); // Fix missing space
    content = content.replace(/if\(/g, 'if ('); // Add space after if
    content = content.replace(/for\(/g, 'for ('); // Add space after for
    content = content.replace(/while\(/g, 'while ('); // Add space after while
    content = content.replace(/\){/g, ') {'); // Add space between ) and {
    
    // Enhanced C-code specific fixes
    content = content.replace(/#include\s+<([^>]+)>\s*\/\/([^\n]*)\n/g, 
        '#include <$1> // $2\n\n');
    content = content.replace(/int\s+main\(\)\s*{/g, 'int main() {');
    content = content.replace(/return0;/g, 'return 0;');
    
    // Normalize multiple consecutive blank lines to max 2
    content = content.replace(/\n{3,}/g, '\n\n');
    
    // Ensure text starts and ends cleanly
    return content.trim();
};

/**
 * Escapes HTML content to prevent rendering raw HTML in markdown
 */
export const escapeHtml = (unsafe: string): string => {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};
