import { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Plus, Star } from 'lucide-react'
import { format, addDays, startOfWeek, endOfWeek, subDays, subWeeks, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns'
import { clsx } from 'clsx'
import { useTimeTracker } from '../context/TimeTrackerContext'
import FilterPanel from '../components/FilterPanel'

// Mock Data structure removed, now using Context

interface TimesheetCell {
    id: string | null;
    hours: number;
    bid: number;
    start: string;
    end: string;
}

type TimesheetData = Record<string, TimesheetCell[]>;

export default function Timesheet() {
    const { projects, logs, addLog, updateLog, favoriteTasks, toggleFavoriteTask } = useTimeTracker()
    const today = new Date()
    const [dateIn, setDateIn] = useState(startOfWeek(today, { weekStartsOn: 1 }))
    const [dateOut, setDateOut] = useState(endOfWeek(today, { weekStartsOn: 1 }))
    const [isFilterPinned, setIsFilterPinned] = useState(true)

    // Generate array of days between dateIn and dateOut
    const daysInterval = eachDayOfInterval({ start: dateIn, end: dateOut })

    // Get unique tasks from logs
    const activeTasks = Array.from(new Set(logs.map(l => `${l.project_id}|${l.ftrack_path}|${l.ftrack_task_name}`)))
        .map(key => {
            const [project_id, ftrack_path, ftrack_task_name] = key.split('|')
            const proj = projects.find(p => p.id === project_id)
            const firstLog = logs.find(l => l.project_id === project_id && l.ftrack_path === ftrack_path && l.ftrack_task_name === ftrack_task_name && l.thumbnail_url)
            return {
                key,
                project_id,
                project_name: proj?.name || project_id,
                project_color: proj?.color || '#ffffff',
                ftrack_path,
                ftrack_task_name,
                thumbnail_url: firstLog?.thumbnail_url
            }
        }).sort((a, b) => {
            const aFav = favoriteTasks.includes(a.key)
            const bFav = favoriteTasks.includes(b.key)
            if (aFav && !bFav) return -1
            if (!aFav && bFav) return 1
            return a.project_name.localeCompare(b.project_name)
        })

    // Compute derived data mapped for grid from global logs
    const data = activeTasks.reduce((acc, task) => {
        acc[task.key] = daysInterval.map(day => {
            const dayLogs = logs.filter(l => l.project_id === task.project_id && l.ftrack_path === task.ftrack_path && l.ftrack_task_name === task.ftrack_task_name && isSameDay(l.date, day))
            if (dayLogs.length > 0) {
                const totalDuration = dayLogs.reduce((sum, l) => sum + l.duration, 0)
                return {
                    id: dayLogs[0].id,
                    hours: totalDuration / 3600,
                    bid: dayLogs[0].bid_time ? dayLogs[0].bid_time / 3600 : 0,
                    start: dayLogs[0].start_time || '',
                    end: dayLogs[0].end_time || ''
                }
            }
            return { id: null, hours: 0, bid: 0, start: '', end: '' }
        })
        return acc
    }, {} as TimesheetData)

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

    const handleCellChange = (taskKey: string, dayIndex: number, field: string, value: string) => {
        const day = daysInterval[dayIndex]
        const task = activeTasks.find(t => t.key === taskKey)
        if (!task) return

        const dayLogs = logs.filter(l => l.project_id === task.project_id && l.ftrack_path === task.ftrack_path && l.ftrack_task_name === task.ftrack_task_name && isSameDay(l.date, day))
        const log = dayLogs[0]

        if (log) {
            if (field === 'hours' && (value === '' || parseFloat(value) === 0)) {
                // Only delete if it's the duration field being zeroed, but maybe prompt user? To keep it simple, let's just update duration to 0
                updateLog(log.id, { duration: 0 })
                return
            }

            let updates: any = {}
            if (field === 'hours') updates.duration = (parseFloat(value) || 0) * 3600
            if (field === 'start') updates.start_time = value
            if (field === 'end') updates.end_time = value
            updateLog(log.id, updates)
        } else {
            if (!value || value === '0') return // Don't create empty logs

            let duration = 0
            let start_time = '09:00'
            let end_time = '10:00'

            if (field === 'hours') duration = (parseFloat(value) || 0) * 3600
            if (field === 'start') start_time = value
            if (field === 'end') end_time = value

            addLog({
                description: 'New timesheet entry',
                start_time,
                end_time,
                duration,
                project_id: task.project_id,
                project_color: task.project_color,
                ftrack_path: task.ftrack_path,
                ftrack_task_name: task.ftrack_task_name,
                ftrack_task_type: 'Unknown',
                status: 'logged',
                date: day
            })
        }
    }

    const formatHours = (hours: number) => {
        if (hours === 0) return ''
        const h = Math.floor(hours)
        const m = Math.round((hours - h) * 60)
        if (m === 0) return `${h}:00`
        return `${h}:${m.toString().padStart(2, '0')}`
    }

    // Calculate Totals dynamically based on visible days
    const dayTotals = daysInterval.map((_, i) =>
        Object.values(data).reduce((sum, row) => sum + (row[i]?.hours || 0), 0)
    )
    const weekTotal = dayTotals.reduce((a, b) => a + b, 0)

    return (
        <div className="flex h-full bg-[#21252b] p-6 max-w-7xl mx-auto w-full">
            <div className="flex flex-col flex-1 h-full min-w-0 pr-2">
                {/* Header controls & Filters */}
                <div className="flex flex-col gap-4 mb-6 pb-4 border-b border-[#3a3f4b]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <h1 className="text-2xl font-semibold text-white">Timesheet</h1>
                            <span className="font-mono font-medium text-[#abb2bf] bg-[#2c313a] px-3 py-1 rounded-full border border-[#3a3f4b] text-sm">
                                Total: {formatHours(weekTotal) || '0:00'}
                            </span>
                            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#61afef] hover:bg-[#5294cc] text-[#282c34] font-medium text-sm transition-colors shadow-sm">
                                <Plus size={16} />
                                Add Project/Task
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            {!isFilterPinned && (
                                <FilterPanel
                                    isPinned={isFilterPinned}
                                    onTogglePin={() => setIsFilterPinned(!isFilterPinned)}
                                    onFilterChange={(newFilters) => console.log('Filters updated:', newFilters)}
                                />
                            )}
                        </div>

                        {/* Date Navigation */}
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

                    {/* Additional Pickers & Quick Dates */}
                    <div className="flex items-center justify-end">

                        <div className="flex items-center gap-1 text-sm bg-[#1e2227] border border-[#3a3f4b] rounded p-1">
                            {['Today', 'Yesterday', 'This Week', 'Last Week', 'This Month', 'Last Month'].map((range, i) => (
                                <button key={i} onClick={() => setQuickDate(range)} className={clsx(
                                    "px-3 py-1 rounded transition-colors",
                                    isPresetActive(range) ? "bg-[#3a3f4b] text-white font-medium shadow-sm" : "hover:bg-[#2c313a] text-[#abb2bf] hover:text-white"
                                )}>
                                    {range}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Grid Container */}
                <div className="bg-[#282c33] border border-[#3a3f4b] rounded-md shadow-sm flex flex-col overflow-hidden min-h-0">
                    <div className="overflow-x-auto overflow-y-auto">
                        <div className="min-w-max flex flex-col h-full relative">

                            {/* Header Row */}
                            <div className="flex items-center bg-[#2c313a] border-b border-[#3a3f4b] sticky top-0 z-10">
                                <div className="w-16 py-3 border-r border-[#3a3f4b] text-center text-sm font-medium text-[#abb2bf] sticky left-0 bg-[#2c313a] z-20">Thumb</div>
                                <div className="w-[280px] px-3 py-3 border-r border-[#3a3f4b] text-sm font-medium text-[#abb2bf] sticky left-[64px] bg-[#2c313a] z-20 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">Task Info</div>
                                <div className="w-20 px-3 py-3 border-r border-[#3a3f4b] text-sm font-medium text-[#abb2bf] text-right">Bid</div>
                                <div className="w-24 px-4 py-3 border-r border-[#3a3f4b] text-center text-sm font-medium text-[#abb2bf]">Total</div>
                                {daysInterval.map((day, i) => (
                                    <div key={i} className={clsx(
                                        "px-1 py-2 border-l text-center w-28 border-[#3a3f4b]",
                                        i === 0 && "border-none"
                                    )}>
                                        <div className="text-xs text-[#5c6370] uppercase">{format(day, 'E')}</div>
                                        <div className={clsx(
                                            "text-sm font-medium mt-0.5",
                                            format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? "text-[#61afef]" : "text-[#abb2bf]"
                                        )}>
                                            {format(day, 'dd')}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Task Rows */}
                            <div className="flex flex-col flex-1">
                                {activeTasks.length === 0 && (
                                    <div className="p-8 text-center text-[#5c6370]">No tasks logged in this date range.</div>
                                )}
                                {activeTasks.map(task => {
                                    const rowData = data[task.key] || Array(14).fill({ hours: 0, bid: 0 })
                                    const rowTotal = rowData.reduce((a, b) => a + (b.hours || 0), 0)
                                    const firstBid = rowData.find(r => r.bid > 0)?.bid || null

                                    return (
                                        <div key={task.key} className="flex items-stretch border-b border-[#3a3f4b] group hover:bg-[#2c313a] transition-colors relative z-0">
                                            {/* Thumbnail */}
                                            <div className="w-16 h-[52px] shrink-0 bg-[#1e2227] group-hover:bg-[#2c313a] border-r border-[#3a3f4b] flex items-center justify-center overflow-hidden sticky left-0 z-10">
                                                {task.thumbnail_url ? (
                                                    <img src={task.thumbnail_url} alt="thumb" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                ) : (
                                                    <div className="text-[10px] text-[#5c6370]">Img</div>
                                                )}
                                            </div>

                                            {/* Task Info Cell */}
                                            <div className="w-[280px] px-3 py-2 flex items-center justify-between border-r border-[#3a3f4b] bg-[#282c33] group-hover:bg-[#2c313a] sticky left-[64px] z-10 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                                                <div className="flex flex-col justify-center gap-0.5 min-w-0 pr-2">
                                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: task.project_color }} />
                                                        <span className="text-xs truncate text-[#98c379]" title={task.project_name}>{task.project_name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                                        <span className="text-xs truncate text-[#5294cc] opacity-70" title={task.ftrack_path}>{task.ftrack_path}</span>
                                                        <span className="text-[#5c6370] text-[10px] shrink-0">/</span>
                                                        <span className="text-xs truncate text-[#abb2bf] font-medium shrink-0 max-w-[100px]" title={task.ftrack_task_name}>{task.ftrack_task_name}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleFavoriteTask(task.key);
                                                    }}
                                                    className="shrink-0 p-1.5 rounded-full hover:bg-black/20 transition-colors group/star"
                                                    title={favoriteTasks.includes(task.key) ? "Remove from favorites" : "Add to favorites directly"}
                                                >
                                                    <Star
                                                        size={14}
                                                        className={clsx(
                                                            "transition-colors",
                                                            favoriteTasks.includes(task.key) ? "fill-[#e5c07b] text-[#e5c07b]" : "text-[#5c6370] group-hover/star:text-[#abb2bf]"
                                                        )}
                                                    />
                                                </button>
                                            </div>
                                            <div className="w-20 px-3 flex items-center justify-end border-r border-[#3a3f4b] text-right">
                                                {firstBid ? (
                                                    <span className="text-[11px] font-mono text-[#5c6370]">{firstBid}h bid</span>
                                                ) : (
                                                    <span className="text-xs text-[#5c6370] italic">-</span>
                                                )}
                                            </div>
                                            <div className="w-24 px-4 flex items-center justify-center border-r border-[#3a3f4b] text-sm font-bold text-[#e5c07b]">
                                                {formatHours(rowTotal) || <span className="text-[#5c6370] opacity-50">-</span>}
                                            </div>

                                            {daysInterval.map((_, i) => {
                                                const cell = rowData[i] || { hours: 0, bid: 0 }
                                                return (
                                                    <div key={i} className="w-28 border-r border-[#3a3f4b] flex flex-col relative group/cell">
                                                        <div className="flex items-center justify-between border-b border-[#3a3f4b]/50 px-1 py-1">
                                                            <input
                                                                type="text"
                                                                placeholder="Start"
                                                                className="w-[45px] bg-transparent text-[10px] text-center text-[#5c6370] focus:text-white outline-none focus:bg-[#3a3f4b] rounded px-0.5"
                                                                value={cell.start || ''}
                                                                onChange={(e) => handleCellChange(task.key, i, 'start', e.target.value)}
                                                            />
                                                            <span className="text-[10px] text-[#5c6370]">-</span>
                                                            <input
                                                                type="text"
                                                                placeholder="End"
                                                                className="w-[45px] bg-transparent text-[10px] text-center text-[#5c6370] focus:text-white outline-none focus:bg-[#3a3f4b] rounded px-0.5"
                                                                value={cell.end || ''}
                                                                onChange={(e) => handleCellChange(task.key, i, 'end', e.target.value)}
                                                            />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            className="w-full h-full bg-transparent text-center text-white focus:bg-[#3a3f4b] focus:outline-none focus:ring-1 focus:ring-[#61afef] transition-colors hover:bg-white/5 py-2.5 placeholder-[#5c6370]"
                                                            value={formatHours(cell.hours)}
                                                            onChange={(e) => handleCellChange(task.key, i, 'hours', e.target.value)}
                                                            placeholder='-'
                                                        />
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Footer Totals */}
                            <div className="flex items-center bg-[#21252b] border-t-2 border-[#3a3f4b] sticky bottom-0 z-10 mt-auto">
                                <div className="w-[424px] px-4 py-4 text-right text-sm font-semibold text-[#abb2bf] uppercase tracking-wider border-r border-[#3a3f4b] sticky left-0 bg-[#21252b] z-20 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                                    Total Hours
                                </div>
                                <div className="w-24 px-4 py-4 flex items-center justify-center font-mono font-bold text-white text-lg border-r border-[#3a3f4b] bg-[#3a3f4b]/30">
                                    {formatHours(weekTotal) || '0:00'}
                                </div>
                                {dayTotals.map((total, i) => (
                                    <div key={i} className={clsx(
                                        "px-2 py-4 border-l border-[#3a3f4b] text-center font-mono font-semibold text-[#e5c07b] w-28",
                                        i === 0 && "border-none"
                                    )}>
                                        {formatHours(total)}
                                    </div>
                                ))}
                            </div>

                        </div>
                    </div>
                </div>

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
