import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlignLeft, Undo, Redo, FileText, Layers } from "lucide-react";
import { parseAndFormat, createPagedHTML } from "@/lib/screenplay-parser";
import { useToast } from "@/hooks/use-toast";
import PaginatedEditor from "./paginated-editor";

interface ScreenplayEditorProps {
  content: string;
  onContentChange: (content: string) => void;
}

export default function ScreenplayEditor({ content, onContentChange }: ScreenplayEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'simple' | 'paginated'>('paginated');
  const { toast } = useToast();

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      // Extract text content with proper line breaks
      const newContent = extractTextFromDiv(editorRef.current);
      onContentChange(newContent);
      
      // Add to undo stack
      setUndoStack(prev => [...prev.slice(-19), newContent]);
      setRedoStack([]);
      
      // Apply real-time formatting with debounce
      setTimeout(() => {
        if (editorRef.current) {
          const textToFormat = extractTextFromDiv(editorRef.current);
          console.log('Text to format:', JSON.stringify(textToFormat));
          const formatted = parseAndFormat(textToFormat);
          console.log('Formatted HTML:', formatted);
          
          if (editorRef.current.innerHTML !== formatted) {
            // Save cursor position
            const selection = window.getSelection();
            const range = selection?.getRangeAt(0);
            const startOffset = range?.startOffset || 0;
            
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
      }, 500);
    }
  }, [onContentChange]);

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
    const formatted = parseAndFormat(text);
    
    if (editorRef.current) {
      // Clear existing content and insert formatted content
      editorRef.current.innerHTML = formatted;
      onContentChange(text);
      
      toast({
        title: "تم اللصق",
        description: "تم تنسيق النص تلقائياً",
      });
    }
  }, [onContentChange, toast]);

  const handleUndo = () => {
    if (undoStack.length > 1) {
      const current = undoStack[undoStack.length - 1];
      const previous = undoStack[undoStack.length - 2];
      
      setRedoStack(prev => [...prev, current]);
      setUndoStack(prev => prev.slice(0, -1));
      
      if (editorRef.current) {
        const formatted = parseAndFormat(previous);
        editorRef.current.innerHTML = formatted;
        onContentChange(previous);
      }
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0) {
      const next = redoStack[redoStack.length - 1];
      
      setUndoStack(prev => [...prev, next]);
      setRedoStack(prev => prev.slice(0, -1));
      
      if (editorRef.current) {
        const formatted = parseAndFormat(next);
        editorRef.current.innerHTML = formatted;
        onContentChange(next);
      }
    }
  };

  const handleFormat = () => {
    if (editorRef.current) {
      const text = editorRef.current.textContent || "";
      const formatted = parseAndFormat(text);
      editorRef.current.innerHTML = formatted;
      
      toast({
        title: "تم التنسيق",
        description: "تم إعادة تنسيق النص بنجاح",
      });
    }
  };

  // Real-time formatting with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (editorRef.current && content) {
        const formatted = parseAndFormat(content);
        if (editorRef.current.innerHTML !== formatted) {
          editorRef.current.innerHTML = formatted;
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [content]);

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'simple' ? 'paginated' : 'simple');
    toast({
      title: "تم تغيير وضع العرض",
      description: viewMode === 'simple' ? "تم التبديل إلى وضع الصفحات" : "تم التبديل إلى الوضع البسيط",
    });
  };

  // Render paginated editor if in paginated mode
  if (viewMode === 'paginated') {
    return (
      <>
        {/* View Mode Toggle */}
        <div className="toolbar flex items-center justify-between">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleViewMode}
              data-testid="button-view-mode"
            >
              <Layers className="w-4 h-4" />
              <span className="mr-2">وضع الصفحات</span>
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            نظام الصفحات المتقدم مُفعَّل
          </div>
        </div>
        <PaginatedEditor content={content} onContentChange={onContentChange} />
      </>
    );
  }

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
            <FileText className="w-4 h-4" />
            <span className="mr-2">الوضع البسيط</span>
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
        <div className="text-sm text-muted-foreground">
          تنسيق تلقائي مُفعَّل
        </div>
      </div>

      {/* Main Editor */}
      <div 
        ref={editorRef}
        className="editor-container screenplay-container"
        contentEditable="true"
        onInput={handleInput}
        onPaste={handlePaste}
        data-testid="editor-main"
        suppressContentEditableWarning={true}
        dangerouslySetInnerHTML={{
          __html: parseAndFormat(`بسم الله الرحمن الرحيم

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
