import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';

// Core languages
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-kotlin';

// Web development
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-scss';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-graphql';

// Data & Config
import 'prismjs/components/prism-csv';
import 'prismjs/components/prism-toml';
import 'prismjs/components/prism-ini';
import 'prismjs/components/prism-docker';
import 'prismjs/components/prism-diff';
import 'prismjs/components/prism-regex';

// System languages
import 'prismjs/components/prism-shell-session';
import 'prismjs/components/prism-powershell';
import 'prismjs/components/prism-batch';
import 'prismjs/components/prism-makefile';

/**
 * Format code with proper indentation based on language
 */
export const formatCode = (code: string, language?: string): string => {
    if (!code) return '';
    
    // Remove extra blank lines at start and end
    let formattedCode = code.trim();
    
    // Special handling for C-like languages with missing indentation
    if (['c', 'cpp', 'csharp', 'java'].includes(language?.toLowerCase() || '')) {
        // Fix common structure issues before formatting
        formattedCode = fixCStylePreFormatting(formattedCode);
        
        // Basic formatting fixes - improve spacing around operators and keywords
        formattedCode = formattedCode
            .replace(/\b(if|for|while|switch|catch)\(/g, '$1 (')
            .replace(/\)\s*{/g, ') {')
            .replace(/}\s*else\s*{/g, '} else {')
            .replace(/return(\d+);/g, 'return $1;')  // Fix return0; -> return 0;
            .replace(/;([^\s\n}])/g, '; $1')  // Add space after semicolons when needed
            .replace(/\s{2,}/g, ' '); // Normalize multiple spaces
            
        // Handle indentation properly
        const lines = formattedCode.split('\n');
        let indentLevel = 0;
        let inMultiLineComment = false;
        
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        formattedCode = lines.map((line, _index) => {
            let trimmedLine = line.trim();
            if (trimmedLine === '') return '';
            
            // Handle comments
            if (trimmedLine.startsWith('/*')) {
                inMultiLineComment = true;
            }
            
            if (trimmedLine.endsWith('*/')) {
                inMultiLineComment = false;
                // Special handling for single-line comments
                if (trimmedLine.startsWith('/*')) {
                    return ' '.repeat(indentLevel * 4) + trimmedLine;
                }
            }
            
            // Handle inline comments
            const commentIndex = trimmedLine.indexOf('//');
            let code = trimmedLine;
            let comment = '';
            
            if (commentIndex > -1 && !inMultiLineComment) {
                code = trimmedLine.substring(0, commentIndex).trim();
                comment = trimmedLine.substring(commentIndex);
                trimmedLine = code; // Process only the code part for indentation
            }
            
            // Adjust indent level based on braces
            if (!inMultiLineComment) {
                // Check closing brace at start
                if (trimmedLine.startsWith('}')) {
                    indentLevel = Math.max(0, indentLevel - 1);
                }
                
                // Multiple closing braces on same line
                const closingBraces = (trimmedLine.match(/}/g) || []).length;
                const openingBraces = (trimmedLine.match(/{/g) || []).length;
                
                // Handle complex lines with multiple braces
                if (closingBraces > 1 && openingBraces < closingBraces) {
                    indentLevel = Math.max(
                        0, 
                        indentLevel - (closingBraces - openingBraces)
                    );
                }
            }
            
            // Apply indentation
            const indent = ' '.repeat(indentLevel * 4);
            let formattedLine = code ? (indent + code) : '';
            
            // Add back the comment with proper spacing
            if (comment) {
                formattedLine = formattedLine + ' ' + comment;
            }
            
            // Adjust indent level for next line
            if (!inMultiLineComment) {
                // Check if line ends with opening brace
                if (trimmedLine.endsWith('{')) {
                    // Don't increase indent if the line also has a closing brace
                    // (like "} else {")
                    if (!trimmedLine.includes('}') || 
                        trimmedLine.lastIndexOf('{') > trimmedLine.lastIndexOf('}')) {
                        indentLevel++;
                    }
                }
            }
            
            return formattedLine;
        }).join('\n');
    } else {
        // For other languages, use enhanced general purpose formatting
        const lines = formattedCode.split('\n');
        
        // Try to detect if this is a code block with indentation
        const hasIndentation = lines.some(line => line.trim() && line.startsWith('  '));
        
        if (hasIndentation) {
            // Find minimum indentation from non-empty lines
            const nonEmptyLines = lines.filter(line => line.trim());
            const minIndent = nonEmptyLines.reduce((min, line) => {
                const indent = line.match(/^\s*/)[0].length;
                return indent > 0 && (min === -1 || indent < min) ? indent : min;
            }, -1);
            
            // Remove common indentation if found
            if (minIndent > 0) {
                formattedCode = lines
                    .map(line => line.startsWith(' '.repeat(minIndent)) ? line.slice(minIndent) : line)
                    .join('\n');
            }
        } else {
            // Try to apply language-specific indentation based on common syntax patterns
            switch (language?.toLowerCase()) {
                case 'python':
                    // Apply Python-specific indentation (based on colons)
                    formattedCode = formatPythonCode(formattedCode);
                    break;
                // Add more language specific formatting as needed
            }
        }
    }
    
    return formattedCode;
};

/**
 * Pre-formats C-style code to deal with no indentation or broken structure
 */
function fixCStylePreFormatting(code: string): string {
    // Basic fixes for completely unindented C code
    
    // Insert proper line breaks after preprocessor directives
    code = code.replace(/(#include [^;]+)(\/\/[^\n]*)?(?!\n)/g, '$1$2\n');
    
    // Ensure opening braces get proper line breaks
    code = code.replace(/([^{};])\s*{(?!\n)/g, '$1 {\n');
    
    // Ensure closing braces get proper line breaks
    code = code.replace(/}([^};])/g, '}\n$1');
    
    // Fix functions or blocks that have no spacing
    code = code.replace(/(\w+)\s*\(\s*([^)]*)\s*\)\s*{/g, '$1($2) {');
    
    // Separate statements with proper line breaks
    code = code.replace(/;([^\s\n}])/g, ';\n$1');
    
    // Handle specific C patterns
    code = code.replace(/int\s+main\s*\(\s*\)(\s*{)/g, 'int main()$1');
    code = code.replace(/return(\d+);/g, 'return $1;');
    
    // Clean up extra blank lines
    code = code.replace(/\n\s*\n/g, '\n\n');
    
    return code;
}

/**
 * Python-specific code formatting
 */
function formatPythonCode(code: string): string {
    const lines = code.split('\n');
    let indentLevel = 0;
    
    return lines.map(line => {
        const trimmedLine = line.trim();
        
        // Skip empty lines
        if (!trimmedLine) return '';
        
        // Decrease indent for lines starting with specific keywords
        if (/^(else|elif|except|finally)/.test(trimmedLine)) {
            indentLevel = Math.max(0, indentLevel - 1);
        }
        
        // Apply current indent
        const indent = ' '.repeat(indentLevel * 4);
        const formattedLine = indent + trimmedLine;
        
        // Increase indent after lines ending with colon
        if (trimmedLine.endsWith(':')) {
            indentLevel++;
        }
        
        return formattedLine;
    }).join('\n');
}

/**
 * Highlight code with Prism
 * The parameters are intentionally unused but kept for API consistency
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const highlightCode = (_code?: string, _language?: string): void => {
    requestAnimationFrame(() => {
        Prism.highlightAll();
    });
};

export default Prism;
