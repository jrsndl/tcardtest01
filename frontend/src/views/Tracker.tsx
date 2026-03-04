import { useState } from 'react'
import { Play, Copy, Trash2, Plus } from 'lucide-react'
import { clsx } from 'clsx'
import { format, isSameDay } from 'date-fns'
import FilterPanel from '../components/FilterPanel'
import { useTimeTracker } from '../context/TimeTrackerContext'

export default function Tracker() {
    const { logs, mergeLogs, deleteLog } = useTimeTracker()
    const [isFilterPinned, setIsFilterPinned] = useState(true)
    const [viewMode, setViewMode] = useState<'simple' | 'calendar'>('simple')
    const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([])
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)

    const formatDuration = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600)
        const mins = Math.floor((seconds % 3600) / 60)
        return `${hrs}:${mins.toString().padStart(2, '0')}`
    }

    const handleMergeSelected = () => {
        if (selectedEntryIds.length < 2) return
        mergeLogs(selectedEntryIds)
        setSelectedEntryIds([])
        setLastSelectedId(null)
    }

    const handleDeleteSelected = () => {
        selectedEntryIds.forEach(id => deleteLog(id))
        setSelectedEntryIds([])
        setLastSelectedId(null)
    }

    const handleDuplicateSelected = () => {
        // Implement complex duplicate in Context if needed, for now just clear
        setSelectedEntryIds([])
        setLastSelectedId(null)
    }

    const handleRowClick = (e: React.MouseEvent, id: string) => {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
        const isCtrl = isMac ? e.metaKey : e.ctrlKey

        if (e.shiftKey && lastSelectedId !== null) {
            // Shift select: find range
            const allIds = sortedDates.flatMap(dateStr => groupedEntries[dateStr].map(e => e.id))
            const startIdx = allIds.indexOf(lastSelectedId)
            const endIdx = allIds.indexOf(id)

            if (startIdx !== -1 && endIdx !== -1) {
                const minIdx = Math.min(startIdx, endIdx)
                const maxIdx = Math.max(startIdx, endIdx)
                const rangeIds = allIds.slice(minIdx, maxIdx + 1)

                if (isCtrl) {
                    // Add range to existing selection
                    setSelectedEntryIds(prev => Array.from(new Set([...prev, ...rangeIds])))
                } else {
                    // Replace selection
                    setSelectedEntryIds(rangeIds)
                }
            }
        } else if (isCtrl) {
            // Ctrl/Cmd select: toggle individual
            setSelectedEntryIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
            setLastSelectedId(id)
        } else {
            // Normal click: select single
            setSelectedEntryIds([id])
            setLastSelectedId(id)
        }
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
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#61afef] hover:bg-[#5294cc] text-[#282c34] font-medium text-sm transition-colors shadow-sm">
                            <Plus size={16} />
                            Log Time
                        </button>
                    </div>

                    {/* View Toggle & Filters */}
                    <div className="flex items-center gap-4">
                        <select
                            value={viewMode}
                            onChange={(e) => setViewMode(e.target.value as any)}
                            className="bg-[#282c33] border border-[#3a3f4b] text-[#abb2bf] text-sm rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#61afef]"
                        >
                            <option value="simple">Simple View</option>
                            <option value="calendar">Calendar View</option>
                        </select>

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

                                <div className="bg-[#282c33] border border-[#3a3f4b] rounded-md overflow-hidden shadow-sm">
                                    {dayEntries.map((entry, idx) => (
                                        <div
                                            key={entry.id}
                                            onClick={(e) => handleRowClick(e, entry.id)}
                                            className={clsx(
                                                "group flex items-center py-3 transition-colors hover:bg-[#2c313a] cursor-pointer",
                                                idx !== dayEntries.length - 1 && "border-b border-[#3a3f4b]",
                                                selectedEntryIds.includes(entry.id) ? "bg-[#2c313a] border-l-2 border-l-[#61afef]" : "border-l-2 border-l-transparent"
                                            )}
                                        >
                                            {/* Thumbnail */}
                                            <div className="w-16 h-10 shrink-0 rounded overflow-hidden bg-[#1e2227] border border-[#3a3f4b] ml-4">
                                                {entry.thumbnail_url && <img src={entry.thumbnail_url} alt="" className="w-full h-full object-cover" />}
                                            </div>

                                            {/* Description */}
                                            <div className="flex-1 min-w-0 px-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-white truncate font-medium">{entry.description || '(No description)'}</span>
                                                </div>
                                            </div>

                                            {/* Project, Path & Task Name */}
                                            <div className="w-[340px] shrink-0 flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.project_color }} />
                                                <span className="text-sm truncate text-[#98c379] max-w-[100px]" title={entry.project_id}>{entry.project_id}</span>
                                                <span className="text-[#5c6370] mx-0.5">•</span>
                                                <span className="text-sm truncate text-[#5294cc] max-w-[100px]" title={entry.ftrack_path}>{entry.ftrack_path}</span>
                                                <span className="text-[#5c6370] mx-0.5">•</span>
                                                <span className="text-sm truncate text-[#abb2bf] flex-1" title={entry.ftrack_task_name}>{entry.ftrack_task_name}</span>
                                            </div>

                                            {/* Bid Time */}
                                            <div className="w-28 pl-4 flex items-center border-l border-[#3a3f4b]">
                                                {entry.bid_time ? (
                                                    <span className="text-xs text-[#5c6370]">Bid: <span className="text-[#abb2bf] font-mono">{formatDuration(entry.bid_time)}</span></span>
                                                ) : (
                                                    <span className="text-xs text-[#5c6370] italic">No bid</span>
                                                )}
                                            </div>

                                            {/* Tags / Billable */}
                                            <div className="w-24 pl-4 flex items-center justify-center border-l border-[#3a3f4b]">
                                                {entry.billable && <span className="text-xs px-1.5 py-0.5 border border-[#98c379] text-[#98c379] rounded font-medium">$</span>}
                                            </div>

                                            {/* Status, Time Range & Duration */}
                                            <div className="w-64 flex items-center justify-end gap-3 pr-6">
                                                {getStatusBadge(entry.status)}
                                                {viewMode === 'calendar' && entry.start_time && entry.end_time && (
                                                    <span className="text-xs text-[#5c6370] bg-[#1e2227] px-2 py-1 rounded border border-[#3a3f4b] font-mono">
                                                        {entry.start_time} - {entry.end_time}
                                                    </span>
                                                )}
                                                <span className="font-mono font-semibold text-[#e5c07b] text-lg pl-2 mr-4">{formatDuration(entry.duration)}</span>

                                                {/* Resume button (Subdued but always visible) */}
                                                <button
                                                    className="p-1.5 text-[#5c6370] hover:text-[#98c379] rounded bg-[#1e2227] border border-[#3a3f4b] hover:bg-[#2c313a] transition-colors shadow-sm"
                                                    title="Resume Task"
                                                    onClick={(e) => { e.stopPropagation(); console.log('Resume', entry.id) }}
                                                >
                                                    <Play size={14} fill="currentColor" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
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
