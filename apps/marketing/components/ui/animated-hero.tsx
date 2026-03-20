"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MoveRight, HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";

function Hero() {
    const [titleNumber, setTitleNumber] = useState(0);
    const titles = useMemo(
        () => ["clinical", "sharp", "accurate", "decisive", "engaged"],
        []
    );

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (titleNumber === titles.length - 1) {
                setTitleNumber(0);
            } else {
                setTitleNumber(titleNumber + 1);
            }
        }, 2000);
        return () => clearTimeout(timeoutId);
    }, [titleNumber, titles]);

    return (
        <div className="w-full">
            <div className="container mx-auto">
                <div className="flex gap-8 py-20 lg:py-40 items-center justify-center flex-col">
                    <div>
                        <Button variant="secondary" size="sm" className="gap-4 text-xs tracking-wide uppercase">
                            Now Available for Institutions <MoveRight className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="flex gap-4 flex-col">
                        <h1 className="text-5xl md:text-7xl max-w-2xl tracking-tighter text-center font-regular">
                            <span className="text-white block pb-2">Think like a doctor.</span>
                            <span className="text-slate-400 block pb-2">Stay </span>
                            <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-4 md:pt-1 text-white">
                                &nbsp;
                                {titles.map((title, index) => (
                                    <motion.span
                                        key={index}
                                        className="absolute font-semibold text-cyan-400"
                                        initial={{ opacity: 0, y: "-100" }}
                                        transition={{ type: "spring", stiffness: 50 }}
                                        animate={
                                            titleNumber === index
                                                ? {
                                                    y: 0,
                                                    opacity: 1,
                                                }
                                                : {
                                                    y: titleNumber > index ? -150 : 150,
                                                    opacity: 0,
                                                }
                                        }
                                    >
                                        {title}
                                    </motion.span>
                                ))}
                            </span>
                        </h1>

                        <p className="text-lg md:text-xl leading-relaxed tracking-tight text-slate-400 max-w-2xl text-center mx-auto mt-4">
                            AI-powered ECG and radiology cases that make clinical reasoning click — at your own pace, on any device. Bridge the gap between theory and real-world execution.
                        </p>
                    </div>
                    <div className="flex flex-row gap-3 mt-4">
                        <Button size="lg" className="gap-4 border-slate-700 hover:bg-slate-800 text-white" variant="outline">
                            Request Demo <HeartPulse className="w-4 h-4" />
                        </Button>
                        <Button size="lg" className="gap-4 bg-cyan-500 text-black hover:bg-cyan-400 font-semibold">
                            Get Started <MoveRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export { Hero };
