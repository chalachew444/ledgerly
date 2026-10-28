import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-[#ddd9d2] bg-white px-3 py-2 text-sm text-[#28332d] outline-none placeholder:text-[#929990] focus:border-[#81998b] focus:ring-2 focus:ring-[#dce7df] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#35423d] dark:bg-[#19221e] dark:text-[#e7eae6] dark:focus:border-[#708c7d] dark:focus:ring-[#34473c]",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";