"use client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function registerGSAP() {
    if (typeof window !== "undefined") {
        gsap.registerPlugin(ScrollTrigger);
    }
}
