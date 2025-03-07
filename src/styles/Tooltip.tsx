import React from 'react';
import { zIndex } from './zindex';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    position?: 'right' | 'left' | 'top' | 'bottom';
}

export const Tooltip: React.FC<TooltipProps> = ({ 
    content, 
    children,
    position = 'right'
}) => {
    const positionStyles = {
        right: {
            container: 'left-full ml-2 -translate-y-1/2 top-1/2',
            arrow: 'right-full top-1/2 -translate-y-1/2 -mr-1',
            arrowRotate: 'rotate-45'
        },
        left: {
            container: 'right-full mr-2 -translate-y-1/2 top-1/2',
            arrow: 'left-full top-1/2 -translate-y-1/2 -ml-1',
            arrowRotate: '-rotate-[135deg]'
        },
        top: {
            container: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
            arrow: 'bottom-[-4px] left-1/2 -translate-x-1/2',
            arrowRotate: '-rotate-[135deg]'
        },
        bottom: {
            container: 'top-full mt-2 left-1/2 -translate-x-1/2',
            arrow: 'top-[-4px] left-1/2 -translate-x-1/2',
            arrowRotate: 'rotate-45'
        }
    };

    const style = positionStyles[position];

    return (
        <div className="relative group">
            {children}
            <div 
                className={`
                    absolute ${style.container}
                    opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100
                    transition-all duration-200 origin-center
                    z-[${zIndex.tooltip}]
                `}
            >
                <div className={`absolute ${style.arrow}`}>
                    <div className={`w-2 h-2 ${style.arrowRotate} 
                                bg-brand-200 dark:bg-brand-700
                                border-brand-300/50 dark:border-brand-600/50`} />
                </div>
                <div className="bg-brand-200 dark:bg-brand-700 
                            text-brand-900 dark:text-brand-50
                            text-sm rounded-md py-1.5 px-3 
                            whitespace-nowrap shadow-lg
                            border border-brand-300/50 dark:border-brand-600/50
                            backdrop-blur-sm">
                    {content}
                </div>
            </div>
        </div>
    );
};
