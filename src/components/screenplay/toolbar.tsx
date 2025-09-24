import { Button } from "@/components/ui/button";
import { AlignLeft, Undo, Redo } from "lucide-react";

interface ToolbarProps {
  onFormat: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export default function Toolbar({ onFormat, onUndo, onRedo, canUndo, canRedo }: ToolbarProps) {
  return (
    <div className="toolbar flex items-center justify-between">
      <div className="flex items-center space-x-2 space-x-reverse">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onFormat}
          data-testid="button-toolbar-format"
        >
          <AlignLeft className="w-4 h-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onUndo}
          disabled={!canUndo}
          data-testid="button-toolbar-undo"
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onRedo}
          disabled={!canRedo}
          data-testid="button-toolbar-redo"
        >
          <Redo className="w-4 h-4" />
        </Button>
      </div>
      <div className="text-sm text-muted-foreground">
        تنسيق تلقائي مُفعَّل
      </div>
    </div>
  );
}
