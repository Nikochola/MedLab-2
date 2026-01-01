"use client";

import { useEffect, useRef } from "react";
import { annotate } from "rough-notation";

type Props = {
    children: React.ReactNode;
    color?: string;
    strokeWidth?: number;
    padding?: number;
    iterations?: number;
    multiline?: boolean;
    animationDuration?: number;
};

export default function RoughUnderline({
    children,
    color = "currentColor",
    strokeWidth = 2.5,
    padding = 1,
    iterations = 2,
    multiline = true,
    animationDuration = 650,
}: Props) {
    const ref = useRef<HTMLSpanElement | null>(null);

    useEffect(() => {
        if (!ref.current) return;

        const a = annotate(ref.current, {
            type: "underline",
            color,
            strokeWidth,
            padding,
            iterations,
            multiline,
            animationDuration,
        });

        a.show();

        return () => a.remove();
    }, [color, strokeWidth, padding, iterations, multiline, animationDuration]);

    return (
        <span ref={ref} className="relative inline-block">
            {children}
        </span>
    );
}
