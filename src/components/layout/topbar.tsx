"use client";

import { signOut, useSession } from "next-auth/react";
import { Bell, LogOut, Settings, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/utils/format";
import { MobileSidebar } from "./mobile-sidebar";
import { ThemeToggle } from "./theme-toggle";
import { CommandPalette } from "./command-palette";

export function Topbar() {
  const { data } = useSession();
  const user = data?.user;
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-800 bg-slate-950/80 px-4 backdrop-blur">
      <MobileSidebar />
      <div className="flex-1">
        <CommandPalette />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Badge variant="info" className="hidden md:inline-flex">
          <Sparkles className="mr-1 h-3 w-3" /> Brain online
        </Badge>
        <ThemeToggle />
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? "user"} />
                <AvatarFallback>{initials(user?.name ?? user?.email)}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm md:inline">{user?.name ?? "Guest"}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="text-sm font-medium">{user?.name}</div>
              <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
              {user?.role ? (
                <Badge variant="outline" className="mt-1 text-[10px]">
                  {user.role}
                </Badge>
              ) : null}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex w-full items-center gap-2">
                <User className="h-4 w-4" /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex w-full items-center gap-2">
                <Settings className="h-4 w-4" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
