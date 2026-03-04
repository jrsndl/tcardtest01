import { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Plus } from 'lucide-react'
import { format, addDays, startOfWeek, endOfWeek, subDays, subWeeks, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns'
import { clsx } from 'clsx'
import { useTimeTracker } from '../context/TimeTrackerContext'

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
    const { projects, logs, addLog, updateLog } = useTimeTracker()
    const [viewMode, setViewMode] = useState<'duration' | 'calendar'>('duration')

    // Instead of a single currentDate, we now have an explicit in/out range
    const today = new Date()
    const [dateIn, setDateIn] = useState(startOfWeek(today, { weekStartsOn: 1 }))
    const [dateOut, setDateOut] = useState(endOfWeek(today, { weekStartsOn: 1 }))

    const [activeRange, setActiveRange] = useState('This Week')

    // Generate array of days between dateIn and dateOut
    const daysInterval = eachDayOfInterval({ start: dateIn, end: dateOut })

    // Compute derived data mapped for grid from global logs
    const data = projects.reduce((acc, proj) => {
        acc[proj.id] = daysInterval.map(day => {
            const dayLogs = logs.filter(l => l.project_id === proj.id && isSameDay(l.date, day))
            if (dayLogs.length > 0) {
                // Return aggregated or first log
                const log = dayLogs[0]
                const totalDuration = dayLogs.reduce((sum, l) => sum + l.duration, 0)
                return {
                    id: log.id,
                    hours: totalDuration / 3600,
                    bid: log.bid_time ? log.bid_time / 3600 : 0,
                    start: log.start_time || '',
                    end: log.end_time || ''
                }
            }
            return { id: null, hours: 0, bid: 0, start: '', end: '' }
        })
        return acc
    }, {} as TimesheetData)

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

    const handleCellChange = (projectId: string, dayIndex: number, field: string, value: string) => {
        const day = daysInterval[dayIndex]
        const project = projects.find(p => p.id === projectId)
        if (!project) return

        const dayLogs = logs.filter(l => l.project_id === projectId && isSameDay(l.date, day))
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
                project_id: project.id,
                project_color: project.color,
                ftrack_path: '...',
                ftrack_task_name: 'Task',
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
        <div className="flex flex-col h-full bg-[#21252b] p-6 max-w-7xl mx-auto w-full">

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

                    {/* Date Navigation */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-[#282c33] rounded-md border border-[#3a3f4b] overflow-hidden">
                            <button onClick={() => {
                                setDateIn(prev => subDays(prev, 1))
                                setDateOut(prev => subDays(prev, 1))
                            }} className="px-3 py-1.5 hover:bg-[#3a3f4b] text-[#abb2bf] transition-colors"><ChevronLeft size={18} /></button>

                            <div className="px-4 py-1.5 text-sm font-medium text-white border-l border-r border-[#3a3f4b] flex items-center gap-2">
                                <Calendar size={16} className="text-[#61afef]" />
                                <div className="flex items-center gap-2">
                                    <span>{format(dateIn, 'MMM d, yyyy')}</span>
                                    <span className="text-[#5c6370]">→</span>
                                    <span>{format(dateOut, 'MMM d, yyyy')}</span>
                                </div>
                            </div>

                            <button onClick={() => {
                                setDateIn(prev => addDays(prev, 1))
                                setDateOut(prev => addDays(prev, 1))
                            }} className="px-3 py-1.5 hover:bg-[#3a3f4b] text-[#abb2bf] transition-colors"><ChevronRight size={18} /></button>
                        </div>
                    </div>
                </div>

                {/* Additional Pickers & Quick Dates */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <select
                            value={viewMode}
                            onChange={(e) => setViewMode(e.target.value as any)}
                            className="bg-[#282c33] border border-[#3a3f4b] text-[#abb2bf] text-sm rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#61afef]"
                        >
                            <option value="duration">Simple View</option>
                            <option value="calendar">Calendar View</option>
                        </select>
                        <select className="bg-[#282c33] border border-[#3a3f4b] text-[#abb2bf] text-sm rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#61afef]">
                            <option>All Projects, Paths and Tasks</option>
                            <option>Prj-Ayon</option>
                            <option>Prj-Commercial</option>
                        </select>
                        <select className="bg-[#282c33] border border-[#3a3f4b] text-[#abb2bf] text-sm rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#61afef] w-48">
                            <option>Me (jirka)</option>
                            <option>All Persons</option>
                            <option>Artist 1</option>
                            <option>Artist 2</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-1 text-sm bg-[#1e2227] border border-[#3a3f4b] rounded p-1">
                        {['Today', 'Yesterday', 'This Week', 'Last Week', 'This Month', 'Last Month'].map((range, i) => (
                            <button key={i} onClick={() => setQuickDate(range)} className={clsx(
                                "px-3 py-1 rounded transition-colors",
                                activeRange === range ? "bg-[#3a3f4b] text-white font-medium shadow-sm" : "hover:bg-[#2c313a] text-[#abb2bf] hover:text-white"
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
                            <div className="w-40 px-4 py-3 border-r border-[#3a3f4b] text-sm font-medium text-[#abb2bf] sticky left-[64px] bg-[#2c313a] z-20">Project</div>
                            <div className="w-48 px-4 py-3 border-r border-[#3a3f4b] text-sm font-medium text-[#abb2bf] sticky left-[224px] bg-[#2c313a] z-20 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">Path</div>
                            <div className="w-32 px-4 py-3 border-r border-[#3a3f4b] text-sm font-medium text-[#abb2bf] text-right">Task</div>
                            <div className="w-24 px-4 py-3 border-r border-[#3a3f4b] text-sm font-medium text-[#abb2bf] text-right">Bid</div>
                            {daysInterval.map((day, i) => (
                                <div key={i} className={clsx(
                                    "px-2 py-3 border-l text-center",
                                    viewMode === 'calendar' ? "w-40 border-[#3a3f4b]" : "w-24 border-[#3a3f4b]"
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
                            <div className="w-24 px-4 py-3 border-l border-[#3a3f4b] text-center text-sm font-medium text-[#abb2bf]">Total</div>
                        </div>

                        {/* Project Rows */}
                        <div className="flex flex-col flex-1">
                            {projects.map(project => {
                                const rowData = data[project.id as keyof typeof data] || Array(14).fill({ hours: 0, bid: 0 })
                                const rowTotal = rowData.reduce((a, b) => a + (b.hours || 0), 0)
                                const firstBid = rowData[0]?.bid || null

                                return (
                                    <div key={project.id} className="flex items-stretch border-b border-[#3a3f4b] group hover:bg-[#2c313a] transition-colors relative z-0">
                                        {/* Thumbnail */}
                                        <div className="w-16 h-[52px] shrink-0 bg-[#1e2227] group-hover:bg-[#2c313a] border-r border-[#3a3f4b] flex items-center justify-center overflow-hidden sticky left-0 z-10">
                                            {/* Thumbnail placeholder or path */}
                                            <div className="text-xs text-[#5c6370]">Img</div>
                                        </div>

                                        {/* Project Info */}
                                        <div className="w-40 px-4 flex items-center gap-2 border-r border-[#3a3f4b] bg-[#282c33] group-hover:bg-[#2c313a] sticky left-[64px] z-10">
                                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                                            <span className="text-sm truncate text-[#98c379]" title={project.name}>{project.name}</span>
                                        </div>
                                        <div className="w-48 px-4 flex items-center border-r border-[#3a3f4b] bg-[#282c33] group-hover:bg-[#2c313a] sticky left-[224px] z-10 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                                            <span className="text-sm truncate text-[#5294cc]" title={project.id}>{project.id}</span>
                                        </div>
                                        <div className="w-32 px-4 py-2 flex flex-col items-end justify-center border-r border-[#3a3f4b] text-right">
                                            <span className="text-sm truncate text-[#abb2bf] font-medium w-full" title="Any Task">Any Task</span>
                                        </div>
                                        <div className="w-24 px-4 flex items-center justify-end border-r border-[#3a3f4b] text-right">
                                            {firstBid ? (
                                                <span className="text-xs font-mono text-[#5c6370]">{firstBid}h bid</span>
                                            ) : (
                                                <span className="text-xs text-[#5c6370] italic">-</span>
                                            )}
                                        </div>

                                        {daysInterval.map((_, i) => {
                                            const cell = rowData[i] || { hours: 0, bid: 0 }
                                            return (
                                                <div key={i} className={clsx(
                                                    "border-r border-[#3a3f4b] flex flex-col relative group/cell",
                                                    viewMode === 'calendar' ? "w-40" : "w-24"
                                                )}>
                                                    {viewMode === 'calendar' && (
                                                        <div className="flex items-center justify-between border-b border-[#3a3f4b]/50 px-1 py-1">
                                                            <input
                                                                type="text"
                                                                placeholder="Start"
                                                                className="w-14 bg-transparent text-[10px] text-center text-[#5c6370] focus:text-white outline-none focus:bg-[#3a3f4b] rounded"
                                                                value={cell.start || ''}
                                                                onChange={(e) => handleCellChange(project.id, i, 'start', e.target.value)}
                                                            />
                                                            <span className="text-[10px] text-[#5c6370]">-</span>
                                                            <input
                                                                type="text"
                                                                placeholder="End"
                                                                className="w-14 bg-transparent text-[10px] text-center text-[#5c6370] focus:text-white outline-none focus:bg-[#3a3f4b] rounded"
                                                                value={cell.end || ''}
                                                                onChange={(e) => handleCellChange(project.id, i, 'end', e.target.value)}
                                                            />
                                                        </div>
                                                    )}
                                                    <input
                                                        type="text"
                                                        className="w-full h-full bg-transparent text-center text-white focus:bg-[#3a3f4b] focus:outline-none focus:ring-1 focus:ring-[#61afef] transition-colors hover:bg-white/5 py-4 placeholder-[#5c6370]"
                                                        value={formatHours(cell.hours)}
                                                        onChange={(e) => handleCellChange(project.id, i, 'hours', e.target.value)}
                                                        placeholder='-'
                                                    />
                                                </div>
                                            )
                                        })}

                                        <div className="w-24 px-4 flex items-center justify-center font-mono font-semibold text-[#98c379]">
                                            {formatHours(rowTotal)}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Footer Totals */}
                        <div className="flex items-center bg-[#21252b] border-t-2 border-[#3a3f4b] sticky bottom-0 z-10 mt-auto">
                            <div className="w-[416px] px-4 py-4 text-right text-sm font-semibold text-[#abb2bf] uppercase tracking-wider border-r border-[#3a3f4b] sticky left-0 bg-[#21252b] z-20 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                                Total Hours
                            </div>
                            <div className="min-w-[128px] flex-1 px-4 py-4 border-r border-[#3a3f4b]"></div>
                            {dayTotals.map((total, i) => (
                                <div key={i} className={clsx(
                                    "px-2 py-4 border-l border-[#3a3f4b] text-center font-mono font-semibold text-[#e5c07b]",
                                    viewMode === 'calendar' ? "w-40" : "w-24"
                                )}>
                                    {formatHours(total)}
                                </div>
                            ))}
                            <div className="w-24 px-4 py-4 border-l border-[#3a3f4b] flex items-center justify-center font-mono font-bold text-white text-lg bg-[#3a3f4b]/30">
                                {formatHours(weekTotal)}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

        </div>
    )
}
