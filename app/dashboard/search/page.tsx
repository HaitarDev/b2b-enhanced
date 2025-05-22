import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function SearchPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <h1 className="text-3xl font-bold mb-6">Advanced Command Search</h1>
      <p className="text-muted-foreground mb-8">
        Press <kbd className="px-2 py-1 bg-muted rounded border">⌘K</kbd> to open the command menu
      </p>

      <div className="relative w-full max-w-md">
        <Input type="text" placeholder="Search documentation..." className="w-full pl-4 pr-10 py-2" />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 h-5 rounded border bg-muted font-mono text-xs flex items-center">
          ⌘K
        </kbd>
      </div>

      <div className="mt-12 text-center">
        <p className="text-muted-foreground mb-4">Quick access to all commands and resources</p>
        <Button variant="outline" className="mx-auto">
          Open Command Menu
        </Button>
      </div>
    </div>
  )
}
