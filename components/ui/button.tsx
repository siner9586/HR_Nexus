"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  children: ReactNode;
};

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "border-blue-700 bg-blue-700 text-white hover:bg-blue-800",
        variant === "secondary" && "border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
        variant === "ghost" && "border-transparent bg-transparent text-slate-700 hover:bg-slate-100",
        variant === "danger" && "border-red-600 bg-red-600 text-white hover:bg-red-700",
        size === "sm" && "h-8 px-3 text-sm",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-11 px-5 text-base",
        size === "icon" && "h-9 w-9 p-0",
        className,
      )}
      {...props}
    />
  );
}
