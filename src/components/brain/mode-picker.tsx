"use client";

import { Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { BRAIN_MODES } from "@/lib/utils/constants";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function ModePicker({ value, onChange }: Props) {
  const current = BRAIN_MODES.find((m) => m.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Sparkles className="mr-1 h-4 w-4" /> {current?.label ?? "Mode"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Brain modes</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {BRAIN_MODES.map((m) => (
          <DropdownMenuItem key={m.value} onSelect={() => onChange(m.value)}>
            <div>
              <div className="text-sm font-medium">{m.label}</div>
              <div className="text-xs text-muted-foreground">{m.description}</div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
