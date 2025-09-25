import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlignLeft, Undo, Redo, FileText } from "lucide-react";
import { createPagedHTML } from "@/lib/screenplay-parser";
import { useToast } from "@/hooks/use-toast";
import Ruler from "../ui/ruler";
import { AdvancedPaginationEngine } from "@/lib/advanced-pagination-engine";

interface PaginatedUnifiedEditorProps {
  content: string;
  onContentChange: (content: string) => void;
}

export default function PaginatedUnifiedEditor({ content, onContentChange }: PaginatedUnifiedEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isEditing, setIsEditing] = useState(true); // Enable editing by default
  const [paginationEngine, setPaginationEngine] = useState<AdvancedPaginationEngine | null>(null);
  const { toast } = useToast();

  // Extract text content from paginated HTML
  const extractTextFromPaginatedHTML = useCallback((html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    let text = '';
    const pages = tempDiv.querySelectorAll('.page');

    pages.forEach((page) => {
      const pageContent = page.querySelector('.page-content');
      if (pageContent) {
        // Extract text while preserving structure
        const elements = pageContent.children;
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          const className = element.className;

          if (className.includes('basmala')) {
            text += element.textContent + '\n\n';
          } else if (className.includes('scene-header')) {
            // Handle complex scene headers
            if (element.querySelector('.scene-header-top-line')) {
              const sceneNum = element.querySelector('.scene-header-1')?.textContent || '';
              const timeLocation = element.querySelector('.scene-header-2')?.textContent || '';
              const place = element.querySelector('.scene-header-3')?.textContent || '';
              text += `${sceneNum} ${timeLocation}\n${place}\n\n`;
            } else {
              text += element.textContent + '\n\n';
            }
          } else if (className.includes('dialogue-block')) {
            // Handle dialogue blocks
            const characterName =
              element.querySelector('.character-name')?.textContent ||
              element.querySelector('.character')?.textContent ||
              '';
            text += characterName + ':\n';

            const parentheticals = element.querySelectorAll('.parenthetical');
            const dialogues = element.querySelectorAll('.dialogue-text, .dialogue');

            parentheticals.forEach(p => text += p.textContent + '\n');
            dialogues.forEach(d => text += d.textContent + '\n');
            text += '\n';
          } else if (className.includes('action')) {
            const actionText = element.textContent?.trim();
            if (actionText) {
              text += actionText + '\n\n';
            } else {
              text += '\n';
            }
          } else if (className.includes('transition')) {
            text += element.textContent + '\n\n';
          }
        }
      }
    });

    return text.replace(/\n{3,}/g, '\n\n').trim();
  }, []);

  // Calculate pagination and update display
  const updatePagination = useCallback((text: string) => {
    const paginatedHTML = createPagedHTML(text);

    if (editorRef.current) {
      editorRef.current.innerHTML = paginatedHTML;
      const pageCount = editorRef.current.querySelectorAll('.page').length || 1;
      setTotalPages(pageCount);
      setCurrentPage(prev => Math.min(prev, pageCount));
    } else {
      const temp = document.createElement('div');
      temp.innerHTML = paginatedHTML;
      const pageCount = temp.querySelectorAll('.page').length || 1;
      setTotalPages(pageCount);
      setCurrentPage(prev => Math.min(prev, pageCount));
    }
  }, []);

  // Handle content editing with advanced engine
  const handleInput = useCallback((e: React.FormEvent) => {
    if (!isEditing || !paginationEngine) return;

    const target = e.target as HTMLElement;
    let newContent = '';

    // Extract text from the specific element being edited
    if (target.closest('.page-content')) {
      const allPagesText = extractTextFromPaginatedHTML(editorRef.current?.innerHTML || '');
      newContent = allPagesText;
    }

    // Update content
    onContentChange(newContent);

    // Add to undo stack
    setUndoStack(prev => [...prev.slice(-19), newContent]);
    setRedoStack([]);

    // Update page count
    setTotalPages(paginationEngine.getPageCount());

  }, [isEditing, paginationEngine, extractTextFromPaginatedHTML, onContentChange]);

  // Handle paste operations with advanced engine
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();

    if (!isEditing || !paginationEngine) {
      toast({
        title: "تحذير",
        description: "يجب تفعيل وضع التحرير أولاً",
        variant: "destructive"
      });
      return;
    }

    const pastedText = e.clipboardData.getData('text/plain');
    const lines = pastedText.split('\n');
    
    // مسح المحتوى الحالي وإعادة البناء
    paginationEngine.clear();
    
    // معالجة كل سطر
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      if (trimmed.includes('بسم الله الرحمن الرحيم')) {
        paginationEngine.appendBlock(() => {
          const basmala = document.createElement('div');
          basmala.className = 'basmala';
          basmala.textContent = trimmed;
          return basmala;
        });
      } else if (trimmed.match(/^(مشهد|م\.)\s*\d+/i)) {
        const parts = trimmed.split(/[-–—]/)
        const sceneNum = parts[0]?.trim() || trimmed;
        const timeLocation = parts[1]?.trim() || '';
        const place = parts[2]?.trim() || '';
        paginationEngine.appendSceneHeader(sceneNum, timeLocation, place);
      } else if (trimmed.match(/^[\u0600-\u06FF][\u0600-\u06FF\s]*:/)) {
        const [character, ...dialogueParts] = trimmed.split(':');
        const dialogue = dialogueParts.join(':').trim();
        paginationEngine.appendDialogue(character.trim(), dialogue || 'حوار...');
      } else if (trimmed.match(/^\(.*\)$/)) {
        paginationEngine.appendBlock(() => {
          const par = document.createElement('div');
          par.className = 'parenthetical';
          par.textContent = trimmed;
          return par;
        });
      } else if (trimmed.match(/^(قطع|انتقال|فيد|ذوبان)/i)) {
        paginationEngine.appendTransition(trimmed);
      } else {
        paginationEngine.appendAction(trimmed);
      }
    }
    
    onContentChange(pastedText);
    setTotalPages(paginationEngine.getPageCount());
    setUndoStack(prev => [...prev.slice(-19), pastedText]);
    setRedoStack([]);

    toast({
      title: "تم اللصق بنجاح ✅",
      description: `تم إدراج النص مع الترقيم التلقائي (${lines.length} سطر، ${paginationEngine.getPageCount()} صفحة)`,
    });
  }, [isEditing, paginationEngine, onContentChange, toast]);

  // Undo functionality with advanced engine
  const handleUndo = () => {
    if (undoStack.length > 1 && paginationEngine) {
      const current = undoStack[undoStack.length - 1];
      const previous = undoStack[undoStack.length - 2];

      setRedoStack(prev => [...prev, current]);
      setUndoStack(prev => prev.slice(0, -1));

      // إعادة بناء المحتوى
      paginationEngine.clear();
      const lines = previous.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) paginationEngine.appendAction(trimmed);
      }
      
      onContentChange(previous);
      setTotalPages(paginationEngine.getPageCount());
    }
  };

  // Redo functionality with advanced engine
  const handleRedo = () => {
    if (redoStack.length > 0 && paginationEngine) {
      const next = redoStack[redoStack.length - 1];

      setUndoStack(prev => [...prev, next]);
      setRedoStack(prev => prev.slice(0, -1));

      // إعادة بناء المحتوى
      paginationEngine.clear();
      const lines = next.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) paginationEngine.appendAction(trimmed);
      }
      
      onContentChange(next);
      setTotalPages(paginationEngine.getPageCount());
    }
  };

  // Format text with advanced engine
  const handleFormat = () => {
    if (!paginationEngine) return;
    
    const currentText = extractTextFromPaginatedHTML(editorRef.current?.innerHTML || '');
    
    // إعادة بناء المحتوى بالتنسيق الصحيح
    paginationEngine.clear();
    const lines = currentText.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      if (trimmed.includes('بسم الله الرحمن الرحيم')) {
        paginationEngine.appendBlock(() => {
          const basmala = document.createElement('div');
          basmala.className = 'basmala';
          basmala.textContent = trimmed;
          return basmala;
        });
      } else {
        paginationEngine.appendAction(trimmed);
      }
    }
    
    setTotalPages(paginationEngine.getPageCount());

    toast({
      title: "تم التنسيق",
      description: `تم إعادة تنسيق النص (${paginationEngine.getPageCount()} صفحة)`,
    });
  };

  // Navigate between pages
  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
      const pageElement = editorRef.current?.querySelector(`[data-page="${pageNumber}"]`);
      if (pageElement) {
        pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Initialize pagination engine and sample content
  useEffect(() => {
    if (editorRef.current && !paginationEngine) {
      // إنشاء مضيف الصفحات
      const pagesHost = document.createElement('div');
      pagesHost.className = 'pages-host';
      editorRef.current.innerHTML = '';
      editorRef.current.appendChild(pagesHost);
      
      // إنشاء محرك التخطيط
      const engine = new AdvancedPaginationEngine(pagesHost);
      setPaginationEngine(engine);
      
      // إضافة محتوى تجريبي
      if (!content) {
        engine.appendBlock(() => {
          const basmala = document.createElement('div');
          basmala.className = 'basmala';
          basmala.textContent = 'بسم الله الرحمن الرحيم';
          return basmala;
        });
        
        engine.appendSceneHeader('مشهد 1', 'ليل-داخلي', 'شقة هند في بيروت');
        
        engine.appendAction('ترقد هند على السرير وهي تنظر إلى السقف. الغرفة مضاءة بنور خافت.');
        
        engine.appendDialogue('هند', 'لا أستطيع النوم...', 'هامسة لنفسها');
        
        engine.appendAction('انقر هنا لبدء الكتابة أو استخدم Ctrl+V للصق النص.');
        
        setTotalPages(engine.getPageCount());
      }
    }
  }, [editorRef.current, paginationEngine, content]);

  // Set contentEditable when editor is ready
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.contentEditable = isEditing.toString();
    }
  }, [isEditing]);

  // Handle edit mode toggle
  const toggleEditMode = () => {
    setIsEditing(!isEditing);
    toast({
      title: isEditing ? "تم إيقاف التحرير" : "تم تفعيل التحرير",
      description: isEditing ? "المحرر في وضع القراءة فقط" : "يمكنك الآن التحرير واللصق",
    });
  };

  return (
    <>
      {/* Enhanced Toolbar with Pagination Controls */}
      <div className="toolbar flex items-center justify-between bg-card border border-border rounded-t-lg px-4 py-3">
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button
            variant={isEditing ? "default" : "outline"}
            size="sm"
            onClick={toggleEditMode}
            data-testid="button-edit-mode"
          >
            <FileText className="w-4 h-4" />
            <span className="mr-2">
              {isEditing ? '🟢 تحرير مُفعَّل' : '🔴 تحرير معطل'}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFormat}
            data-testid="button-format"
          >
            <AlignLeft className="w-4 h-4" />
            <span className="mr-2">تنسيق</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={undoStack.length <= 1}
            data-testid="button-undo"
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            data-testid="button-redo"
          >
            <Redo className="w-4 h-4" />
          </Button>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center space-x-4 space-x-reverse">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              السابق
            </Button>
            <span className="text-sm font-medium px-3 py-1 bg-muted rounded">
              صفحة {currentPage} من {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              التالي
            </Button>
          </div>
        </div>
      </div>

      {/* Paginated Editor with Rulers */}
      <div className="editor-area-wrapper" style={{ position: 'relative', paddingTop: '30px', paddingRight: '30px', margin: '0 auto' }}>
        <Ruler orientation="horizontal" />
        <Ruler orientation="vertical" />
        <div
          ref={editorRef}
          className="screenplay-pages-container"
          contentEditable={isEditing}
          onInput={handleInput}
          onPaste={handlePaste}
          data-testid="editor-paginated"
          suppressContentEditableWarning={true}
          style={{
            outline: 'none',
            height: '29.7cm',
            width: '21cm',
            background: '#ffffff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            paddingTop: '2.54cm',      // 1 inch
            paddingBottom: '2.54cm',   // 1 inch
            paddingRight: '3.81cm',     // 1.5 inches
            paddingLeft: '2.54cm'       // 1 inch
          }}
        />
      </div>
    </>
  );
}