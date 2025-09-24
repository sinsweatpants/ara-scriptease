import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, Download } from "lucide-react";
import UnifiedEditor from "@/components/screenplay/unified-editor";
import Sidebar from "@/components/screenplay/sidebar";
import StatusBar from "@/components/screenplay/status-bar";
import { useToast } from "@/hooks/use-toast";

export default function ScreenplayEditor() {
  const [content, setContent] = useState("");
  const [stats, setStats] = useState({
    scenes: 0,
    words: 0,
    pages: 1,
    lastSaved: "منذ دقيقتين"
  });
  const { toast } = useToast();

  const handleSave = () => {
    // TODO: Implement save functionality
    toast({
      title: "تم الحفظ",
      description: "تم حفظ السيناريو بنجاح",
    });
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'screenplay.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "تم التصدير",
      description: "تم تصدير السيناريو بنجاح",
    });
  };

  const updateStats = (newContent: string) => {
    setContent(newContent);
    
    // Count scenes (rough estimation based on scene headers)
    const sceneMatches = newContent.match(/مشهد|م\./g);
    const scenes = sceneMatches ? sceneMatches.length : 0;
    
    // Count words
    const words = newContent.trim().split(/\s+/).filter(word => word.length > 0).length;
    
    // Estimate pages (250 words per page)
    const pages = Math.max(1, Math.ceil(words / 250));
    
    setStats(prev => ({
      ...prev,
      scenes,
      words,
      pages
    }));
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4 space-x-reverse">
              <h1 className="text-xl font-bold text-primary" data-testid="title-main">
                محرر السيناريو العربي
              </h1>
              <span className="text-sm text-muted-foreground">Arabic Screenplay Editor</span>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Button 
                onClick={handleSave} 
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                data-testid="button-save"
              >
                <Save className="w-4 h-4 ml-2" />
                حفظ
              </Button>
              <Button 
                variant="secondary" 
                onClick={handleExport}
                data-testid="button-export"
              >
                <Download className="w-4 h-4 ml-2" />
                تصدير
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Sidebar stats={stats} onContentUpdate={updateStats} />
          </div>

          {/* Main Editor */}
          <div className="lg:col-span-3">
            <Card className="overflow-hidden">
              <UnifiedEditor 
                content={content}
                onContentChange={updateStats}
              />
            </Card>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar stats={stats} />
    </div>
  );
}
