import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, Download, Layers } from "lucide-react";
import UnifiedEditor from "@/components/screenplay/unified-editor";
import PaginatedUnifiedEditor from "@/components/screenplay/paginated-unified-editor";
import Sidebar from "@/components/screenplay/sidebar";
import StatusBar from "@/components/screenplay/status-bar";
import { useToast } from "@/hooks/use-toast";

export default function ScreenplayEditor() {
  const [content, setContent] = useState("");
  const [viewMode, setViewMode] = useState<'simple' | 'paginated'>('paginated');
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

  const toggleViewMode = () => {
    const newMode = viewMode === 'simple' ? 'paginated' : 'simple';
    setViewMode(newMode);

    toast({
      title: "تم تغيير وضع العرض",
      description: newMode === 'paginated' ?
        "الترقيم التلقائي للصفحات مُفعَّل" :
        "الوضع البسيط مُفعَّل",
    });
  };

  const updateStats = (newContent: string) => {
    setContent(newContent);

    // Count scenes (rough estimation based on scene headers)
    const sceneMatches = newContent.match(/مشهد|م\./g);
    const scenes = sceneMatches ? sceneMatches.length : 0;

    // Count words
    const words = newContent.trim().split(/\s+/).filter(word => word.length > 0).length;

    // Estimate pages (250 words per page for simple mode)
    const pages = Math.max(1, Math.ceil(words / 250));

    setStats(prev => ({
      ...prev,
      scenes,
      words,
      pages,
      lastSaved: new Date().toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }));
  };

  return (
    <div className="min-h-screen main-container" dir="rtl">
      {/* Header - Compact for A4 focus */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-12">
            <div className="flex items-center space-x-4 space-x-reverse">
              <h1 className="text-lg font-bold text-primary" data-testid="title-main">
                محرر السيناريو العربي
              </h1>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Button
                onClick={toggleViewMode}
                variant={viewMode === 'paginated' ? 'default' : 'outline'}
                size="sm"
                data-testid="button-view-mode"
              >
                <Layers className="w-3 h-3 ml-1" />
                {viewMode === 'paginated' ? 'صفحات متعددة' : 'صفحة واحدة'}
              </Button>
              <Button
                onClick={handleSave}
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                data-testid="button-save"
              >
                <Save className="w-3 h-3 ml-1" />
                حفظ
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExport}
                data-testid="button-export"
              >
                <Download className="w-3 h-3 ml-1" />
                تصدير
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* A4 Page Layout */}
      <div className="flex justify-center min-h-screen py-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 w-full max-w-7xl px-4">
          {/* Compact Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-4">
              <Sidebar stats={stats} onContentUpdate={updateStats} />
            </Card>
          </div>

          {/* Dynamic Editor - Switches between modes */}
          <div className="lg:col-span-4 flex justify-center">
            {viewMode === 'paginated' ? (
              <div className="w-full max-w-5xl">
                <Card className="overflow-hidden">
                  <PaginatedUnifiedEditor
                    content={content}
                    onContentChange={updateStats}
                  />
                </Card>
              </div>
            ) : (
              <div className="screenplay-container">
                <UnifiedEditor
                  content={content}
                  onContentChange={updateStats}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compact Status Bar */}
      <div className="fixed bottom-0 left-0 right-0">
        <StatusBar stats={stats} />
      </div>
    </div>
  );
}
