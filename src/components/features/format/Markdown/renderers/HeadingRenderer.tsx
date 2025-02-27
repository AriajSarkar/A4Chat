import React from 'react';

interface HeadingRendererProps {
    level: number;
    children: React.ReactNode;
}

export const HeadingRenderer: React.FC<HeadingRendererProps> = ({ level, children }) => {
    const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
    
    return (
        <HeadingTag className="font-semibold tracking-tight">
            {children}
        </HeadingTag>
    );
};
