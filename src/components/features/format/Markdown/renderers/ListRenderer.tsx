import React, 
    {
        HTMLAttributes,
        Children, 
        isValidElement, 
        cloneElement
    } 
from 'react';

interface ListRendererProps {
    ordered?: boolean;
    children?: React.ReactNode; // Make children optional to match React Markdown props
    className?: string; // Add className to props
    // Add any other HTML attributes that might be passed from React Markdown
    [key: string]: any;
}

interface ListItemProps extends HTMLAttributes<HTMLLIElement> {
    children?: React.ReactNode; // Make children optional
}

export const ListRenderer: React.FC<ListRendererProps> = ({ ordered, children, ...rest }) => {
    const Tag = ordered ? 'ol' : 'ul';
    
    return (
        <Tag className={`
            my-4 ml-4 space-y-2
            ${ordered 
                ? 'list-decimal text-lg font-semibold marker:text-brand-600 dark:marker:text-brand-400' 
                : 'list-disc marker:text-gray-400 dark:marker:text-gray-500'
            }
        `} {...rest}>
            {Children.map(children, child => {
                if (isValidElement<ListItemProps>(child)) {
                    return cloneElement(child, {
                        ...child.props,
                        className: `pl-2 -ml-2 ${ordered ? 'text-base font-normal' : ''} ${child.props.className || ''}`
                    } as ListItemProps);
                }
                return child;
            })}
        </Tag>
    );
};
