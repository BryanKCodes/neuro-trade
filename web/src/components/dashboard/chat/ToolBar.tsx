"use client";

import { useState, useRef, useEffect } from "react";
import { FiPlus, FiX } from "react-icons/fi";
import Dropdown, { Tool } from "@/components/dashboard/chat/Dropdown";

type ToolBarProps = {
  availableTools: Tool[];
  selectedTools: string[];
  onToolSelect: (toolName: string) => void;
  onToolDeselect: (toolName: string) => void;
};

const ToolBar = ({
  availableTools,
  selectedTools,
  onToolSelect,
  onToolDeselect,
}: ToolBarProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (toolName: string) => {
    onToolSelect(toolName);
    setIsMenuOpen(false);
  };

  return (
    <div className="relative flex items-center gap-2" ref={toolbarRef}>
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        disabled={selectedTools.length >= availableTools.length}
        className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-colors 
                   bg-gray-200 dark:bg-neutral-700 text-gray-600 dark:text-neutral-200 
                   hover:bg-gray-300 dark:hover:bg-neutral-600
                   disabled:bg-gray-200 dark:disabled:bg-neutral-700/50 
                   disabled:text-gray-400 dark:disabled:text-neutral-500
                   disabled:cursor-not-allowed"
        aria-label="Add tool"
      >
        <FiPlus className="w-4 h-4" />
      </button>

      {selectedTools.map((toolName) => {
        const tool = availableTools.find((t) => t.name === toolName);
        if (!tool) return null;

        return (
          <div
            key={tool.name}
            className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-sm"
          >
            {tool.icon}
            <span>{tool.name}</span>
            <button
              onClick={() => onToolDeselect(tool.name)}
              className="w-5 h-5 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800/60"
              aria-label={`Remove ${tool.name}`}
            >
              <FiX className="w-3 h-3" />
            </button>
          </div>
        );
      })}
      
      {isMenuOpen && (
        <Dropdown
          tools={availableTools}
          onSelect={handleSelect}
          selectedTools={selectedTools}
        />
      )}
    </div>
  );
};

export default ToolBar;
