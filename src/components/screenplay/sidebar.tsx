import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { handleFileUpload } from "@/lib/file-handlers";
import { useToast } from "@/hooks/use-toast";

interface SidebarStats {
  scenes: number;
  words: number;
  pages: number;
  lastSaved: string;
}

interface SidebarProps {
  stats: SidebarStats;
  onContentUpdate: (content: string) => void;
}

export default function Sidebar({ stats, onContentUpdate }: SidebarProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await processFiles(files);
  };

  const processFiles = async (files: File[]) => {
    for (const file of files) {
      try {
        const content = await handleFileUpload(file);
        onContentUpdate(content);
        
        toast({
          title: "تم تحميل الملف",
          description: `تم تحميل وتنسيق الملف: ${file.name}`,
        });
      } catch (error) {
        toast({
          title: "خطأ في تحميل الملف",
          description: `فشل في تحميل الملف: ${file.name}`,
          variant: "destructive",
        });
      }
    }
  };

  const handleDropZoneClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">استيراد الملفات</h2>
          <div 
            className={`file-drop-zone ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleDropZoneClick}
            data-testid="file-drop-zone"
          >
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-2">اسحب الملفات هنا أو انقر للاختيار</p>
            <p className="text-xs text-muted-foreground">.txt, .docx, .pdf</p>
            <input 
              ref={fileInputRef}
              type="file" 
              className="hidden" 
              accept=".txt,.docx,.pdf" 
              multiple
              onChange={handleFileInputChange}
              data-testid="input-file"
            />
          </div>
        </div>

        <div>
          <h3 className="text-md font-medium mb-3">عناصر السيناريو</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className="w-3 h-3 bg-primary rounded-full"></div>
              <span>رأس المشهد</span>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className="w-3 h-3 bg-accent rounded-full"></div>
              <span>الحوار</span>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className="w-3 h-3 bg-muted rounded-full"></div>
              <span>السرد الحركي</span>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className="w-3 h-3 bg-secondary rounded-full"></div>
              <span>الانتقالات</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-md font-medium mb-3">إحصائيات</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>عدد المشاهد:</span>
              <span data-testid="text-scene-count">{stats.scenes}</span>
            </div>
            <div className="flex justify-between">
              <span>عدد الكلمات:</span>
              <span data-testid="text-word-count">{stats.words}</span>
            </div>
            <div className="flex justify-between">
              <span>عدد الصفحات:</span>
              <span data-testid="text-page-count">{stats.pages}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
