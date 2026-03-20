"use client";

import { useEffect, useRef } from "react";
import { annotate } from "rough-notation";

type Props = {
    children: React.ReactNode;
    color?: string;
    strokeWidth?: number;
    padding?: number;
    iterations?: number;
    animationDuration?: number;
};

export default function RoughCircle({
    children,
    color = "#ffd000ff", // green by default
    strokeWidth = 5,
    padding = 30,
    iterations = 2,
    animationDuration = 700,
}: Props) {
    const ref = useRef<HTMLSpanElement | null>(null);

    useEffect(() => {
        if (!ref.current) return;

        const annotation = annotate(ref.current, {
            type: "circle",
            color,
            strokeWidth,
            padding,
            iterations,
            animationDuration,
        });

        annotation.show();

        return () => annotation.remove();
    }, [color, strokeWidth, padding, iterations, animationDuration]);

    return (
        <span ref={ref} className="relative inline-block">
            {children}
        </span>
    );
}
