import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlignLeft, Undo, Redo } from "lucide-react";
import { parseAndFormat, createPagedHTML } from "@/lib/screenplay-parser";
import { useToast } from "@/hooks/use-toast";

interface PaginatedEditorProps {
  content: string;
  onContentChange: (content: string) => void;
}

export default function PaginatedEditor({ content, onContentChange }: PaginatedEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

  // Dynamic pagination engine
  const paginateContent = useCallback((text: string) => {
    if (!text) return { pages: [], totalPages: 1 };
    
    const lines = text.split('\n');
    const pages: string[][] = [];
    let currentPageLines: string[] = [];
    let currentPageHeight = 0;
    const maxPageHeight = 50; // Approximate lines per page
    
    for (const line of lines) {
      // Estimate line height based on content type
      let lineHeight = 1;
      
      // Scene headers take more space
      if (line.match(/^(مشهد|م\.)\\s*\\d+/i)) {
        lineHeight = 3;
      }
      // Dialogue blocks take more space
      else if (line.match(/^[أ-ي\\s]+:$/)) {
        lineHeight = 2;
      }
      // Empty lines
      else if (!line.trim()) {
        lineHeight = 1;
      }
      
      // Check if adding this line would exceed page height
      if (currentPageHeight + lineHeight > maxPageHeight && currentPageLines.length > 0) {
        pages.push([...currentPageLines]);
        currentPageLines = [line];
        currentPageHeight = lineHeight;
      } else {
        currentPageLines.push(line);
        currentPageHeight += lineHeight;
      }
    }
    
    // Add the last page if it has content
    if (currentPageLines.length > 0) {
      pages.push(currentPageLines);
    }
    
    return {
      pages: pages.map(pageLines => pageLines.join('\n')),
      totalPages: Math.max(1, pages.length)
    };
  }, []);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const newContent = extractTextFromDiv(editorRef.current);
      onContentChange(newContent);
      
      // Add to undo stack
      setUndoStack(prev => [...prev.slice(-19), newContent]);
      setRedoStack([]);
      
      // Update pagination
      const { totalPages } = paginateContent(newContent);
      setTotalPages(totalPages);
      
      // Apply real-time formatting with debounce
      setTimeout(() => {
        if (editorRef.current) {
          const textToFormat = extractTextFromDiv(editorRef.current);
          const pagedHTML = createPagedHTML(textToFormat);
          
          if (editorRef.current.innerHTML !== pagedHTML) {
            // Save cursor position
            const selection = window.getSelection();
            const range = selection?.getRangeAt(0);
            
            editorRef.current.innerHTML = pagedHTML;
            
            // Try to restore cursor position
            try {
              if (selection && editorRef.current.lastChild) {
                const newRange = document.createRange();
                const lastNode = editorRef.current.lastChild;
                newRange.setStartAfter(lastNode);
                newRange.setEndAfter(lastNode);
                selection.removeAllRanges();
                selection.addRange(newRange);
              }
            } catch (e) {
              // Ignore cursor positioning errors
            }
          }
        }
      }, 500);
    }
  }, [onContentChange, paginateContent]);

  // Helper function to extract text with proper line breaks
  const extractTextFromDiv = (div: HTMLDivElement): string => {
    const extractTextRecursively = (node: Node): string => {
      let text = '';
      
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const tagName = element.tagName.toLowerCase();
        
        // Block elements should create new lines
        const isBlockElement = ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName);
        
        if (tagName === 'br') {
          return '\n';
        }
        
        // For block elements, add newline before content if needed
        if (isBlockElement && text && !text.endsWith('\n')) {
          text += '\n';
        }
        
        // Process child nodes
        for (const child of Array.from(node.childNodes)) {
          text += extractTextRecursively(child);
        }
        
        // For block elements, add newline after content
        if (isBlockElement && !text.endsWith('\n')) {
          text += '\n';
        }
      }
      
      return text;
    };
    
    let result = '';
    for (const child of Array.from(div.childNodes)) {
      result += extractTextRecursively(child);
    }
    
    // Clean up extra newlines but preserve intentional line breaks
    return result.replace(/\n{3,}/g, '\n\n').trim();
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const pagedHTML = createPagedHTML(text);
    
    if (editorRef.current) {
      editorRef.current.innerHTML = pagedHTML;
      onContentChange(text);
      
      // Update pagination
      const { totalPages } = paginateContent(text);
      setTotalPages(totalPages);
      
      toast({
        title: "تم اللصق",
        description: "تم تنسيق النص تلقائياً مع نظام الصفحات",
      });
    }
  }, [onContentChange, paginateContent, toast]);

  const handleUndo = () => {
    if (undoStack.length > 1) {
      const current = undoStack[undoStack.length - 1];
      const previous = undoStack[undoStack.length - 2];
      
      setRedoStack(prev => [...prev, current]);
      setUndoStack(prev => prev.slice(0, -1));
      
      if (editorRef.current) {
        const pagedHTML = createPagedHTML(previous);
        editorRef.current.innerHTML = pagedHTML;
        onContentChange(previous);
        
        const { totalPages } = paginateContent(previous);
        setTotalPages(totalPages);
      }
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0) {
      const next = redoStack[redoStack.length - 1];
      
      setUndoStack(prev => [...prev, next]);
      setRedoStack(prev => prev.slice(0, -1));
      
      if (editorRef.current) {
        const pagedHTML = createPagedHTML(next);
        editorRef.current.innerHTML = pagedHTML;
        onContentChange(next);
        
        const { totalPages } = paginateContent(next);
        setTotalPages(totalPages);
      }
    }
  };

  const handleFormat = () => {
    if (editorRef.current) {
      const text = editorRef.current.textContent || "";
      const pagedHTML = createPagedHTML(text);
      editorRef.current.innerHTML = pagedHTML;
      
      const { totalPages } = paginateContent(text);
      setTotalPages(totalPages);
      
      toast({
        title: "تم التنسيق",
        description: "تم إعادة تنسيق النص مع نظام الصفحات المتقدم",
      });
    }
  };

  // Initialize with sample content
  useEffect(() => {
    if (editorRef.current && content) {
      const pagedHTML = createPagedHTML(content);
      if (editorRef.current.innerHTML !== pagedHTML) {
        editorRef.current.innerHTML = pagedHTML;
      }
      
      const { totalPages } = paginateContent(content);
      setTotalPages(totalPages);
    }
  }, [content, paginateContent]);

  return (
    <>
      {/* Toolbar */}
      <div className="toolbar flex items-center justify-between">
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleFormat}
            data-testid="button-format"
          >
            <AlignLeft className="w-4 h-4" />
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
        <div className="flex items-center space-x-4 space-x-reverse text-sm text-muted-foreground">
          <span>صفحة {currentPage} من {totalPages}</span>
          <span>تنسيق تلقائي مُفعَّل</span>
        </div>
      </div>

      {/* Main Paginated Editor */}
      <div 
        ref={editorRef}
        className="editor-container screenplay-container"
        contentEditable="true"
        onInput={handleInput}
        onPaste={handlePaste}
        data-testid="editor-main"
        suppressContentEditableWarning={true}
        dangerouslySetInnerHTML={{
          __html: createPagedHTML(`بسم الله الرحمن الرحيم

مشهد 1 - خارجي - نهار
شارع في وسط المدينة

يسير أحمد في شارع مزدحم، يحمل حقيبة صغيرة ويبدو عليه القلق. السيارات تمر بسرعة والناس يتحركون في جميع الاتجاهات. يتوقف أمام مقهى صغير ويتردد للحظة.

أحمد:
(يتحدث إلى نفسه)
هل هذا هو المكان الصحيح؟ يجب أن أتأكد من العنوان مرة أخرى.

يخرج هاتفه المحمول ويتحقق من الرسالة النصية. يبتسم ويدخل المقهى بثقة أكبر.

قطع إلى:

مشهد 2 - داخلي - نهار
داخل المقهى

المقهى دافئ ومريح، مليء بالأشخاص الذين يعملون على أجهزة الكمبيوتر المحمولة أو يتناولون القهوة مع الأصدقاء. أحمد يبحث بعينيه عن شخص محدد.

فاطمة:
(تلوح له من الطاولة البعيدة)
أحمد! هنا!`)
        }}
      />
    </>
  );
}