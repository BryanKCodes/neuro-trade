"use client";

import { useState } from "react";
import React from "react";

export type Tool = {
  name: string;
  icon: React.ReactNode;
  description: string | null;
};

const ToolItem = ({
  tool,
  onSelect,
}: {
  tool: Tool;
  onSelect: (toolName: string) => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      key={tool.name}
      onClick={() => onSelect(tool.name)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative flex items-center gap-2 p-2 text-sm text-black dark:text-white rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-700"
    >
      {tool.icon}
      <span>{tool.name}</span>

      {isHovered && tool.description && (
        <div
          className="absolute left-full top-0 bottom-0 ml-2 p-2 w-56 text-xs 
                     flex items-center
                     text-gray-600 dark:text-neutral-300 bg-gray-50 dark:bg-neutral-900 
                     rounded-md border border-gray-200 dark:border-neutral-700 z-1"
        >
          {tool.description}
        </div>
      )}
    </div>
  );
};

type DropdownProps = {
  tools: Tool[];
  onSelect: (toolName: string) => void;
  selectedTools: string[];
};

const Dropdown = ({ tools, onSelect, selectedTools }: DropdownProps) => {
  const availableTools = tools.filter(
    (tool) => !selectedTools.includes(tool.name)
  );

  if (availableTools.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg shadow-xl p-2">
      <div>
        {availableTools.map((tool) => (
          <ToolItem
            key={tool.name}
            tool={tool}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
};

export default Dropdown;
