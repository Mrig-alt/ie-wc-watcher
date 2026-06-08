"use client";

import { Share, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  title: string;
  text: string;
  url: string;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  children?: React.ReactNode;
}

export default function ShareButton({ title, text, url, className, variant = "outline", children }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareData = { title, text, url };
    
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // AbortError is thrown if user cancels, we can ignore it
        if ((err as Error).name !== "AbortError") {
          console.error("Error sharing:", err);
        }
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(`${text}\n\n${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  return (
    <Button onClick={handleShare} variant={variant} className={cn("gap-2", className)}>
      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Share className="h-4 w-4" />}
      {children || (copied ? "Copied!" : "Share")}
    </Button>
  );
}
