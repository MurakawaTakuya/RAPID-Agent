"use client";

import { useAuth } from "@/contexts/AuthContext";
import {
  ChevronsUpDown,
  Folder,
  LogOut,
  LucideIcon,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useFavorites } from "@/hooks/use-favorites";

interface NavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  folderId?: number;
  items?: {
    title: string;
    url: string;
    icon?: LucideIcon;
    folderId?: number;
  }[];
}

export function AppSidebar() {
  const { user, signOut, loading } = useAuth();
  const { isMobile } = useSidebar();
  const { folders, deleteFolder } = useFavorites();
  const pathname = usePathname();

  const [deletingFolder, setDeletingFolder] = useState<{
    id: number;
    name: string;
  } | null>(null);

  if (loading) return null;

  if (!user) return null;

  const userInitials = user.email ? user.email.slice(0, 2).toUpperCase() : "CN";

  const navMain: NavItem[] = [
    {
      title: "論文検索",
      url: "/",
      icon: Search,
    },
    {
      title: "保存した論文",
      url: "#",
      icon: Star,
      isActive: true,
      items: [
        {
          title: "すべて",
          url: "/favorites",
          icon: Star,
        },
        {
          title: "デフォルト",
          url: "/favorites?folderId=null",
          icon: Folder,
        },
        ...folders.map((folder) => ({
          title: folder.name,
          url: `/favorites?folderId=${folder.id}`,
          icon: Folder,
          folderId: folder.id,
        })),
      ],
    },
  ];

  const handleDeleteClick = (
    e: React.MouseEvent,
    folderId: number,
    folderName: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingFolder({ id: folderId, name: folderName });
  };

  const handleConfirmDelete = async () => {
    if (deletingFolder) {
      await deleteFolder(deletingFolder.id);
      setDeletingFolder(null);
    }
  };

  return (
    <>
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarContent>
          <SidebarGroup className="gap-5 py-5">
            <SidebarGroupLabel>
              <Link href="/" className="flex items-center gap-2 w-full my-2">
                RAPID Agent
              </Link>
            </SidebarGroupLabel>
            <SidebarMenu>
              {navMain.map((item) => {
                if (!item.items?.length) {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <Link href={item.url}>
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <Collapsible
                    key={item.title}
                    asChild
                    defaultOpen={item.isActive}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.title}>
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                          <ChevronsUpDown className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items?.map((subItem) => (
                            <SidebarMenuSubItem
                              key={subItem.title}
                              className="group/sub-item relative"
                            >
                              <SidebarMenuSubButton asChild>
                                <Link href={subItem.url}>
                                  {subItem.icon && (
                                    <subItem.icon className="mr-2 h-4 w-4" />
                                  )}
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                              {subItem.folderId && (
                                <button
                                  className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/sub-item:opacity-100 transition-opacity p-1 rounded-md hover:bg-sidebar-accent"
                                  onClick={(e) =>
                                    handleDeleteClick(
                                      e,
                                      subItem.folderId!,
                                      subItem.title
                                    )
                                  }
                                  title="フォルダを削除"
                                >
                                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive transition-colors" />
                                </button>
                              )}
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="h-8 w-8 rounded-full">
                      <AvatarImage
                        src={user.photoURL || undefined}
                        alt={user.displayName || "User"}
                      />
                      <AvatarFallback className="rounded-full">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {user.displayName || "User"}
                      </span>
                      <span className="truncate text-xs">
                        {user.email || "user@example.com"}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side={isMobile ? "bottom" : "top"}
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    ログアウト
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <AlertDialog
        open={!!deletingFolder}
        onOpenChange={(open) => !open && setDeletingFolder(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>フォルダを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              フォルダ「{deletingFolder?.name}」を削除します。
              フォルダ内の論文はデフォルトに移動されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
