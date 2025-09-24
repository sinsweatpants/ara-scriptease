interface StatusBarStats {
  scenes: number;
  words: number;
  pages: number;
  lastSaved: string;
}

interface StatusBarProps {
  stats: StatusBarStats;
}

export default function StatusBar({ stats }: StatusBarProps) {
  return (
    <footer className="bg-card border-t border-border mt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <div className="flex items-center space-x-4 space-x-reverse">
            <span data-testid="text-last-saved">آخر حفظ: {stats.lastSaved}</span>
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>متصل</span>
          </div>
          <div className="flex items-center space-x-4 space-x-reverse">
            <span data-testid="text-cursor-position">السطر 15، العمود 23</span>
            <span>UTF-8</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
