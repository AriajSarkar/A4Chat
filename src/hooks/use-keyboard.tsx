import { useState, useEffect } from "react";

export const useKeyboard = () => {
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            if (window.visualViewport) {
                const isKeyboardVisible = window.visualViewport.height < window.innerHeight;
                setIsKeyboardOpen(isKeyboardVisible);
            }
        };

        if (window.visualViewport) {
            window.visualViewport.addEventListener("resize", handleResize);
        }

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener("resize", handleResize);
            }
        };
    }, []);

    return isKeyboardOpen;
};
