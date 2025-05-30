"use client";

import * as React from "react";
import {
  Calculator,
  Calendar,
  CreditCard,
  Smile,
  User,
  FileText,
  BarChart,
  Mail,
  MessageSquare,
  Search,
  X,
  Loader2,
  Users,
  ShoppingCart,
  Bell,
  BookOpen,
  Code,
  Database,
  FileCode,
  Globe,
  ImageIcon,
  LayoutDashboard,
  Lock,
  PieChart,
  Server,
  TrendingUp,
  Zap,
  List,
  LayoutGrid,
  GalleryVertical,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

// Define our item types
type Category =
  | "all"
  | "pages"
  | "tools"
  | "settings"
  | "messages"
  | "documents"
  | "analytics"
  | "users"
  | "products"
  | "help";

interface CommandItemType {
  id: string;
  name: string;
  description?: string;
  icon: React.ReactNode;
  category: Category;
  shortcut?: string;
  tags?: string[];
  action?: () => void;
  date?: string;
  author?: {
    name: string;
    avatar?: string;
    email?: string;
  };
  status?: "active" | "archived" | "draft" | "published" | "pending";
  priority?: "low" | "medium" | "high";
  views?: number;
  size?: string;
  location?: string;
  url?: string;
  metadata?: Record<string, string>;
}

interface CommandSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandSearch({ open, onOpenChange }: CommandSearchProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [selectedCategory, setSelectedCategory] =
    React.useState<Category>("all");
  const [loading, setLoading] = React.useState(false);
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);
  const [viewMode, setViewMode] = React.useState<"list" | "grid" | "detailed">(
    "list"
  );
  const [sortBy, setSortBy] = React.useState<
    "name" | "date" | "priority" | "views"
  >("name");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");

  // Sample data for our command items
  const commandItems: CommandItemType[] = [
    // Pages Category
    {
      id: "1",
      name: "Dashboard",
      description: "View your main dashboard with key metrics and insights",
      icon: <LayoutDashboard className="h-4 w-4" />,
      category: "pages",
      tags: ["home", "metrics", "overview"],
      shortcut: "⌘D",
      date: "2023-05-15",
      views: 1250,
      status: "published",
      url: "/dashboard",
    },
    {
      id: "2",
      name: "Calendar",
      description: "View your calendar events and schedule meetings",
      icon: <Calendar className="h-4 w-4" />,
      category: "pages",
      tags: ["schedule", "events", "meetings"],
      shortcut: "⌘C",
      date: "2023-05-10",
      views: 890,
      status: "published",
      url: "/calendar",
    },
    {
      id: "3",
      name: "Analytics",
      description: "View detailed analytics and performance metrics",
      icon: <BarChart className="h-4 w-4" />,
      category: "analytics",
      tags: ["stats", "data", "metrics", "performance"],
      shortcut: "⌘A",
      date: "2023-05-08",
      views: 750,
      status: "published",
      url: "/analytics",
    },
    {
      id: "4",
      name: "User Management",
      description: "Manage users, permissions and roles",
      icon: <Users className="h-4 w-4" />,
      category: "users",
      tags: ["users", "permissions", "roles", "access"],
      shortcut: "⌘U",
      date: "2023-05-05",
      views: 620,
      status: "published",
      url: "/users",
    },
    {
      id: "5",
      name: "Products",
      description: "Browse and manage your product catalog",
      icon: <ShoppingCart className="h-4 w-4" />,
      category: "products",
      tags: ["inventory", "catalog", "items", "shop"],
      shortcut: "⌘P",
      date: "2023-05-03",
      views: 980,
      status: "published",
      url: "/products",
    },

    // Tools Category
    {
      id: "7",
      name: "Search Files",
      description: "Find documents and files across your workspace",
      icon: <FileText className="h-4 w-4" />,
      category: "tools",
      tags: ["documents", "files", "search"],
      shortcut: "⌘F",
      date: "2023-05-12",
      views: 780,
      status: "active",
    },
    {
      id: "8",
      name: "Calculator",
      description: "Perform quick calculations and conversions",
      icon: <Calculator className="h-4 w-4" />,
      category: "tools",
      tags: ["math", "calculate", "numbers", "conversion"],
      shortcut: "⌘K",
      date: "2023-05-01",
      views: 320,
      status: "active",
    },
    {
      id: "9",
      name: "Code Editor",
      description: "Edit code snippets and scripts",
      icon: <Code className="h-4 w-4" />,
      category: "tools",
      tags: ["code", "development", "programming", "scripts"],
      shortcut: "⌘E",
      date: "2023-04-25",
      views: 560,
      status: "active",
    },
    {
      id: "10",
      name: "Database Explorer",
      description: "Browse and query your databases",
      icon: <Database className="h-4 w-4" />,
      category: "tools",
      tags: ["database", "sql", "query", "data"],
      shortcut: "⌘B",
      date: "2023-04-20",
      views: 410,
      status: "active",
    },
    {
      id: "11",
      name: "API Tester",
      description: "Test API endpoints and view responses",
      icon: <Globe className="h-4 w-4" />,
      category: "tools",
      tags: ["api", "testing", "endpoints", "http"],
      shortcut: "⌘T",
      date: "2023-04-18",
      views: 380,
      status: "active",
    },

    // Settings Category
    {
      id: "12",
      name: "Profile Settings",
      description: "Manage your account profile and preferences",
      icon: <User className="h-4 w-4" />,
      category: "settings",
      tags: ["account", "user", "profile", "personal"],
      shortcut: "⌘P",
      date: "2023-05-14",
      status: "active",
    },

    {
      id: "14",
      name: "Security",
      description: "Configure security settings and permissions",
      icon: <Lock className="h-4 w-4" />,
      category: "settings",
      tags: ["security", "password", "2fa", "authentication"],
      shortcut: "⌘S",
      date: "2023-05-09",
      status: "active",
      priority: "high",
    },
    {
      id: "15",
      name: "Notifications",
      description: "Configure notification preferences and alerts",
      icon: <Bell className="h-4 w-4" />,
      category: "settings",
      tags: ["alerts", "notifications", "email", "push"],
      shortcut: "⌘N",
      date: "2023-05-07",
      status: "active",
    },

    // Messages Category
    {
      id: "17",
      name: "Inbox",
      description: "View your messages and notifications",
      icon: <MessageSquare className="h-4 w-4" />,
      category: "messages",
      tags: ["chat", "notifications", "inbox", "messages"],
      shortcut: "⌘M",
      date: "2023-05-15",
      status: "active",
      priority: "medium",
    },
    {
      id: "18",
      name: "Email",
      description: "Check your email inbox and send messages",
      icon: <Mail className="h-4 w-4" />,
      category: "messages",
      tags: ["mail", "inbox", "communication", "email"],
      shortcut: "⌘E",
      date: "2023-05-15",
      status: "active",
      priority: "high",
    },
    {
      id: "19",
      name: "Team Chat",
      description: "Collaborate with your team in real-time",
      icon: <Users className="h-4 w-4" />,
      category: "messages",
      tags: ["team", "chat", "collaboration", "communication"],
      shortcut: "⌘T",
      date: "2023-05-15",
      status: "active",
      priority: "medium",
    },
    {
      id: "20",
      name: "Announcements",
      description: "View important company announcements",
      icon: <Bell className="h-4 w-4" />,
      category: "messages",
      tags: ["announcements", "company", "news", "updates"],
      shortcut: "⌘A",
      date: "2023-05-13",
      status: "active",
      priority: "low",
    },

    // Documents Category
    {
      id: "21",
      name: "Documentation",
      description: "Access product documentation and guides",
      icon: <BookOpen className="h-4 w-4" />,
      category: "documents",
      tags: ["docs", "guides", "help", "manuals"],
      shortcut: "⌘D",
      date: "2023-05-10",
      status: "published",
      views: 890,
    },
    {
      id: "22",
      name: "Reports",
      description: "View and generate business reports",
      icon: <FileText className="h-4 w-4" />,
      category: "documents",
      tags: ["reports", "business", "analytics", "data"],
      shortcut: "⌘R",
      date: "2023-05-08",
      status: "published",
      views: 650,
    },
    {
      id: "23",
      name: "Templates",
      description: "Access document and project templates",
      icon: <FileCode className="h-4 w-4" />,
      category: "documents",
      tags: ["templates", "documents", "projects", "forms"],
      shortcut: "⌘T",
      date: "2023-05-05",
      status: "published",
      views: 720,
    },
    {
      id: "24",
      name: "Contracts",
      description: "Manage legal contracts and agreements",
      icon: <FileText className="h-4 w-4" />,
      category: "documents",
      tags: ["legal", "contracts", "agreements", "documents"],
      shortcut: "⌘L",
      date: "2023-05-03",
      status: "published",
      views: 320,
      priority: "high",
    },
    {
      id: "25",
      name: "Presentations",
      description: "Access and create presentation slides",
      icon: <ImageIcon className="h-4 w-4" />,
      category: "documents",
      tags: ["slides", "presentations", "decks", "meetings"],
      shortcut: "⌘S",
      date: "2023-04-28",
      status: "published",
      views: 480,
    },

    // Analytics Category
    {
      id: "26",
      name: "Performance Metrics",
      description: "View detailed performance analytics",
      icon: <TrendingUp className="h-4 w-4" />,
      category: "analytics",
      tags: ["performance", "metrics", "kpi", "analytics"],
      shortcut: "⌘M",
      date: "2023-05-14",
      status: "active",
      views: 890,
    },
    {
      id: "27",
      name: "Sales Dashboard",
      description: "Track sales performance and revenue",
      icon: <PieChart className="h-4 w-4" />,
      category: "analytics",
      tags: ["sales", "revenue", "performance", "dashboard"],
      shortcut: "⌘S",
      date: "2023-05-12",
      status: "active",
      views: 760,
      priority: "high",
    },
    {
      id: "28",
      name: "User Analytics",
      description: "Analyze user behavior and engagement",
      icon: <Users className="h-4 w-4" />,
      category: "analytics",
      tags: ["users", "behavior", "engagement", "analytics"],
      shortcut: "⌘U",
      date: "2023-05-10",
      status: "active",
      views: 680,
    },
    {
      id: "29",
      name: "Marketing Campaigns",
      description: "Track marketing campaign performance",
      icon: <Zap className="h-4 w-4" />,
      category: "analytics",
      tags: ["marketing", "campaigns", "ads", "performance"],
      shortcut: "⌘C",
      date: "2023-05-08",
      status: "active",
      views: 540,
    },
    {
      id: "30",
      name: "Server Monitoring",
      description: "Monitor server health and performance",
      icon: <Server className="h-4 w-4" />,
      category: "analytics",
      tags: ["server", "monitoring", "performance", "health"],
      shortcut: "⌘H",
      date: "2023-05-05",
      status: "active",
      views: 320,
      priority: "medium",
    },
  ];

  // Filter items based on search input and selected category
  const filteredItems = React.useMemo(() => {
    let items = [...commandItems];

    // Filter by category
    if (selectedCategory !== "all") {
      items = items.filter((item) => item.category === selectedCategory);
    }

    // Filter by search term
    if (inputValue) {
      const searchTerm = inputValue.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm) ||
          (item.description &&
            item.description.toLowerCase().includes(searchTerm)) ||
          (item.tags &&
            item.tags.some((tag) => tag.toLowerCase().includes(searchTerm)))
      );
    }

    // Sort items
    items.sort((a, b) => {
      if (sortBy === "name") {
        return sortOrder === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (sortBy === "date" && a.date && b.date) {
        return sortOrder === "asc"
          ? new Date(a.date).getTime() - new Date(b.date).getTime()
          : new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sortBy === "priority") {
        const priorityValue = { high: 3, medium: 2, low: 1, undefined: 0 };
        return sortOrder === "asc"
          ? (priorityValue[a.priority || "undefined"] || 0) -
              (priorityValue[b.priority || "undefined"] || 0)
          : (priorityValue[b.priority || "undefined"] || 0) -
              (priorityValue[a.priority || "undefined"] || 0);
      } else if (
        sortBy === "views" &&
        a.views !== undefined &&
        b.views !== undefined
      ) {
        return sortOrder === "asc" ? a.views - b.views : b.views - a.views;
      }
      return 0;
    });

    return items;
  }, [inputValue, selectedCategory, sortBy, sortOrder]);

  // Handle keyboard shortcut to open the command dialog
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [onOpenChange, open]);

  // Simulate loading state when changing categories
  const handleCategoryChange = (category: Category) => {
    setLoading(true);
    setSelectedCategory(category);

    // Simulate API call or data processing
    setTimeout(() => {
      setLoading(false);
    }, 300);
  };

  // Handle command selection
  const handleSelect = (item: CommandItemType) => {
    // Add to recent searches if it's not already there
    if (!recentSearches.includes(item.name)) {
      setRecentSearches((prev) => [item.name, ...prev].slice(0, 5));
    }

    // Execute the action
    if (item.action) {
      item.action();
    } else if (item.url) {
      window.location.href = item.url;
    }

    // Close the dialog
    onOpenChange(false);
  };

  // Get category count
  const getCategoryCount = (category: Category) => {
    return category === "all"
      ? commandItems.length
      : commandItems.filter((item) => item.category === category).length;
  };

  // Render priority badge
  const renderPriorityBadge = (priority?: "low" | "medium" | "high") => {
    if (!priority) return null;

    const variants = {
      low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      medium:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    };

    return (
      <span className={`text-xs px-2 py-1 rounded-full ${variants[priority]}`}>
        {priority}
      </span>
    );
  };

  // Render status badge
  const renderStatusBadge = (status?: string) => {
    if (!status) return null;

    const variants: Record<string, string> = {
      active:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      archived: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
      draft:
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      published:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      pending:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    };

    return (
      <span
        className={`text-xs px-2 py-1 rounded-full ${variants[status] || ""}`}
      >
        {status}
      </span>
    );
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="">
        <div className="">
          <CommandInput
            placeholder="Type a command or search..."
            value={inputValue}
            onValueChange={setInputValue}
            className="flex h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          />
          <div className="absolute right-2 top-3 flex items-center gap-2">
            {inputValue && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setInputValue("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex border-b px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 py-1">
            <Badge
              variant={selectedCategory === "all" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => handleCategoryChange("all")}
            >
              All ({getCategoryCount("all")})
            </Badge>
            <Badge
              variant={selectedCategory === "pages" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => handleCategoryChange("pages")}
            >
              Pages ({getCategoryCount("pages")})
            </Badge>
            <Badge
              variant={selectedCategory === "tools" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => handleCategoryChange("tools")}
            >
              Tools ({getCategoryCount("tools")})
            </Badge>
            <Badge
              variant={selectedCategory === "settings" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => handleCategoryChange("settings")}
            >
              Settings ({getCategoryCount("settings")})
            </Badge>
            <Badge
              variant={selectedCategory === "messages" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => handleCategoryChange("messages")}
            >
              Messages ({getCategoryCount("messages")})
            </Badge>
            <Badge
              variant={selectedCategory === "documents" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => handleCategoryChange("documents")}
            >
              Documents ({getCategoryCount("documents")})
            </Badge>
            <Badge
              variant={selectedCategory === "analytics" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => handleCategoryChange("analytics")}
            >
              Analytics ({getCategoryCount("analytics")})
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1 py-1 border-b px-3">
          <div className="flex items-center gap-1 rounded-xl border p-1">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
              <span className="sr-only">List view</span>
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="sr-only">Grid view</span>
            </Button>
            <Button
              variant={viewMode === "detailed" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setViewMode("detailed")}
            >
              <GalleryVertical className="h-4 w-4" />
              <span className="sr-only">Detailed view</span>
            </Button>
          </div>

          <select
            className="h-[38px] rounded-xl border bg-background px-2 text-xs"
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [newSortBy, newSortOrder] = e.target.value.split("-") as [
                "name" | "date" | "priority" | "views",
                "asc" | "desc"
              ];
              setSortBy(newSortBy);
              setSortOrder(newSortOrder);
            }}
          >
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="date-desc">Date (Newest)</option>
            <option value="date-asc">Date (Oldest)</option>
            <option value="priority-desc">Priority (High-Low)</option>
            <option value="priority-asc">Priority (Low-High)</option>
            <option value="views-desc">Views (High-Low)</option>
            <option value="views-asc">Views (Low-High)</option>
          </select>
        </div>

        <CommandList>
          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div>
                {recentSearches.length > 0 && (
                  <>
                    <CommandGroup heading="Recent Searches">
                      {recentSearches.map((search) => (
                        <CommandItem
                          key={search}
                          onSelect={() => {
                            setInputValue(search);
                          }}
                        >
                          <Search className="mr-2 h-4 w-4" />
                          <span>{search}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandSeparator />
                  </>
                )}

                {filteredItems.length === 0 && inputValue ? (
                  <CommandEmpty>
                    <div className="flex flex-col items-center justify-center py-6">
                      <Smile className="h-10 w-10 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">
                        No results found for "{inputValue}"
                      </p>
                    </div>
                  </CommandEmpty>
                ) : (
                  <>
                    {viewMode === "list" && (
                      <div>
                        {/* Group items by category */}
                        {(
                          [
                            "pages",
                            "tools",
                            "settings",
                            "messages",
                            "documents",
                            "analytics",
                          ] as const
                        ).map((category) => {
                          const categoryItems = filteredItems.filter(
                            (item) => item.category === category
                          );
                          if (categoryItems.length === 0) return null;

                          return (
                            <CommandGroup
                              key={category}
                              heading={
                                category.charAt(0).toUpperCase() +
                                category.slice(1)
                              }
                            >
                              {categoryItems.map((item) => (
                                <CommandItem
                                  key={item.id}
                                  onSelect={() => handleSelect(item)}
                                  className="flex items-center justify-between"
                                >
                                  <div className="flex items-center">
                                    {item.icon}
                                    <div className="ml-2">
                                      <p>{item.name}</p>
                                      {item.description && (
                                        <p className="text-xs text-muted-foreground">
                                          {item.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {item.priority &&
                                      renderPriorityBadge(item.priority)}
                                    {item.shortcut && (
                                      <kbd className="ml-auto flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                                        {item.shortcut}
                                      </kbd>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          );
                        })}
                      </div>
                    )}

                    {viewMode === "grid" && (
                      <div className="grid grid-cols-1 gap-2 p-2 sm:grid-cols-2">
                        {filteredItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex cursor-pointer flex-col rounded-xl border p-3 hover:bg-accent"
                            onClick={() => handleSelect(item)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                {item.icon}
                                <span className="ml-2 font-medium">
                                  {item.name}
                                </span>
                              </div>
                              {item.priority &&
                                renderPriorityBadge(item.priority)}
                            </div>
                            {item.description && (
                              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                {item.description}
                              </p>
                            )}
                            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                              <span>{item.category}</span>
                              {item.views !== undefined && (
                                <span>{item.views.toLocaleString()} views</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {viewMode === "detailed" && (
                      <div className="space-y-2 p-2">
                        {filteredItems.map((item) => (
                          <div
                            key={item.id}
                            className="cursor-pointer rounded-lg border p-3 hover:bg-accent/50"
                            onClick={() => handleSelect(item)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {item.icon}
                                <div>
                                  <h4 className="text-sm font-medium">
                                    {item.name}
                                  </h4>
                                  {item.description && (
                                    <p className="text-xs text-muted-foreground">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {item.status && renderStatusBadge(item.status)}
                                {item.priority &&
                                  renderPriorityBadge(item.priority)}
                                {item.shortcut && (
                                  <kbd className="flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                                    {item.shortcut}
                                  </kbd>
                                )}
                              </div>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                              {item.category && (
                                <div>
                                  <span className="font-medium">Category:</span>{" "}
                                  {item.category}
                                </div>
                              )}
                              {item.date && (
                                <div>
                                  <span className="font-medium">Date:</span>{" "}
                                  {item.date}
                                </div>
                              )}
                              {item.views !== undefined && (
                                <div>
                                  <span className="font-medium">Views:</span>{" "}
                                  {item.views.toLocaleString()}
                                </div>
                              )}
                              {item.tags && item.tags.length > 0 && (
                                <div className="col-span-2">
                                  <span className="font-medium">Tags:</span>{" "}
                                  {item.tags.join(", ")}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </ScrollArea>
        </CommandList>
      </div>
    </CommandDialog>
  );
}
