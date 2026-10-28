import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-[#253b35] text-white hover:bg-[#1c302a] focus-visible:ring-[#779287]",
        destructive: "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-400",
        outline: "border border-[#ddd9d2] bg-white text-[#343a36] hover:bg-[#f4f2ee] dark:border-[#35423d] dark:bg-[#1b2420] dark:text-[#e8ebe7] dark:hover:bg-[#27322d]",
        secondary: "bg-[#e9ede7] text-[#36463e] hover:bg-[#dde5dc] dark:bg-[#29352f] dark:text-[#dfe8df] dark:hover:bg-[#35443c]",
        ghost: "text-[#59645d] hover:bg-[#f0f1ed] hover:text-[#27382f] dark:text-[#aeb9b1] dark:hover:bg-[#29332e] dark:hover:text-white",
        link: "text-[#466557] underline-offset-4 hover:underline dark:text-[#adc3b1]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded px-3 text-xs",
        lg: "h-11 rounded-md px-6",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}