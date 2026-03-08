import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, GitMerge, Trash2, X, Maximize } from 'lucide-react'
import { format, addDays, startOfWeek, endOfWeek, subDays, subWeeks, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns'
import { clsx } from 'clsx'
import { useTimeTracker } from '../context/TimeTrackerContext'
import FilterPanel from '../components/FilterPanel'
import type { FtrackNode } from '../context/TimeTrackerContext'
import PathPicker from '../components/PathPicker'

export default function CalendarView() {
    const today = new Date()
    const { logs, updateLog, addLog, deleteLog, mergeLogs, projects, globalSelectedEntryIds } = useTimeTracker()

    const [dateIn, setDateIn] = useState(startOfWeek(today, { weekStartsOn: 1 }))
    const [dateOut, setDateOut] = useState(endOfWeek(today, { weekStartsOn: 1 }))
    const [selectedIds, setSelectedIds] = useState<string[]>([])

    // PathPicker state for create dialog
    const [selectedPath, setSelectedPath] = useState<{
        project_id: string;
        project_name: string;
        project_color: string;
        ftrack_path: string;
        ftrack_task_name: string;
        ftrack_task_type: string;
    } | null>(null)
    const [isPathPickerOpen, setIsPathPickerOpen] = useState(false)
    const pickerRef = useRef<HTMLDivElement>(null)

    // Handle outside click to close picker
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (isPathPickerOpen && pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setIsPathPickerOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isPathPickerOpen]);

    // Drag Select State
    const [dragSelect, setDragSelect] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null)
    const [dragCreate, setDragCreate] = useState<{ dayIdx: number, startDecimal: number, currentDecimal: number } | null>(null)

    // Updated Create Dialog State to track string values for manual input
    const [showCreateDialog, setShowCreateDialog] = useState<{
        dayIdx: number,
        startTime: string,
        endTime: string,
        durationStr: string
    } | null>(null)
    const gridRef = useRef<HTMLDivElement>(null)
    const scrollRef = useRef<HTMLDivElement>(null)

    // Resize & Drag State
    const [resizingEvent, setResizingEvent] = useState<{ id: string, edge: 'top' | 'bottom', initialY: number, initialDecimal: number, initialDuration: number } | null>(null)
    const [draggingEvent, setDraggingEvent] = useState<{ id: string, initialY: number, currentY: number, initialDecimalStart: number, durationDec: number } | null>(null)
    const [isFilterPinned, setIsFilterPinned] = useState(true)

    const [pixelsPerHour, setPixelsPerHour] = useState(80)
    const hoursInDay = Array.from({ length: 24 }).map((_, i) => i)

    const daysInterval = eachDayOfInterval({ start: dateIn, end: dateOut })

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

    // Manual frame logic to automatically zoom and scroll to fit all visible logs
    const handleFrameLogs = () => {
        if (!gridRef.current || !scrollRef.current) return;

        // Find all visible events
        const visibleEvents = logs.filter(e => {
            const isAfterIn = e.date >= dateIn || isSameDay(e.date, dateIn)
            const isBeforeOut = e.date <= dateOut || isSameDay(e.date, dateOut)
            return isAfterIn && isBeforeOut
        })

        if (visibleEvents.length > 0) {
            let minDec = 24;
            let maxDec = 0;
            visibleEvents.forEach(ev => {
                const s = parseTimeToDecimal(ev.start_time || '09:00');
                const e = s + (ev.duration / 3600);
                if (s < minDec) minDec = s;
                if (e > maxDec) maxDec = e;
            });

            const padTop = Math.max(0, minDec - 1);
            const padBottom = Math.min(24, maxDec + 1);
            const spanHours = Math.max(2, padBottom - padTop);

            const clientH = scrollRef.current.clientHeight - 60; // offset for the days header
            // minimum 40px per hour, maximum 300px per hour
            const calcPPH = Math.max(40, Math.min(300, clientH / spanHours));

            setPixelsPerHour(calcPPH);

            setTimeout(() => {
                if (scrollRef.current) scrollRef.current.scrollTo({ top: padTop * calcPPH, behavior: 'smooth' });
            }, 50);

        } else {
            // Default 9 to 18 (9 hours span -> padded 8 to 19 = 11 hours)
            const clientH = scrollRef.current.clientHeight - 60;
            const calcPPH = Math.max(40, clientH / 11);
            setPixelsPerHour(calcPPH);
            setTimeout(() => {
                if (scrollRef.current) scrollRef.current.scrollTo({ top: 8 * calcPPH, behavior: 'smooth' });
            }, 50);
        }
    }

    // Specific scroll on mount if a track is selected globally (overrides auto-fit scroll slightly)
    useEffect(() => {
        if (!scrollRef.current) return;

        let targetDecimal = -1;
        const firstSelectedId = globalSelectedEntryIds && globalSelectedEntryIds[0];
        if (firstSelectedId) {
            const firstLog = logs.find(l => l.id === firstSelectedId);
            if (firstLog && firstLog.start_time) {
                const [h, m] = firstLog.start_time.split(':').map(Number);
                targetDecimal = h + (m / 60);
            }
        }

        if (targetDecimal === -1) {
            const now = new Date();
            targetDecimal = now.getHours() + (now.getMinutes() / 60);
        }

        if (targetDecimal === -1) return;

        // Offset scroll by 2 hours so it's not glued to the top edge
        const scrollY = Math.max(0, (targetDecimal - 2) * pixelsPerHour);
        // Use timeout to ensure grid layout is complete before scrolling
        setTimeout(() => {
            if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollY, behavior: 'smooth' });
        }, 150); // Slightly longer timeout to run after auto-fit
    }, [globalSelectedEntryIds]); // Removed dependencies to only trigger purely on selection change

    // Zoom handling (Ctrl + Wheel)
    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey || e.deltaY % 1 !== 0) { // e.deltaY % 1 !== 0 checks for trackpad pinch which is often a float
                e.preventDefault();

                setPixelsPerHour(prev => {
                    const zoomFactor = 1.05;
                    let newPph = e.deltaY < 0 ? prev * zoomFactor : prev / zoomFactor;
                    newPph = Math.max(20, Math.min(600, newPph)); // allow wide zoom bounds

                    if (newPph !== prev && gridRef.current && scrollRef.current) {
                        const gridRect = gridRef.current.getBoundingClientRect();
                        const yInGrid = e.clientY - gridRect.top;
                        const decimalAtCursor = yInGrid / prev;
                        const newYInGrid = decimalAtCursor * newPph;

                        const diff = newYInGrid - yInGrid;
                        const currentScrollTop = scrollRef.current.scrollTop;

                        // Apply scroll immediately after render
                        requestAnimationFrame(() => {
                            if (scrollRef.current) {
                                scrollRef.current.scrollTop = currentScrollTop + diff;
                            }
                        });
                    }
                    return newPph;
                });
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        // Also prevent default document zooming when hovering grid
        const preventDocZoom = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) e.preventDefault();
        }
        document.addEventListener('wheel', preventDocZoom, { passive: false });

        return () => {
            container.removeEventListener('wheel', handleWheel);
            document.removeEventListener('wheel', preventDocZoom);
        }
    }, []);

    const isPresetActive = (range: string) => {
        const t = new Date()
        switch (range) {
            case 'Today': return isSameDay(dateIn, t) && isSameDay(dateOut, t)
            case 'Yesterday': {
                const y = subDays(t, 1)
                return isSameDay(dateIn, y) && isSameDay(dateOut, y)
            }
            case 'This Week': return isSameDay(dateIn, startOfWeek(t, { weekStartsOn: 1 })) && isSameDay(dateOut, endOfWeek(t, { weekStartsOn: 1 }))
            case 'Last Week': {
                const lw = subWeeks(t, 1)
                return isSameDay(dateIn, startOfWeek(lw, { weekStartsOn: 1 })) && isSameDay(dateOut, endOfWeek(lw, { weekStartsOn: 1 }))
            }
            case 'This Month': return isSameDay(dateIn, startOfMonth(t)) && isSameDay(dateOut, endOfMonth(t))
            case 'Last Month': {
                const lm = subMonths(t, 1)
                return isSameDay(dateIn, startOfMonth(lm)) && isSameDay(dateOut, endOfMonth(lm))
            }
        }
        return false
    }

    const setQuickDate = (range: string) => {
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
                setDragCreate(prev => prev ? { ...prev, currentDecimal: currentY / pixelsPerHour } : null)
            }

            if (draggingEvent) {
                const currentY = e.clientY
                setDraggingEvent(prev => prev ? { ...prev, currentY } : null)
            }

            if (resizingEvent) {
                const deltaY = e.clientY - resizingEvent.initialY
                const decimalDelta = deltaY / pixelsPerHour

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

                const startDecimal = minY / pixelsPerHour
                const endDecimal = maxY / pixelsPerHour

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
                        startTime: formatDecimalToTime(snappedStart),
                        endTime: formatDecimalToTime(snappedEnd),
                        durationStr: formatDecimalToTime(snappedEnd - snappedStart)
                    })
                }
                setDragCreate(null)
            }

            if (resizingEvent) {
                setResizingEvent(null)
            }

            if (draggingEvent) {
                const deltaY = draggingEvent.currentY - draggingEvent.initialY
                const decimalDelta = deltaY / pixelsPerHour

                // Snap to 15m (0.25)
                const snappedDelta = Math.round(decimalDelta * 4) / 4

                const newDecimalStart = Math.max(0, Math.min(24 - draggingEvent.durationDec, draggingEvent.initialDecimalStart + snappedDelta))

                if (newDecimalStart !== draggingEvent.initialDecimalStart) {
                    updateLog(draggingEvent.id, {
                        start_time: formatDecimalToTime(newDecimalStart),
                        end_time: formatDecimalToTime(newDecimalStart + draggingEvent.durationDec)
                    })
                }

                setDraggingEvent(null)
            }
        }

        if (dragSelect || dragCreate || resizingEvent || draggingEvent) {
            window.addEventListener('mousemove', handleMouseMove)
            window.addEventListener('mouseup', handleMouseUp)
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [dragSelect, dragCreate, resizingEvent, draggingEvent, logs, daysInterval, updateLog, pixelsPerHour])


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
                const decimal = y / pixelsPerHour

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
        <div className="flex h-full w-full bg-[#21252b] relative pr-2">
            <div className="flex flex-col flex-1 h-full min-w-0 bg-[#21252b] relative">

                {/* Top Shared Panel / Date Pickers (Ported from Timesheet) */}
                <div className="flex items-center justify-between px-6 py-4 bg-[#282c33] border-b border-[#3a3f4b] sticky top-0 z-30 shadow-sm">

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="font-mono font-medium text-[#abb2bf] bg-[#2c313a] px-3 py-1.5 rounded flex items-center h-[34px] border border-[#3a3f4b] text-sm">
                                Total: {formatDuration(daysInterval.reduce((acc, day) => acc + logs.filter(e => isSameDay(e.date, day)).reduce((sum, e) => sum + e.duration, 0), 0))}
                            </span>
                            <button
                                onClick={handleFrameLogs}
                                title="Frame Visible Logs"
                                className="bg-[#2c313a] hover:bg-[#3a3f4b] hover:text-white text-[#abb2bf] flex items-center justify-center p-2 rounded h-[34px] border border-[#3a3f4b] transition-colors"
                            >
                                <Maximize size={16} />
                            </button>
                        </div>

                        {!isFilterPinned && (
                            <FilterPanel
                                isPinned={isFilterPinned}
                                onTogglePin={() => setIsFilterPinned(!isFilterPinned)}
                                onFilterChange={(newFilters) => console.log('Filters updated:', newFilters)}
                            />
                        )}
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
                                        isPresetActive(range)
                                            ? "bg-[#3a3f4b] text-white shadow-sm"
                                            : "text-[#abb2bf] hover:text-white hover:bg-[#3a3f4b]/50"
                                    )}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center bg-[#282c33] rounded-md border border-[#3a3f4b] p-1 gap-2 text-sm text-white">
                                <Calendar size={16} className="text-[#61afef] ml-2 shrink-0" />

                                <div className="flex items-center bg-[#1e2227] rounded border border-[#3a3f4b]">
                                    <button onClick={() => setDateIn(prev => subDays(prev, 1))} className="px-1.5 py-1 hover:bg-[#3a3f4b] text-[#abb2bf] transition-colors"><ChevronLeft size={16} /></button>
                                    <span className="px-1 block w-[90px] text-center font-medium">{format(dateIn, 'MMM d, yyyy')}</span>
                                    <button onClick={() => setDateIn(prev => addDays(prev, 1))} className="px-1.5 py-1 hover:bg-[#3a3f4b] text-[#abb2bf] transition-colors"><ChevronRight size={16} /></button>
                                </div>

                                <span className="text-[#5c6370]">→</span>

                                <div className="flex items-center bg-[#1e2227] rounded border border-[#3a3f4b]">
                                    <button onClick={() => setDateOut(prev => subDays(prev, 1))} className="px-1.5 py-1 hover:bg-[#3a3f4b] text-[#abb2bf] transition-colors"><ChevronLeft size={16} /></button>
                                    <span className="px-1 block w-[90px] text-center font-medium">{format(dateOut, 'MMM d, yyyy')}</span>
                                    <button onClick={() => setDateOut(prev => addDays(prev, 1))} className="px-1.5 py-1 hover:bg-[#3a3f4b] text-[#abb2bf] transition-colors"><ChevronRight size={16} /></button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Calendar Grid Container */}
                <div ref={scrollRef} className="flex-1 overflow-auto flex flex-col bg-[#21252b]">

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
                                    style={{ height: pixelsPerHour }}
                                >
                                    <span className="absolute -top-[7px] pointer-events-none bg-[#282c33] px-1 text-[11px] right-2">
                                        {_hour.toString().padStart(2, '0')}:00
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Columns area */}
                        <div className="flex flex-1 relative" style={{ height: hoursInDay.length * pixelsPerHour }}>

                            {/* Horizontal Grid lines */}
                            {hoursInDay.map((_hour, idx) => (
                                <div
                                    key={`h-${idx}`}
                                    className="absolute left-0 right-0 border-t border-[#3a3f4b] pointer-events-none flex flex-col justify-between"
                                    style={{ top: idx * pixelsPerHour, height: pixelsPerHour }}
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
                                                    top: `${Math.min(dragCreate.startDecimal, dragCreate.currentDecimal) * pixelsPerHour}px`,
                                                    height: `${Math.max(0.25, Math.abs(dragCreate.currentDecimal - dragCreate.startDecimal)) * pixelsPerHour}px`
                                                }}
                                            />
                                        )}

                                        {dayEvents.map(event => {
                                            const isDraggingThis = draggingEvent?.id === event.id;
                                            let decimalStart = parseTimeToDecimal(event.start_time)
                                            const durationDec = event.duration / 3600;

                                            // Override rendering if actively dragging
                                            if (isDraggingThis) {
                                                const deltaY = draggingEvent.currentY - draggingEvent.initialY
                                                const decimalDelta = deltaY / pixelsPerHour
                                                const snappedDelta = Math.round(decimalDelta * 4) / 4
                                                decimalStart = Math.max(0, Math.min(24 - durationDec, draggingEvent.initialDecimalStart + snappedDelta))
                                            }

                                            const topOffset = decimalStart * pixelsPerHour
                                            const eventHeight = durationDec * pixelsPerHour
                                            const isSelected = selectedIds.includes(event.id)
                                            const isEditable = event.status === 'logged' || event.status === 'disputed'

                                            const showTimes = eventHeight >= 45
                                            const showFullPath = eventHeight >= 60
                                            const showBidInfo = eventHeight >= 80 && event.bid_time

                                            // Only calculate total task time if we're showing bid info to save performance
                                            let totalTaskSecs = 0;
                                            if (showBidInfo) {
                                                totalTaskSecs = logs.filter(l => l.project_id === event.project_id && l.ftrack_path === event.ftrack_path && l.ftrack_task_name === event.ftrack_task_name).reduce((sum, l) => sum + l.duration, 0)
                                            }

                                            return (
                                                <div
                                                    key={event.id}
                                                    onMouseDown={(e) => {
                                                        handleEventClick(e, event.id);
                                                        if (isEditable && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                                                            // Prevent drag if clicking exactly near the edges (resizers)
                                                            const target = e.target as HTMLElement;
                                                            if (target.classList.contains('cursor-ns-resize')) return;

                                                            setDraggingEvent({
                                                                id: event.id,
                                                                initialY: e.clientY,
                                                                currentY: e.clientY,
                                                                initialDecimalStart: parseTimeToDecimal(event.start_time),
                                                                durationDec: durationDec
                                                            });
                                                        }
                                                    }}
                                                    className={clsx(
                                                        "event-block absolute left-1 right-2 rounded overflow-hidden flex flex-col transition-colors border cursor-pointer group shadow-sm",
                                                        isDraggingThis ? "bg-[#3a3f4b] opacity-80 z-50 ring-2 ring-[#61afef]" : "bg-[#1e2227] hover:bg-[#2c313a] z-10",
                                                        isSelected ? "border-[#61afef] ring-1 ring-[#61afef]" : "border-[#3a3f4b]"
                                                    )}
                                                    style={{
                                                        top: `${Math.max(0, topOffset)}px`,
                                                        height: `${Math.max(20, eventHeight)}px`,
                                                        borderLeft: `4px solid ${event.project_color}`,
                                                        pointerEvents: draggingEvent && !isDraggingThis ? 'none' : 'auto'
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
                                                        <span className="text-[11px] font-mono font-bold text-white mb-0.5 flex justify-between w-full">
                                                            <span className="truncate">
                                                                {showTimes ? `${event.start_time} - ${formatDecimalToTime(decimalStart + durationDec)} (${formatDuration(event.duration)})` : formatDuration(event.duration)}
                                                            </span>
                                                            {showBidInfo && (
                                                                <span className={clsx("font-normal text-[10px] ml-1 shrink-0", totalTaskSecs > (event.bid_time || 0) ? "text-[#e06c75]" : "text-[#98c379]")}>
                                                                    Bid: {Math.round((event.bid_time || 0) / 3600)}h
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className={clsx("text-xs font-semibold text-[#abb2bf] group-hover:text-white w-full", showFullPath ? "whitespace-normal line-clamp-2" : "truncate")} title={event.ftrack_path}>
                                                            {showFullPath ? event.ftrack_path.replace(/\//g, ' / ') : event.ftrack_path.split('/').pop()}
                                                        </span>
                                                        <span className="text-[11px] text-[#5294cc] truncate w-full mt-0.5" title={event.ftrack_task_name}>{event.ftrack_task_name}</span>
                                                        <span className="text-[10px] text-[#5c6370] truncate w-full mt-0.5" title={projects.find(p => p.id === event.project_id)?.name || event.project_id}>
                                                            {projects.find(p => p.id === event.project_id)?.name || event.project_id}
                                                        </span>
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
                                        <label className="block text-xs font-medium text-[#abb2bf] mb-1 flex items-center justify-between">
                                            Start Time
                                        </label>
                                        <input
                                            type="time"
                                            value={showCreateDialog.startTime}
                                            onChange={(e) => {
                                                const newStart = e.target.value;
                                                if (!newStart) return;

                                                // Recalculate duration interactively
                                                const [sh, sm] = newStart.split(':').map(Number);
                                                const [eh, em] = showCreateDialog.endTime.split(':').map(Number);
                                                let sDec = sh + (sm / 60);
                                                let eDec = eh + (em / 60);

                                                if (sDec > eDec) eDec = sDec; // Push end time if start crosses it

                                                setShowCreateDialog({
                                                    ...showCreateDialog,
                                                    startTime: newStart,
                                                    endTime: formatDecimalToTime(eDec),
                                                    durationStr: formatDecimalToTime(eDec - sDec)
                                                });
                                            }}
                                            className="w-full text-sm font-mono text-white bg-[#1e2227] px-3 py-2 rounded border border-[#3a3f4b] focus:border-[#61afef] outline-none [color-scheme:dark]"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-[#abb2bf] mb-1 flex items-center justify-between">
                                            End Time
                                        </label>
                                        <input
                                            type="time"
                                            value={showCreateDialog.endTime}
                                            onChange={(e) => {
                                                const newEnd = e.target.value;
                                                if (!newEnd) return;

                                                // Recalculate duration interactively
                                                const [sh, sm] = showCreateDialog.startTime.split(':').map(Number);
                                                const [eh, em] = newEnd.split(':').map(Number);
                                                let sDec = sh + (sm / 60);
                                                let eDec = eh + (em / 60);

                                                if (eDec < sDec) sDec = eDec; // Pull start time if end crosses it

                                                setShowCreateDialog({
                                                    ...showCreateDialog,
                                                    startTime: formatDecimalToTime(sDec),
                                                    endTime: newEnd,
                                                    durationStr: formatDecimalToTime(eDec - sDec)
                                                });
                                            }}
                                            className="w-full text-sm font-mono text-white bg-[#1e2227] px-3 py-2 rounded border border-[#3a3f4b] focus:border-[#61afef] outline-none [color-scheme:dark]"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="w-1/3">
                                        <label className="block text-xs font-medium text-[#abb2bf] mb-1">Duration</label>
                                        <input
                                            type="time"
                                            value={showCreateDialog.durationStr}
                                            onChange={(e) => {
                                                const newDur = e.target.value;
                                                if (!newDur) return;

                                                const [dh, dm] = newDur.split(':').map(Number);
                                                const [sh, sm] = showCreateDialog.startTime.split(':').map(Number);
                                                const newEndDec = (sh + (sm / 60)) + (dh + (dm / 60));

                                                setShowCreateDialog({
                                                    ...showCreateDialog,
                                                    endTime: formatDecimalToTime(newEndDec),
                                                    durationStr: newDur
                                                });
                                            }}
                                            className="w-full text-sm font-mono text-[#e5c07b] font-semibold bg-[#1e2227] px-3 py-2 rounded border border-[#3a3f4b] focus:border-[#61afef] outline-none [color-scheme:dark]"
                                        />
                                    </div>
                                    <div className="flex-1 flex gap-1.5 mt-5">
                                        {[
                                            { label: '1h', dh: 1, dm: 0 },
                                            { label: '2h', dh: 2, dm: 0 },
                                            { label: '4h', dh: 4, dm: 0 },
                                            { label: 'All Day', dh: 8, dm: 0 },
                                        ].map(preset => (
                                            <button
                                                key={preset.label}
                                                onClick={() => {
                                                    const [sh, sm] = showCreateDialog.startTime.split(':').map(Number);
                                                    const newEndDec = (sh + (sm / 60)) + (preset.dh + (preset.dm / 60));
                                                    setShowCreateDialog({
                                                        ...showCreateDialog,
                                                        endTime: formatDecimalToTime(newEndDec),
                                                        durationStr: `${String(preset.dh).padStart(2, '0')}:${String(preset.dm).padStart(2, '0')}`
                                                    })
                                                }}
                                                className="px-2 py-1.5 text-xs font-medium text-[#abb2bf] bg-[#1e2227] hover:bg-[#3a3f4b] hover:text-white border border-[#3a3f4b] rounded transition-colors flex-1"
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Path Picker Button / Selected State */}
                                <div className="pt-2">
                                    <label className="block text-xs font-medium text-[#abb2bf] mb-2">Select Task</label>
                                    <div className="relative" ref={pickerRef}>
                                        {!selectedPath ? (
                                            <button
                                                onClick={() => setIsPathPickerOpen(!isPathPickerOpen)}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1e2227] border border-[#3a3f4b] hover:border-[#61afef] hover:bg-[#2c313a] text-[#abb2bf] hover:text-white rounded-md transition-colors shadow-sm"
                                            >
                                                <div className="w-3 h-3 rounded-full border-2 border-[#5c6370]" />
                                                <span className="font-semibold text-sm">Select Project & Task...</span>
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-2 w-full bg-[#1e2227] border border-[#3a3f4b] rounded-md p-1 shadow-sm opacity-100 hover:border-[#61afef] transition-colors cursor-pointer group"
                                                onClick={() => setIsPathPickerOpen(!isPathPickerOpen)}>
                                                <div className="flex-1 flex items-center gap-2 pl-2 overflow-hidden py-1">
                                                    <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: selectedPath.project_color }} />
                                                    <div className="flex items-center gap-2 overflow-hidden w-full">
                                                        <span className="text-xs text-[#abb2bf] truncate shrink max-w-[120px]" title={selectedPath.project_name}>
                                                            {selectedPath.project_name}
                                                        </span>
                                                        <span className="text-[#5c6370] text-xs shrink-0">/</span>
                                                        <span className="text-xs text-[#5294cc] truncate shrink" title={selectedPath.ftrack_path}>
                                                            {selectedPath.ftrack_path}
                                                        </span>
                                                        <span className="text-[#5c6370] text-xs shrink-0">/</span>
                                                        <span className="text-sm font-semibold text-white truncate shrink-0" title={selectedPath.ftrack_task_name}>
                                                            {selectedPath.ftrack_task_name}
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedPath(null);
                                                    }}
                                                    className="p-1.5 hover:bg-[#e06c75]/10 text-[#5c6370] hover:text-[#e06c75] rounded transition-colors mr-1"
                                                    title="Clear selection"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        )}

                                        {/* PathPicker Dropdown */}
                                        {isPathPickerOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-2 z-[60] pb-8">
                                                <div className="w-[800px] shadow-2xl relative -left-[200px]">
                                                    <PathPicker onSelect={(node: FtrackNode, path: string[]) => {
                                                        const projectName = path[0] || 'Ayon Project';
                                                        const rootPrj = projects.find(p => p.name === projectName);
                                                        setSelectedPath({
                                                            project_id: rootPrj?.id || 'Prj-Ayon',
                                                            project_name: projectName,
                                                            project_color: rootPrj?.color || '#61afef',
                                                            ftrack_path: path.slice(1, -1).join('/') || 'Folder',
                                                            ftrack_task_name: node.name,
                                                            ftrack_task_type: node.type || 'Unknown'
                                                        });
                                                        setIsPathPickerOpen(false);
                                                    }} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Time Off Planning Grid */}
                                <div className="pt-1">
                                    <div className="flex items-center gap-2">
                                        {['Not Available', 'Sick', 'Time Off'].map(status => (
                                            <button
                                                key={status}
                                                onClick={() => {
                                                    const fakePrjId = status.replace(' ', '');
                                                    setSelectedPath({
                                                        project_id: fakePrjId,
                                                        project_name: 'Internal',
                                                        project_color: status === 'Sick' ? '#e06c75' : status === 'Time Off' ? '#98c379' : '#5c6370',
                                                        ftrack_path: 'Absence',
                                                        ftrack_task_name: status,
                                                        ftrack_task_type: ''
                                                    });
                                                }}
                                                className="flex-1 py-1.5 px-2 text-xs font-medium text-center text-[#abb2bf] bg-[#1e2227] hover:bg-[#3a3f4b] hover:text-white border border-[#3a3f4b] rounded transition-colors"
                                            >
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                            </div>
                            <div className="flex justify-end gap-3 mt-8">
                                <button
                                    onClick={() => {
                                        setShowCreateDialog(null);
                                        setSelectedPath(null);
                                        setIsPathPickerOpen(false);
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-[#abb2bf] hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={!selectedPath}
                                    onClick={() => {
                                        if (!selectedPath) return;

                                        const [dh, dm] = showCreateDialog.durationStr.split(':').map(Number);
                                        const computedDurationSeconds = (dh * 3600) + (dm * 60);

                                        addLog({
                                            description: '',
                                            ftrack_path: selectedPath.ftrack_path,
                                            ftrack_task_name: selectedPath.ftrack_task_name,
                                            ftrack_task_type: selectedPath.ftrack_task_type,
                                            project_id: selectedPath.project_id,
                                            project_color: selectedPath.project_color,
                                            date: daysInterval[showCreateDialog.dayIdx],
                                            start_time: showCreateDialog.startTime,
                                            end_time: showCreateDialog.endTime,
                                            duration: computedDurationSeconds,
                                            status: 'logged'
                                        })
                                        setShowCreateDialog(null)
                                        setSelectedPath(null)
                                        setIsPathPickerOpen(false)
                                    }}
                                    className={clsx(
                                        "px-4 py-2 text-sm font-semibold rounded transition-colors shadow-sm",
                                        selectedPath
                                            ? "bg-[#61afef] hover:bg-[#5294cc] text-[#282c34]"
                                            : "bg-[#3a3f4b] text-[#5c6370] cursor-not-allowed"
                                    )}
                                >
                                    Save Log
                                </button>
                            </div>
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
