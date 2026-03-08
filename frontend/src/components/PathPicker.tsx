import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, Layers, File, Target, Image as ImageIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { useTimeTracker } from '../context/TimeTrackerContext';
import type { FtrackNode } from '../context/TimeTrackerContext';

interface PathPickerProps {
    onSelect: (taskNode: FtrackNode, path: string[]) => void;
    onClose?: () => void;
}

const TreeNode: React.FC<{
    node: FtrackNode;
    path: string[];
    onSelect: (node: FtrackNode, path: string[]) => void;
}> = ({ node, path, onSelect }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasChildren = node.children && node.children.length > 0;
    const isLeaf = !hasChildren && node.type === 'task';

    const getIcon = () => {
        switch (node.type) {
            case 'project': return <Layers size={14} className="text-[#61afef]" />;
            case 'folder': return <Folder size={14} className="text-[#e5c07b]" />;
            case 'sequence': return <Folder size={14} className="text-[#c678dd]" />;
            case 'shot': return <File size={14} className="text-[#98c379]" />;
            case 'task': return <Target size={14} className="text-[#56b6c2]" />;
            default: return <Folder size={14} className="text-[#abb2bf]" />;
        }
    };

    const handleRowClick = () => {
        if (hasChildren) {
            setIsExpanded(!isExpanded);
        } else if (isLeaf) {
            onSelect(node, path);
        }
    };

    return (
        <div className="select-none">
            <div
                className={clsx(
                    "flex items-center gap-1.5 py-1.5 px-2 hover:bg-[#2c313a] rounded cursor-pointer transition-colors",
                    isLeaf && "hover:bg-[#3a3f4b]"
                )}
                onClick={handleRowClick}
            >
                {/* Expand/Collapse Chevron */}
                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                    {hasChildren && (
                        isExpanded ? <ChevronDown size={14} className="text-[#5c6370]" /> : <ChevronRight size={14} className="text-[#5c6370]" />
                    )}
                </div>

                {/* Node Icon */}
                <div className="flex items-center justify-center shrink-0">
                    {getIcon()}
                </div>

                {/* Thumbnail for Leaf Nodes (Tasks) */}
                {isLeaf && (
                    <div className="w-6 h-4 shrink-0 rounded overflow-hidden bg-[#1e2227] border border-[#3a3f4b] ml-1 flex flex-col items-center justify-center relative">
                        {node.thumbnail_url ? (
                            <img src={node.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <ImageIcon size={10} className="text-[#5c6370]" />
                        )}
                    </div>
                )}

                {/* Node Name */}
                <span className={clsx(
                    "text-sm truncate select-none",
                    isLeaf ? "text-[#abb2bf] font-medium" : "text-[#d1d5da]"
                )}>
                    {node.name}
                </span>

                {/* Task Type Badge */}
                {node.task_type && (
                    <span className="ml-auto text-[10px] bg-[#2c313a] text-[#5c6370] px-1.5 rounded border border-[#3a3f4b]">
                        {node.task_type}
                    </span>
                )}
            </div>

            {/* Children Render */}
            {hasChildren && isExpanded && (
                <div className="ml-4 border-l border-[#3a3f4b]/50 pl-2 mt-0.5 space-y-0.5">
                    {node.children!.map((child) => (
                        <TreeNode key={child.id} node={child} path={[...path, node.name]} onSelect={onSelect} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default function PathPicker({ onSelect, onClose }: PathPickerProps) {
    const { hierarchy } = useTimeTracker();

    return (
        <div className="w-[350px] bg-[#21252b] border border-[#3a3f4b] rounded-md shadow-2xl flex flex-col max-h-[400px]">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#3a3f4b] bg-[#282c33] rounded-t-md">
                <span className="text-sm font-semibold text-white">Select Path</span>
                {onClose && (
                    <button onClick={onClose} className="text-[#abb2bf] hover:text-white text-xs">
                        Close
                    </button>
                )}
            </div>

            {/* Search Input Mock */}
            <div className="p-2 border-b border-[#3a3f4b]">
                <input
                    type="text"
                    placeholder="Search tasks..."
                    className="w-full bg-[#1e2227] border border-[#3a3f4b] rounded px-3 py-1.5 text-sm text-[#abb2bf] focus:outline-none focus:border-[#61afef]"
                />
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {hierarchy.map(rootNode => (
                    <TreeNode key={rootNode.id} node={rootNode} path={[]} onSelect={onSelect} />
                ))}
            </div>
        </div>
    );
}
