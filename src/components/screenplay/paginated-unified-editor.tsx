import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlignLeft, Undo, Redo, FileText } from "lucide-react";
import { createPagedHTML } from "@/lib/screenplay-parser";
import { useToast } from "@/hooks/use-toast";

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

  // Handle content editing
  const handleInput = useCallback((e: React.FormEvent) => {
    if (!isEditing) return;

    const target = e.target as HTMLElement;
    let newContent = '';

    // Extract text from the specific element being edited
    if (target.closest('.page-content')) {
      const allPagesText = extractTextFromPaginatedHTML(editorRef.current?.innerHTML || '');
      newContent = allPagesText;
    }

    // Update content and pagination
    onContentChange(newContent);

    // Add to undo stack
    setUndoStack(prev => [...prev.slice(-19), newContent]);
    setRedoStack([]);

    // Debounced pagination update
    setTimeout(() => {
      updatePagination(newContent);
    }, 500);

  }, [isEditing, extractTextFromPaginatedHTML, onContentChange, updatePagination]);

  // Handle paste operations
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();

    if (!isEditing) {
      toast({
        title: "تحذير",
        description: "يجب تفعيل وضع التحرير أولاً",
        variant: "destructive"
      });
      return;
    }

    const pastedText = e.clipboardData.getData('text/plain');

    // Clear current content if pasting into a placeholder
    const currentContent = extractTextFromPaginatedHTML(editorRef.current?.innerHTML || '');
    if (currentContent.includes('انقر هنا لبدء الكتابة')) {
      // Replace placeholder content
      onContentChange(pastedText);
      updatePagination(pastedText);

      // Add to undo stack
      setUndoStack(prev => [...prev.slice(-19), pastedText]);
      setRedoStack([]);
    } else {
      // Append to current cursor position
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(pastedText));

        // Collapse range to end
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);

        // Update content
        const newContent = extractTextFromPaginatedHTML(editorRef.current?.innerHTML || '');
        onContentChange(newContent);
        updatePagination(newContent);

        // Add to undo stack
        setUndoStack(prev => [...prev.slice(-19), newContent]);
        setRedoStack([]);
      }
    }

    toast({
      title: "تم اللصق بنجاح ✅",
      description: `تم إدراج النص مع الترقيم التلقائي (${pastedText.split('\n').length} سطر)`,
    });
  }, [isEditing, extractTextFromPaginatedHTML, onContentChange, updatePagination, toast]);

  // Undo functionality
  const handleUndo = () => {
    if (undoStack.length > 1) {
      const current = undoStack[undoStack.length - 1];
      const previous = undoStack[undoStack.length - 2];

      setRedoStack(prev => [...prev, current]);
      setUndoStack(prev => prev.slice(0, -1));

      onContentChange(previous);
      updatePagination(previous);
    }
  };

  // Redo functionality
  const handleRedo = () => {
    if (redoStack.length > 0) {
      const next = redoStack[redoStack.length - 1];

      setUndoStack(prev => [...prev, next]);
      setRedoStack(prev => prev.slice(0, -1));

      onContentChange(next);
      updatePagination(next);
    }
  };

  // Format text
  const handleFormat = () => {
    const currentText = extractTextFromPaginatedHTML(editorRef.current?.innerHTML || '');
    updatePagination(currentText);

    toast({
      title: "تم التنسيق",
      description: "تم إعادة تنسيق النص مع ترقيم الصفحات",
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

  // Initialize pagination with sample content if empty
  useEffect(() => {
    const initialContent = content || `بسم الله الرحمن الرحيم

مشهد 1 ليل-داخلي
شقة هند في بيروت

ترقد هند على السرير وهي تنظر إلى السقف. الغرفة مضاءة بنور خافت.

هند:
(هامسة لنفسها)
لا أستطيع النوم...

انقر هنا لبدء الكتابة أو استخدم Ctrl+V للصق النص.`;

    updatePagination(initialContent);
    setUndoStack([initialContent]);

    if (!content) {
      onContentChange(initialContent);
    }
  }, [content, updatePagination, onContentChange]);

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

      {/* Paginated Editor */}
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
          minHeight: '297mm',
          background: '#f5f5f5',
          padding: '20px',
        }}
      />
    </>
  );
}