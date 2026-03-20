"use client";
import { useEffect } from "react";
import { registerGSAP } from "../lib/animations";

export function GSAPInit() {
    useEffect(() => {
        registerGSAP();
    }, []);

    return null;
}
