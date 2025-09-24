import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlignLeft, Undo, Redo, FileText, Layers } from "lucide-react";
import { parseAndFormat, createPagedHTML } from "@/lib/screenplay-parser";
import { textFlowMonitor } from "@/lib/text-flow-monitor";
import { useToast } from "@/hooks/use-toast";

interface UnifiedEditorProps {
  content: string;
  onContentChange: (content: string) => void;
}

export default function UnifiedEditor({ content, onContentChange }: UnifiedEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'simple' | 'paginated'>('paginated');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

  // Extract text content from contentEditable div
  const extractTextFromDiv = useCallback((div: HTMLDivElement): string => {
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
  }, []);

  // Calculate pagination info with A4 specifications
  const calculatePagination = useCallback((text: string) => {
    const lines = text.split('\n');
    let currentPageLines = 0;
    let pages = 1;
    const maxLinesPerPage = 45; // Approximate lines per A4 page with 1in margins
    
    for (const line of lines) {
      let lineHeight = 1;
      
      // Estimate line height based on content type
      if (line.match(/^(مشهد|م\.)\s*(\d+)/i)) {
        lineHeight = 3; // Scene headers take more space
      } else if (line.match(/^[أ-ي\s]+:$/)) {
        lineHeight = 2; // Character names with dialogue
      } else if (!line.trim()) {
        lineHeight = 1; // Empty lines
      }
      
      if (currentPageLines + lineHeight > maxLinesPerPage) {
        pages++;
        currentPageLines = lineHeight;
      } else {
        currentPageLines += lineHeight;
      }
    }
    
    setTotalPages(Math.max(1, pages));
  }, []);

  // Handle input with immediate formatting (no setTimeout)
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const newContent = extractTextFromDiv(editorRef.current);
      onContentChange(newContent);
      
      // Add to undo stack
      setUndoStack(prev => [...prev.slice(-19), newContent]);
      setRedoStack([]);
      
      // Calculate pagination
      calculatePagination(newContent);
      
      // Apply formatting immediately
      const textToFormat = extractTextFromDiv(editorRef.current);
      const formatted = viewMode === 'paginated' ? createPagedHTML(textToFormat) : parseAndFormat(textToFormat);
      
      if (editorRef.current.innerHTML !== formatted) {
        // Save cursor position
        const selection = window.getSelection();
        let cursorPosition = 0;
        
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          cursorPosition = range.startOffset;
        }
        
        editorRef.current.innerHTML = formatted;
        
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
  }, [onContentChange, extractTextFromDiv, calculatePagination, viewMode]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const formatted = viewMode === 'paginated' ? createPagedHTML(text) : parseAndFormat(text);
    
    if (editorRef.current) {
      editorRef.current.innerHTML = formatted;
      onContentChange(text);
      calculatePagination(text);
      
      toast({
        title: "تم اللصق",
        description: `تم تنسيق النص تلقائياً في ${viewMode === 'paginated' ? 'وضع الصفحات A4' : 'الوضع البسيط'}`,
      });
    }
  }, [onContentChange, calculatePagination, viewMode, toast]);

  const handleUndo = () => {
    if (undoStack.length > 1) {
      const current = undoStack[undoStack.length - 1];
      const previous = undoStack[undoStack.length - 2];
      
      setRedoStack(prev => [...prev, current]);
      setUndoStack(prev => prev.slice(0, -1));
      
      if (editorRef.current) {
        const formatted = viewMode === 'paginated' ? createPagedHTML(previous) : parseAndFormat(previous);
        editorRef.current.innerHTML = formatted;
        onContentChange(previous);
        calculatePagination(previous);
      }
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0) {
      const next = redoStack[redoStack.length - 1];
      
      setUndoStack(prev => [...prev, next]);
      setRedoStack(prev => prev.slice(0, -1));
      
      if (editorRef.current) {
        const formatted = viewMode === 'paginated' ? createPagedHTML(next) : parseAndFormat(next);
        editorRef.current.innerHTML = formatted;
        onContentChange(next);
        calculatePagination(next);
      }
    }
  };

  const handleFormat = () => {
    if (editorRef.current) {
      const text = editorRef.current.textContent || "";
      const formatted = viewMode === 'paginated' ? createPagedHTML(text) : parseAndFormat(text);
      editorRef.current.innerHTML = formatted;
      calculatePagination(text);
      
      // Restart monitoring after formatting
      if (viewMode === 'paginated') {
        setTimeout(() => {
          textFlowMonitor.startMonitoring(editorRef.current!, (pageNumber) => {
            setTotalPages(prev => Math.max(prev, pageNumber + 1));
          });
        }, 100);
      }
      
      toast({
        title: "تم التنسيق",
        description: `تم إعادة تنسيق النص في ${viewMode === 'paginated' ? 'وضع الصفحات A4' : 'الوضع البسيط'}`,
      });
    }
  };

  const toggleViewMode = () => {
    const newMode = viewMode === 'simple' ? 'paginated' : 'simple';
    setViewMode(newMode);
    
    // Stop current monitoring
    textFlowMonitor.stopMonitoring();
    
    // Re-format content in new mode
    if (editorRef.current) {
      const text = editorRef.current.textContent || "";
      const formatted = newMode === 'paginated' ? createPagedHTML(text) : parseAndFormat(text);
      editorRef.current.innerHTML = formatted;
      
      // Start monitoring for paginated mode
      if (newMode === 'paginated') {
        setTimeout(() => {
          textFlowMonitor.startMonitoring(editorRef.current!, (pageNumber) => {
            console.log(`Page ${pageNumber} overflow detected - creating new page`);
            setTotalPages(prev => Math.max(prev, pageNumber + 1));
          });
        }, 100);
      }
    }
    
    toast({
      title: "تم تغيير وضع العرض",
      description: newMode === 'paginated' ? "تم التبديل إلى وضع الصفحات A4" : "تم التبديل إلى الوضع البسيط",
    });
  };

  // Initialize with sample content and start text flow monitoring
  useEffect(() => {
    if (editorRef.current && content) {
      const formatted = viewMode === 'paginated' ? createPagedHTML(content) : parseAndFormat(content);
      if (editorRef.current.innerHTML !== formatted) {
        editorRef.current.innerHTML = formatted;
      }
      calculatePagination(content);
      
      // Start text flow monitoring for paginated mode
      if (viewMode === 'paginated') {
        textFlowMonitor.startMonitoring(editorRef.current, (pageNumber) => {
          console.log(`Page ${pageNumber} overflow detected - creating new page`);
          setTotalPages(prev => Math.max(prev, pageNumber + 1));
        });
      }
    }
    
    // Cleanup monitoring on unmount
    return () => {
      textFlowMonitor.stopMonitoring();
    };
  }, [content, viewMode, calculatePagination]);

  return (
    <>
      {/* Toolbar */}
      <div className="toolbar flex items-center justify-between">
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleViewMode}
            data-testid="button-view-mode"
          >
            {viewMode === 'paginated' ? <Layers className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            <span className="mr-2">
              {viewMode === 'paginated' ? 'وضع الصفحات' : 'الوضع البسيط'}
            </span>
          </Button>
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
          {viewMode === 'paginated' && (
            <span>صفحة {currentPage} من {totalPages} (A4)</span>
          )}
          <span>محرك الترحيل التلقائي مُفعَّل</span>
        </div>
      </div>

      {/* Main Editor */}
      <div 
        ref={editorRef}
        className={`editor-container screenplay-container ${viewMode === 'simple' ? 'simple-mode' : ''}`}
        contentEditable="true"
        onInput={handleInput}
        onPaste={handlePaste}
        data-testid="editor-main"
        suppressContentEditableWarning={true}
        dangerouslySetInnerHTML={{
          __html: viewMode === 'paginated' ? createPagedHTML(`بسم الله الرحمن الرحيم

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
أحمد! هنا!`) : parseAndFormat(`بسم الله الرحمن الرحيم

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