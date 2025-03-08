import React, {
    HTMLAttributes,
    Children,
    isValidElement,
    cloneElement
} from 'react';

interface OrderedListRendererProps {
    children?: React.ReactNode;
    className?: string;
    start?: number; 
    [key: string]: any;
}

interface ListItemProps extends HTMLAttributes<HTMLElement> {
    children?: React.ReactNode;
    index?: number;
}

export const OrderedListRenderer: React.FC<OrderedListRendererProps> = ({ 
    children, 
    className = '', 
    start = 1, 
    ...rest 
}) => {
    // Use actual HTML ordered list with custom styling
    return (
        <ol 
            className={`my-4 pl-8 list-decimal ${className}`}
            start={start}
            {...rest}
        >
            {Children.map(children, (child) => {
                if (isValidElement<ListItemProps>(child)) {
                    return cloneElement(child, {
                        ...child.props,
                        className: `pl-2 mb-2 ${child.props.className || ''}`
                    });
                }
                return child;
            })}
        </ol>
    );
};
