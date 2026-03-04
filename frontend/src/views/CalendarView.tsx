import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, GitMerge, Trash2 } from 'lucide-react'
import { format, addDays, startOfWeek, endOfWeek, subDays, subWeeks, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns'
import { clsx } from 'clsx'
import { useTimeTracker } from '../context/TimeTrackerContext'

export default function CalendarView() {
    const today = new Date()
    const { logs, updateLog, addLog, deleteLog, mergeLogs } = useTimeTracker()

    const [dateIn, setDateIn] = useState(startOfWeek(today, { weekStartsOn: 1 }))
    const [dateOut, setDateOut] = useState(endOfWeek(today, { weekStartsOn: 1 }))
    const [activeRange, setActiveRange] = useState('This Week')
    const [selectedIds, setSelectedIds] = useState<string[]>([])

    // Drag Select State
    const [dragSelect, setDragSelect] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null)
    const [dragCreate, setDragCreate] = useState<{ dayIdx: number, startDecimal: number, currentDecimal: number } | null>(null)
    const [showCreateDialog, setShowCreateDialog] = useState<{ dayIdx: number, startDecimal: number, endDecimal: number } | null>(null)
    const gridRef = useRef<HTMLDivElement>(null)

    // Resize State
    const [resizingEvent, setResizingEvent] = useState<{ id: string, edge: 'top' | 'bottom', initialY: number, initialDecimal: number, initialDuration: number } | null>(null)

    const PIXELS_PER_HOUR = 80
    const hoursInDay = Array.from({ length: 24 }).map((_, i) => i)

    const daysInterval = eachDayOfInterval({ start: dateIn, end: dateOut })

    const setQuickDate = (range: string) => {
        setActiveRange(range)
        const t = new Date()
        switch (range) {
            case 'Today':
                setDateIn(t)
                setDateOut(t)
                break
            case 'Yesterday': {
                const y = subDays(t, 1)
                setDateIn(y)
                setDateOut(y)
                break
            }
            case 'This Week':
                setDateIn(startOfWeek(t, { weekStartsOn: 1 }))
                setDateOut(endOfWeek(t, { weekStartsOn: 1 }))
                break
            case 'Last Week': {
                const lw = subWeeks(t, 1)
                setDateIn(startOfWeek(lw, { weekStartsOn: 1 }))
                setDateOut(endOfWeek(lw, { weekStartsOn: 1 }))
                break
            }
            case 'This Month':
                setDateIn(startOfMonth(t))
                setDateOut(endOfMonth(t))
                break
            case 'Last Month': {
                const lm = subMonths(t, 1)
                setDateIn(startOfMonth(lm))
                setDateOut(endOfMonth(lm))
                break
            }
        }
    }

    const formatDuration = (secs: number) => {
        const h = Math.floor(secs / 3600)
        const m = Math.floor((secs % 3600) / 60)
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`
    }

    const parseTimeToDecimal = (timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number)
        return h + (m / 60)
    }

    const formatDecimalToTime = (dec: number) => {
        let h = Math.floor(dec)
        let m = Math.round((dec - h) * 60)
        if (m === 60) {
            h += 1
            m = 0
        }
        return `${Math.max(0, Math.min(23, h)).toString().padStart(2, '0')}:${Math.max(0, Math.min(59, m)).toString().padStart(2, '0')}`
    }

    // Window mouse events for drag and resize
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (dragSelect && gridRef.current) {
                const rect = gridRef.current.getBoundingClientRect()
                // Constrain to grid bounds
                const currentX = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
                const currentY = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
                setDragSelect(prev => prev ? { ...prev, currentX, currentY } : null)
            }

            if (dragCreate && gridRef.current) {
                const rect = gridRef.current.getBoundingClientRect()
                const currentY = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
                setDragCreate(prev => prev ? { ...prev, currentDecimal: currentY / PIXELS_PER_HOUR } : null)
            }

            if (resizingEvent) {
                const deltaY = e.clientY - resizingEvent.initialY
                const decimalDelta = deltaY / PIXELS_PER_HOUR

                let newDecimalStart = resizingEvent.initialDecimal
                let newDurationSecs = resizingEvent.initialDuration

                if (resizingEvent.edge === 'top') {
                    const snappedDelta = Math.round(decimalDelta * 4) / 4
                    newDecimalStart = Math.min(
                        Math.max(0, resizingEvent.initialDecimal + snappedDelta),
                        resizingEvent.initialDecimal + (resizingEvent.initialDuration / 3600) - 0.25
                    )
                    const actualDelta = newDecimalStart - resizingEvent.initialDecimal
                    newDurationSecs = resizingEvent.initialDuration - (actualDelta * 3600)
                } else {
                    const snappedDelta = Math.round(decimalDelta * 4) / 4
                    newDurationSecs = Math.max(900, resizingEvent.initialDuration + (snappedDelta * 3600))
                }

                updateLog(resizingEvent.id, { start_time: formatDecimalToTime(newDecimalStart), duration: newDurationSecs })
            }
        }

        const handleMouseUp = () => {
            if (dragSelect && gridRef.current) {
                // Determine bounding box of selection
                const minX = Math.min(dragSelect.startX, dragSelect.currentX)
                const maxX = Math.max(dragSelect.startX, dragSelect.currentX)
                const minY = Math.min(dragSelect.startY, dragSelect.currentY)
                const maxY = Math.max(dragSelect.startY, dragSelect.currentY)

                // Select logic using scrollWidth to account for overflow
                const scrollW = gridRef.current.scrollWidth
                const columnWidth = (scrollW - 80) / daysInterval.length // 80px left axis
                const startColIdx = Math.floor((Math.max(0, minX - 80)) / columnWidth)
                const endColIdx = Math.floor((Math.max(0, maxX - 80)) / columnWidth)

                const startDecimal = minY / PIXELS_PER_HOUR
                const endDecimal = maxY / PIXELS_PER_HOUR

                const newlySelected = logs.filter(ev => {
                    const dayIdx = daysInterval.findIndex(d => isSameDay(d, ev.date))
                    if (dayIdx < startColIdx || dayIdx > endColIdx) return false

                    const evStartDecimal = parseTimeToDecimal(ev.start_time)
                    const evEndDecimal = evStartDecimal + (ev.duration / 3600)

                    // Box intersection: not complete miss
                    if (endDecimal <= evStartDecimal || startDecimal >= evEndDecimal) return false
                    return true
                }).map(ev => ev.id)

                setSelectedIds(newlySelected)
                setDragSelect(null)
            }

            if (dragCreate) {
                const minDecimal = Math.min(dragCreate.startDecimal, dragCreate.currentDecimal)
                const maxDecimal = Math.max(dragCreate.startDecimal, dragCreate.currentDecimal)

                // Snap to 15m (0.25)
                const snappedStart = Math.max(0, Math.floor(minDecimal * 4) / 4)
                const snappedEnd = Math.min(24, Math.ceil(maxDecimal * 4) / 4)

                // Show dialog if dragged enough (e.g. at least 15m)
                if (snappedEnd - snappedStart >= 0.25) {
                    setShowCreateDialog({
                        dayIdx: dragCreate.dayIdx,
                        startDecimal: snappedStart,
                        endDecimal: snappedEnd
                    })
                }
                setDragCreate(null)
            }

            if (resizingEvent) {
                setResizingEvent(null)
            }
        }

        if (dragSelect || dragCreate || resizingEvent) {
            window.addEventListener('mousemove', handleMouseMove)
            window.addEventListener('mouseup', handleMouseUp)
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [dragSelect, dragCreate, resizingEvent, logs, daysInterval, updateLog])


    const handleGridMouseDown = (e: React.MouseEvent) => {
        // Prevent selection if clicking inside an event block
        if ((e.target as HTMLElement).closest('.event-block')) return

        if (gridRef.current) {
            const rect = gridRef.current.getBoundingClientRect()
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top

            if (e.shiftKey) {
                setDragSelect({ startX: x, startY: y, currentX: x, currentY: y })
                setSelectedIds([]) // clear selection on new drag
            } else {
                // Initialize drag create
                const scrollW = gridRef.current.scrollWidth
                const columnWidth = (scrollW - 80) / daysInterval.length
                const colIdx = Math.floor(Math.max(0, x - 80) / columnWidth)
                const decimal = y / PIXELS_PER_HOUR

                if (colIdx >= 0 && colIdx < daysInterval.length) {
                    const targetDayDate = new Date(daysInterval[colIdx])
                    targetDayDate.setHours(0, 0, 0, 0)

                    const yesterdayDate = new Date()
                    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
                    yesterdayDate.setHours(0, 0, 0, 0)

                    // Strict matching allowing >= today - 1 day
                    if (targetDayDate.getTime() >= yesterdayDate.getTime()) {
                        setDragCreate({ dayIdx: colIdx, startDecimal: decimal, currentDecimal: decimal })
                    }
                }
            }
        }
    }

    const handleEventClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (e.ctrlKey || e.metaKey) {
            setSelectedIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
        } else {
            setSelectedIds([id])
        }
    }

    // Can only merge if all selected events are on the exact same day
    const selectedEventsCount = selectedIds.length
    const isMergeable = selectedEventsCount > 1 && (() => {
        const dates = selectedIds.map(id => {
            const ev = logs.find(e => e.id === id)
            return ev ? format(ev.date, 'yyyy-MM-dd') : null
        }).filter(Boolean)
        return dates.every(val => val === dates[0])
    })()

    return (
        <div className="flex flex-col h-full bg-[#21252b] relative">

            {/* Top Shared Panel / Date Pickers (Ported from Timesheet) */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#282c33] border-b border-[#3a3f4b] sticky top-0 z-30 shadow-sm">

                <div className="flex items-center gap-4">
                    <span className="font-mono font-medium text-[#abb2bf] bg-[#2c313a] px-3 py-1 rounded-full border border-[#3a3f4b] text-sm">
                        Total: {formatDuration(daysInterval.reduce((acc, day) => acc + logs.filter(e => isSameDay(e.date, day)).reduce((sum, e) => sum + e.duration, 0), 0))}
                    </span>
                </div>

                {/* Date Controls */}
                <div className="flex items-center gap-4">
                    <div className="flex bg-[#2c313a] rounded-md border border-[#3a3f4b] p-1">
                        {['Today', 'Yesterday', 'This Week', 'Last Week', 'This Month', 'Last Month'].map(range => (
                            <button
                                key={range}
                                onClick={() => setQuickDate(range)}
                                className={clsx(
                                    "px-3 py-1.5 rounded text-sm font-medium transition-colors",
                                    activeRange === range
                                        ? "bg-[#3a3f4b] text-white shadow-sm"
                                        : "text-[#abb2bf] hover:text-white hover:bg-[#3a3f4b]/50"
                                )}
                            >
                                {range}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center bg-[#2c313a] rounded-md border border-[#3a3f4b] overflow-hidden">
                        <button
                            onClick={() => {
                                setDateIn(prev => subDays(prev, 1))
                                setDateOut(prev => subDays(prev, 1))
                                setActiveRange('Custom')
                            }}
                            className="p-2 hover:bg-[#3a3f4b] text-[#abb2bf] transition-colors border-r border-[#3a3f4b]"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <div className="px-4 py-1.5 text-sm font-medium text-white min-w-[200px] text-center">
                            {format(dateIn, 'MMM d, yyyy')} - {format(dateOut, 'MMM d, yyyy')}
                        </div>
                        <button
                            onClick={() => {
                                setDateIn(prev => addDays(prev, 1))
                                setDateOut(prev => addDays(prev, 1))
                                setActiveRange('Custom')
                            }}
                            className="p-2 hover:bg-[#3a3f4b] text-[#abb2bf] transition-colors border-l border-[#3a3f4b]"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

            </div>

            {/* Calendar Grid Container */}
            <div className="flex-1 overflow-auto flex flex-col bg-[#21252b]">

                {/* Days Header */}
                <div className="flex border-b border-[#3a3f4b] sticky top-0 bg-[#282c33] z-20">
                    <div className="w-20 shrink-0 border-r border-[#3a3f4b] flex items-center justify-center p-2">
                        <span className="text-xs text-[#5c6370]">GMT</span>
                    </div>
                    {daysInterval.map((day, i) => {
                        const dayEvents = logs.filter(e => isSameDay(e.date, day))
                        const totalSecs = dayEvents.reduce((acc, curr) => acc + curr.duration, 0)

                        return (
                            <div key={i} className="flex-1 min-w-[120px] py-2 border-r border-[#3a3f4b] flex flex-col items-center justify-center">
                                <span className={clsx(
                                    "text-sm font-medium",
                                    isSameDay(day, new Date()) ? "text-[#61afef]" : "text-[#abb2bf]"
                                )}>
                                    {format(day, 'EEEE')}
                                </span>
                                <span className={clsx(
                                    "text-xs font-semibold mt-0.5",
                                    isSameDay(day, new Date()) ? "text-[#5294cc]" : "text-[#5c6370]"
                                )}>
                                    {format(day, 'MMM d')}
                                </span>
                                <span className="font-mono text-[10px] text-[#5c6370] mt-1 bg-[#1e2227] px-2 rounded-full border border-[#3a3f4b]">
                                    {formatDuration(totalSecs)}
                                </span>
                            </div>
                        )
                    })}
                </div>

                {/* Grid Body */}
                <div
                    ref={gridRef}
                    className="flex flex-1 relative bg-[#21252b] select-none"
                    onMouseDown={handleGridMouseDown}
                >

                    {/* Time Scale (Left Axis) */}
                    <div className="w-20 shrink-0 border-r border-[#3a3f4b] flex flex-col relative bg-[#282c33] z-10 box-content">
                        {hoursInDay.map(_hour => (
                            <div
                                key={_hour}
                                className="w-full relative flex items-start justify-center text-xs text-[#5c6370] font-medium"
                                style={{ height: PIXELS_PER_HOUR }}
                            >
                                <span className="absolute -top-[7px] pointer-events-none bg-[#282c33] px-1 text-[11px] right-2">
                                    {_hour.toString().padStart(2, '0')}:00
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Columns area */}
                    <div className="flex flex-1 relative" style={{ height: hoursInDay.length * PIXELS_PER_HOUR }}>

                        {/* Horizontal Grid lines */}
                        {hoursInDay.map((_hour, idx) => (
                            <div
                                key={`h-${idx}`}
                                className="absolute left-0 right-0 border-t border-[#3a3f4b] pointer-events-none flex flex-col justify-between"
                                style={{ top: idx * PIXELS_PER_HOUR, height: PIXELS_PER_HOUR }}
                            >
                                {/* Half-hour dashed sub-line */}
                                <div className="absolute w-full top-1/2 border-t border-dashed border-[#3a3f4b]/50" />
                            </div>
                        ))}

                        {/* Drag Selection Box overlay */}
                        {dragSelect && (
                            <div
                                className="absolute bg-[#61afef]/20 border border-[#61afef] z-30 pointer-events-none"
                                style={{
                                    left: Math.min(dragSelect.startX, dragSelect.currentX) - 80, // Offset for left axis width
                                    top: Math.min(dragSelect.startY, dragSelect.currentY),
                                    width: Math.abs(dragSelect.currentX - dragSelect.startX),
                                    height: Math.abs(dragSelect.currentY - dragSelect.startY)
                                }}
                            />
                        )}

                        {daysInterval.map((day, dIdx) => {
                            const dayEvents = logs.filter(e => isSameDay(e.date, day))

                            return (
                                <div key={dIdx} className="flex-1 min-w-[120px] border-r border-[#3a3f4b] relative">
                                    {/* Drag Create Overlay */}
                                    {dragCreate && dragCreate.dayIdx === dIdx && (
                                        <div
                                            className="absolute left-1 right-2 rounded bg-[#61afef]/20 border border-[#61afef] border-dashed z-20 pointer-events-none"
                                            style={{
                                                top: `${Math.min(dragCreate.startDecimal, dragCreate.currentDecimal) * PIXELS_PER_HOUR}px`,
                                                height: `${Math.max(0.25, Math.abs(dragCreate.currentDecimal - dragCreate.startDecimal)) * PIXELS_PER_HOUR}px`
                                            }}
                                        />
                                    )}

                                    {dayEvents.map(event => {
                                        const decimalStart = parseTimeToDecimal(event.start_time)
                                        const topOffset = decimalStart * PIXELS_PER_HOUR
                                        const eventHeight = (event.duration / 3600) * PIXELS_PER_HOUR
                                        const isSelected = selectedIds.includes(event.id)
                                        const isEditable = event.status === 'logged' || event.status === 'disputed'

                                        return (
                                            <div
                                                key={event.id}
                                                onMouseDown={(e) => handleEventClick(e, event.id)}
                                                className={clsx(
                                                    "event-block absolute left-1 right-2 rounded overflow-hidden flex flex-col bg-[#1e2227] hover:bg-[#2c313a] transition-colors border cursor-pointer group shadow-sm z-10",
                                                    isSelected ? "border-[#61afef] ring-1 ring-[#61afef]" : "border-[#3a3f4b]"
                                                )}
                                                style={{
                                                    top: `${Math.max(0, topOffset)}px`,
                                                    height: `${Math.max(20, eventHeight)}px`,
                                                    borderLeft: `4px solid ${event.project_color}`
                                                }}
                                            >
                                                {/* Edit Drag Handle Top */}
                                                {isEditable && (
                                                    <div
                                                        className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-white/20 z-20"
                                                        onMouseDown={(e) => {
                                                            e.stopPropagation()
                                                            setResizingEvent({ id: event.id, edge: 'top', initialY: e.clientY, initialDecimal: decimalStart, initialDuration: event.duration })
                                                        }}
                                                    />
                                                )}

                                                <div className="px-2 py-1 flex-1 min-h-0 overflow-hidden flex flex-col items-start leading-tight">
                                                    <span className="text-xs font-mono font-bold text-white mb-0.5">{formatDuration(event.duration)}</span>
                                                    <span className="text-xs font-semibold text-[#abb2bf] group-hover:text-white truncate w-full" title={event.ftrack_path.split('/').pop()}>{event.ftrack_path.split('/').pop()}</span>
                                                    <span className="text-[11px] text-[#5294cc] truncate w-full mt-0.5" title={event.ftrack_task_name}>{event.ftrack_task_name}</span>
                                                    <span className="text-[10px] text-[#5c6370] truncate w-full mt-0.5" title={event.project_id}>{event.project_id}</span>
                                                </div>

                                                {/* Edit Drag Handle Bottom */}
                                                {isEditable && (
                                                    <div
                                                        className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-white/20 z-20"
                                                        onMouseDown={(e) => {
                                                            e.stopPropagation()
                                                            setResizingEvent({ id: event.id, edge: 'bottom', initialY: e.clientY, initialDecimal: decimalStart, initialDuration: event.duration })
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )
                        })}
                    </div>

                </div>
            </div>

            {/* Sticky Bottom Contextual Action Bar */}
            {selectedEventsCount > 0 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#2c313a] border border-[#3a3f4b] rounded-full shadow-lg px-6 py-3 flex items-center gap-6 z-40 animate-in slide-in-from-bottom-8">
                    <div className="flex items-center gap-2">
                        <span className="bg-[#61afef] text-[#1e2227] text-xs font-bold px-2 py-1 rounded-full">
                            {selectedEventsCount}
                        </span>
                        <span className="text-sm font-medium text-white">selected</span>
                    </div>

                    <div className="w-px h-5 bg-[#4b5363]" />

                    <div className="flex items-center gap-2">
                        {isMergeable && (
                            <button
                                onClick={() => {
                                    mergeLogs(selectedIds)
                                    setSelectedIds([])
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium text-[#abb2bf] hover:text-white hover:bg-[#3a3f4b] transition-colors"
                            >
                                <GitMerge size={16} />
                                Merge Selected
                            </button>
                        )}

                        <button
                            onClick={() => {
                                selectedIds.forEach(id => deleteLog(id))
                                setSelectedIds([])
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium text-[#e06c75] hover:text-white hover:bg-[#e06c75] transition-colors"
                        >
                            <Trash2 size={16} />
                            Delete
                        </button>
                    </div>
                </div>
            )}

            {/* Create Dialog Modal */}
            {showCreateDialog && (
                <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center">
                    <div className="bg-[#282c33] border border-[#3a3f4b] rounded-md shadow-xl p-6 w-[400px]">
                        <h2 className="text-white text-lg font-semibold mb-4">Create Time Log</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#abb2bf] mb-1">Date</label>
                                <div className="text-sm text-white bg-[#1e2227] px-3 py-2 rounded border border-[#3a3f4b]">
                                    {format(daysInterval[showCreateDialog.dayIdx], 'MMM d, yyyy')}
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-[#abb2bf] mb-1">Start Time</label>
                                    <div className="text-sm font-mono text-white bg-[#1e2227] px-3 py-2 rounded border border-[#3a3f4b]">
                                        {formatDecimalToTime(showCreateDialog.startDecimal)}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-[#abb2bf] mb-1">End Time</label>
                                    <div className="text-sm font-mono text-white bg-[#1e2227] px-3 py-2 rounded border border-[#3a3f4b]">
                                        {formatDecimalToTime(showCreateDialog.endDecimal)}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#abb2bf] mb-1">Project</label>
                                <select className="w-full bg-[#1e2227] border border-[#3a3f4b] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-[#61afef]">
                                    <option>Prj-Ayon</option>
                                    <option>Prj-Commercial</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#abb2bf] mb-1">Path</label>
                                <input type="text" placeholder="e.g. shots/sh010" className="w-full bg-[#1e2227] border border-[#3a3f4b] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-[#61afef]" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#abb2bf] mb-1">Task</label>
                                <input type="text" placeholder="e.g. comp" className="w-full bg-[#1e2227] border border-[#3a3f4b] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-[#61afef]" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowCreateDialog(null)}
                                className="px-4 py-2 text-sm font-medium text-[#abb2bf] hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    addLog({
                                        description: 'New task',
                                        ftrack_path: 'new path',
                                        ftrack_task_name: 'new task',
                                        ftrack_task_type: 'Unknown',
                                        project_id: 'Prj-Ayon',
                                        project_color: '#61afef',
                                        date: daysInterval[showCreateDialog.dayIdx],
                                        start_time: formatDecimalToTime(showCreateDialog.startDecimal),
                                        end_time: formatDecimalToTime(showCreateDialog.endDecimal),
                                        duration: (showCreateDialog.endDecimal - showCreateDialog.startDecimal) * 3600,
                                        status: 'logged'
                                    })
                                    setShowCreateDialog(null)
                                }}
                                className="px-4 py-2 bg-[#61afef] hover:bg-[#5294cc] text-[#282c34] text-sm font-semibold rounded transition-colors shadow-sm"
                            >
                                Save Log
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
