import { useState, useEffect, useRef } from 'react'
import { Play, Square, Copy, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import { format, isSameDay } from 'date-fns'
import FilterPanel from '../components/FilterPanel'
import PathPicker from '../components/PathPicker'
import { useTimeTracker } from '../context/TimeTrackerContext'
import type { FtrackNode } from '../context/TimeTrackerContext'

export default function Tracker() {
    const { logs, activeTimerId, startTimer, stopTimer, updateLog, mergeLogs, deleteLog, addLog, projects, globalSelectedEntryIds: selectedEntryIds, setGlobalSelectedEntryIds: setSelectedEntryIds } = useTimeTracker()
    const [isFilterPinned, setIsFilterPinned] = useState(true)
    const [editingPathId, setEditingPathId] = useState<string | null>(null)
    const pickerRef = useRef<HTMLDivElement>(null)

    // Handle outside click to close picker
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (editingPathId && pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setEditingPathId(null)
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [editingPathId]);

    const formatDuration = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600)
        const mins = Math.floor((seconds % 3600) / 60)
        return `${hrs}:${mins.toString().padStart(2, '0')}`
    }

    const handleMergeSelected = () => {
        if (selectedEntryIds.length < 2) return
        mergeLogs(selectedEntryIds)
        setSelectedEntryIds([])
    }

    const handleDeleteSelected = () => {
        selectedEntryIds.forEach(id => deleteLog(id))
        setSelectedEntryIds([])
    }

    const handleDuplicateSelected = () => {
        if (selectedEntryIds.length === 0) return
        const toDuplicate = logs.filter(l => selectedEntryIds.includes(l.id))
        toDuplicate.forEach(log => {
            const { id, ...rest } = log
            addLog(rest)
        })
        setSelectedEntryIds([])
    }



    // Group entries by date
    const groupedEntries = logs.reduce((acc, entry) => {
        const dateStr = format(entry.date, 'yyyy-MM-dd')
        if (!acc[dateStr]) acc[dateStr] = []
        acc[dateStr].push(entry)
        return acc
    }, {} as Record<string, typeof logs>)

    const sortedDates = Object.keys(groupedEntries).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'submitted': return <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full">Submitted</span>
            case 'approved': return <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">Approved</span>
            case 'disputed': return <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full">Disputed</span>
            case 'resolved': return <span className="bg-gray-500/20 text-gray-400 text-xs px-2 py-0.5 rounded-full">Resolved</span>
            default: return null
        }
    }

    return (
        <div className="flex h-full bg-[#21252b] p-6 max-w-7xl mx-auto w-full">
            <div className="flex flex-col flex-1 h-full min-w-0">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-semibold text-white">Time Tracker</h1>
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-4">
                        {!isFilterPinned && (
                            <FilterPanel
                                isPinned={isFilterPinned}
                                onTogglePin={() => setIsFilterPinned(!isFilterPinned)}
                                onFilterChange={(newFilters) => console.log('Filters updated:', newFilters)}
                            />
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-auto space-y-8 pb-32 pr-2">
                    {sortedDates.map(dateStr => {
                        const dayEntries = groupedEntries[dateStr]
                        const isToday = isSameDay(new Date(dateStr), new Date())
                        const totalSeconds = dayEntries.reduce((acc, curr) => acc + curr.duration, 0)

                        return (
                            <div key={dateStr} className="space-y-3">
                                <div className="flex items-center justify-between border-b border-[#3a3f4b] pb-2 px-2">
                                    <h3 className="text-[#abb2bf] font-medium">
                                        {isToday ? 'Today' : format(new Date(dateStr), 'EEEE, MMM d')}
                                    </h3>
                                    <span className="font-mono font-medium text-[#abb2bf]">
                                        Total: {formatDuration(totalSeconds)}
                                    </span>
                                </div>

                                <div className="bg-[#282c33] border border-[#3a3f4b] rounded-md shadow-sm">
                                    {(() => {
                                        const aggregatedGroups = new Map<string, typeof dayEntries>();
                                        dayEntries.forEach(entry => {
                                            const key = `${entry.project_id}|${entry.ftrack_path}|${entry.ftrack_task_name}`;
                                            if (!aggregatedGroups.has(key)) aggregatedGroups.set(key, []);
                                            aggregatedGroups.get(key)!.push(entry);
                                        });

                                        const sortedGroups = Array.from(aggregatedGroups.values()).sort((groupA, groupB) => {
                                            const latestStartA = groupA.map(e => e.start_time).filter(Boolean).sort().reverse()[0] || '';
                                            const latestStartB = groupB.map(e => e.start_time).filter(Boolean).sort().reverse()[0] || '';
                                            return latestStartB.localeCompare(latestStartA);
                                        });

                                        return sortedGroups.map((groupEntries, idx) => {
                                            const entry = groupEntries[0];
                                            const groupIds = groupEntries.map(e => e.id);
                                            const isSelected = groupIds.some(id => selectedEntryIds.includes(id));
                                            const totalDuration = groupEntries.reduce((acc, e) => acc + e.duration, 0);

                                            let earliestStart = '';
                                            let latestEnd = '';
                                            const starts = groupEntries.map(e => e.start_time).filter(Boolean).sort();
                                            if (starts.length) earliestStart = starts[0];
                                            const ends = groupEntries.map(e => e.end_time).filter(Boolean).sort().reverse();
                                            if (ends.length) latestEnd = ends[0];

                                            const isEditable = groupEntries.some(e => e.status === 'logged' || e.status === 'disputed');
                                            const displayStatus = isEditable ? 'logged' : entry.status;
                                            const isActive = groupIds.includes(activeTimerId || '');

                                            return (
                                                <div
                                                    key={entry.id}
                                                    onClick={(e) => {
                                                        const isCtrl = e.metaKey || e.ctrlKey;
                                                        if (isCtrl) {
                                                            setSelectedEntryIds(selectedEntryIds.includes(entry.id) ? selectedEntryIds.filter(i => !groupIds.includes(i)) : [...selectedEntryIds, ...groupIds]);
                                                        } else {
                                                            setSelectedEntryIds(groupIds);
                                                        }
                                                    }}
                                                    className={clsx(
                                                        "group flex items-center py-3 transition-colors hover:bg-[#2c313a] cursor-pointer",
                                                        idx !== aggregatedGroups.size - 1 && "border-b border-[#3a3f4b]",
                                                        isSelected ? "bg-[#2c313a] border-l-2 border-l-[#61afef]" : "border-l-2 border-l-transparent"
                                                    )}
                                                >
                                                    <div className="w-16 h-10 shrink-0 rounded overflow-hidden bg-[#1e2227] border border-[#3a3f4b] ml-4">
                                                        {entry.thumbnail_url ? <img src={entry.thumbnail_url} alt="" className="w-full h-full object-cover" /> : null}
                                                    </div>
                                                    {/* Project, Path & Task Name (Immediately after thumbnail) */}
                                                    <div
                                                        className={clsx(
                                                            "flex-1 min-w-[220px] shrink-0 pl-4 flex flex-col justify-center gap-0.5 relative",
                                                            isEditable && "cursor-pointer group/path rounded hover:bg-[#323641] py-1.5 transition-colors"
                                                        )}
                                                        onClick={(e) => {
                                                            if (isEditable) {
                                                                e.stopPropagation();
                                                                setEditingPathId(entry.id);
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-1.5 text-xs font-medium pl-1">
                                                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.project_color }} />
                                                            <span className="truncate text-[#98c379] max-w-[120px]" title={projects.find(p => p.id === entry.project_id)?.name || entry.project_id}>
                                                                {projects.find(p => p.id === entry.project_id)?.name || entry.project_id}
                                                            </span>
                                                            <span className="text-[#5c6370]">/</span>
                                                            <span className="truncate text-[#5294cc] flex-1" title={entry.ftrack_path}>{entry.ftrack_path}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 pl-1 mt-0.5">
                                                            <span className="text-white text-sm font-semibold truncate" title={entry.ftrack_task_name}>{entry.ftrack_task_name}</span>
                                                            {entry.ftrack_task_type && (
                                                                <span className="text-[9px] uppercase tracking-wider bg-[#1e2227] border border-[#3a3f4b] text-[#abb2bf] px-1 rounded-sm shadow-sm">{entry.ftrack_task_type}</span>
                                                            )}
                                                            {groupEntries.length > 1 && <span className="ml-1 text-[10px] bg-[#61afef] text-[#282c33] px-1.5 py-0.5 rounded-sm font-bold leading-none">{groupEntries.length}</span>}
                                                        </div>

                                                        {/* Edit Icon on Hover */}
                                                        {isEditable && (
                                                            <div className="hidden group-hover/path:flex items-center justify-center bg-[#61afef] text-[#282c33] rounded-sm px-1.5 py-0.5 ml-1 mr-1 text-[10px] font-bold uppercase tracking-wider shadow-sm absolute right-2 top-2">
                                                                Edit Path
                                                            </div>
                                                        )}

                                                        {/* Active Popover */}
                                                        {editingPathId === entry.id && (
                                                            <div
                                                                className="absolute top-full left-0 mt-2 z-50 cursor-default"
                                                                ref={pickerRef}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <PathPicker
                                                                    onClose={() => setEditingPathId(null)}
                                                                    onSelect={(node: FtrackNode, path: string[]) => {
                                                                        const projectName = path.length > 0 ? path[0] : node.name;
                                                                        const middlePath = path.length > 1 ? path.slice(1).join('/') : '...';

                                                                        // Apply path changes to all items in group
                                                                        groupIds.forEach(id => {
                                                                            updateLog(id, {
                                                                                project_id: projectName,
                                                                                ftrack_path: middlePath,
                                                                                ftrack_task_name: node.name,
                                                                                ftrack_task_type: node.task_type || '',
                                                                                thumbnail_url: node.thumbnail_url
                                                                            });
                                                                        });
                                                                        setEditingPathId(null);
                                                                    }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Tags / Billable */}
                                                    <div className="w-8 flex justify-center items-center border-l border-[#3a3f4b]">
                                                        {isEditable ? (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    groupIds.forEach(id => updateLog(id, { billable: !entry.billable }));
                                                                }}
                                                                className={clsx(
                                                                    "text-xs px-1.5 py-0.5 rounded font-medium transition-colors hover:bg-[#3a3f4b]",
                                                                    entry.billable ? "text-[#98c379]" : "text-[#5c6370] opacity-50 hover:opacity-100"
                                                                )}
                                                                title="Toggle Billable"
                                                            >
                                                                $
                                                            </button>
                                                        ) : (
                                                            entry.billable && <span className="text-xs px-1 py-0.5 text-[#98c379] rounded font-medium">$</span>
                                                        )}
                                                    </div>

                                                    {/* Bid Time View */}
                                                    <div className="w-40 pl-4 flex items-center border-l border-[#3a3f4b]">
                                                        {(() => {
                                                            if (!entry.bid_time) return <span className="text-xs text-[#5c6370] italic">No bid</span>;

                                                            const relatedLogs = logs.filter(l => l.project_id === entry.project_id && l.ftrack_path === entry.ftrack_path && l.ftrack_task_name === entry.ftrack_task_name);
                                                            const totalLoggedSecs = relatedLogs.reduce((acc, l) => acc + l.duration, 0);

                                                            const bidSecs = entry.bid_time;
                                                            const percentage = Math.min(100, Math.round((totalLoggedSecs / bidSecs) * 100));
                                                            const isOver = totalLoggedSecs > bidSecs;

                                                            const color = isOver ? '#e06c75' : '#98c379'; // Red for overbid, green for inside bid
                                                            const remainingColor = '#3a3f4b';
                                                            const bidHrs = bidSecs / 3600;

                                                            return (
                                                                <div className="flex items-center gap-2" title={`Total logged: ${formatDuration(totalLoggedSecs)} / Bid: ${formatDuration(bidSecs)}`}>
                                                                    <div
                                                                        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                                                                        style={{
                                                                            background: `conic-gradient(${color} ${percentage}%, ${remainingColor} ${percentage}%)`
                                                                        }}
                                                                    >
                                                                        <div className="w-3.5 h-3.5 bg-[#1e2227] rounded-full group-hover:bg-[#2c313a] transition-colors" />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[10px] text-[#5c6370] leading-none mb-0.5">Bid: {Math.round(bidHrs)}h</span>
                                                                        <span className={clsx("text-[11px] font-mono leading-none", isOver ? "text-[#e06c75]" : "text-[#abb2bf]")}>
                                                                            {percentage}%
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })()}
                                                    </div>

                                                    {/* Status, Time Range & Duration */}
                                                    {/* Status, Time Range & Duration */}
                                                    <div className="w-64 flex items-center justify-end gap-3 pr-6">
                                                        <div className="w-24 flex justify-end">
                                                            {isEditable ? (
                                                                <button
                                                                    className="px-2 py-0.5 text-xs font-semibold rounded bg-[#61afef] text-[#282c33] hover:bg-[#5294cc] transition-colors shadow-sm uppercase tracking-wider"
                                                                    onClick={(e) => { e.stopPropagation(); groupIds.forEach(id => updateLog(id, { status: 'submitted' })) }}
                                                                >
                                                                    Submit
                                                                </button>
                                                            ) : (
                                                                getStatusBadge(displayStatus)
                                                            )}
                                                        </div>
                                                        {earliestStart && latestEnd && (
                                                            <div className="flex flex-col items-center bg-[#1e2227] px-1.5 py-0.5 rounded border border-[#3a3f4b]">
                                                                <span className="text-[10px] leading-tight text-[#5c6370] font-mono whitespace-nowrap">{earliestStart}</span>
                                                                <span className="text-[10px] leading-tight text-[#5c6370] font-mono whitespace-nowrap">{latestEnd}</span>
                                                            </div>
                                                        )}
                                                        <span className="font-mono font-semibold text-[#e5c07b] text-lg pl-2 mr-2">{formatDuration(totalDuration)}</span>

                                                        {/* Resume button */}
                                                        {isEditable ? (
                                                            <button
                                                                className={clsx(
                                                                    "p-1.5 rounded transition-colors shadow-sm",
                                                                    isActive
                                                                        ? "text-[#e06c75] bg-[#e06c75]/10 border border-[#e06c75]/30 hover:bg-[#e06c75]/20"
                                                                        : "text-[#5c6370] bg-[#1e2227] border border-[#3a3f4b] hover:text-[#98c379] hover:bg-[#2c313a]"
                                                                )}
                                                                title={isActive ? "Stop Timer" : "Resume Task"}
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    if (isActive) {
                                                                        stopTimer()
                                                                    } else {
                                                                        startTimer(entry.id)
                                                                    }
                                                                }}
                                                            >
                                                                {isActive ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                                                            </button>
                                                        ) : (
                                                            <div
                                                                className="p-1.5 text-[#3a3f4b] rounded bg-[#1e2227]/50 border border-[#3a3f4b]/50 cursor-not-allowed"
                                                                title="Task is locked"
                                                            >
                                                                <Play size={14} fill="currentColor" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })
                                    })()}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Sticky Action Bar */}
                {selectedEntryIds.length > 0 && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#2c313a] border border-[#3a3f4b] rounded-full shadow-lg px-6 py-3 flex items-center gap-6 animate-in slide-in-from-bottom-5">
                        <span className="text-sm font-medium text-white">{selectedEntryIds.length} selected</span>

                        <div className="h-4 w-px bg-[#3a3f4b]"></div>

                        <div className="flex items-center gap-2">
                            {selectedEntryIds.length > 1 && (
                                <button
                                    onClick={handleMergeSelected}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-[#e5c07b] hover:bg-[#3a3f4b] transition-colors"
                                >
                                    Merge
                                </button>
                            )}
                            <button
                                onClick={handleDuplicateSelected}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-[#abb2bf] hover:text-white hover:bg-[#3a3f4b] transition-colors"
                            >
                                <Copy size={14} />
                                Duplicate
                            </button>
                            <button
                                onClick={handleDeleteSelected}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-[#e06c75] hover:bg-[#3a3f4b] transition-colors"
                            >
                                <Trash2 size={14} />
                                Delete
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {isFilterPinned && (
                <FilterPanel
                    isPinned={isFilterPinned}
                    onTogglePin={() => setIsFilterPinned(!isFilterPinned)}
                    onFilterChange={(newFilters) => console.log('Filters updated:', newFilters)}
                />
            )}
        </div>
    )
}
