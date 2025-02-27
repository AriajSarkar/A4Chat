import React from 'react';

interface OrderedListRendererProps {
    children?: React.ReactNode;
    className?: string;
    start?: number; 
    [key: string]: any;
}

interface ListItemProps extends React.HTMLAttributes<HTMLElement> {
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
            {React.Children.map(children, (child) => {
                if (React.isValidElement<ListItemProps>(child)) {
                    return React.cloneElement(child, {
                        ...child.props,
                        className: `pl-2 mb-2 ${child.props.className || ''}`
                    });
                }
                return child;
            })}
        </ol>
    );
};
