import { useState, useEffect, useRef } from 'react'
import { Play, Square, DollarSign, Folder, Layers, Target } from 'lucide-react'
import { clsx } from 'clsx'
import PathPicker from './PathPicker'
import { useTimeTracker } from '../context/TimeTrackerContext'
import type { FtrackNode } from '../context/TimeTrackerContext'

export default function TimerBar() {
    const { activeTimerId, stopTimer, logs, updateLog, projects, globalCurrency, setGlobalCurrency, settings } = useTimeTracker()
    const activeEntry = logs.find(l => l.id === activeTimerId)

    const [isRunning, setIsRunning] = useState(false)
    const [seconds, setSeconds] = useState(0)
    const [billable, setBillable] = useState(true)

    const [isPickerOpen, setIsPickerOpen] = useState(false)
    const [selectedProjectName, setSelectedProjectName] = useState('')
    const [selectedPath, setSelectedPath] = useState('')
    const [selectedTaskName, setSelectedTaskName] = useState('')
    const pickerRef = useRef<HTMLDivElement>(null)

    // Handle outside click to close picker
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setIsPickerOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Sync TimerBar state when a row's timer is started
    useEffect(() => {
        if (activeTimerId && activeEntry) {
            setSelectedProjectName(activeEntry.project_id)
            setSelectedPath(activeEntry.ftrack_path)
            setSelectedTaskName(activeEntry.ftrack_task_name)
            setSeconds(activeEntry.duration)
            setIsRunning(true)
        } else {
            setIsRunning(false)
        }
        // Exclude activeEntry from dependency to prevent resetting `seconds` constantly when duration ticks
    }, [activeTimerId])

    // Basic timer logic tied to context logs
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>
        if (isRunning) {
            interval = setInterval(() => {
                setSeconds(s => {
                    const newSecs = s + 1
                    if (activeTimerId) {
                        updateLog(activeTimerId, { duration: newSecs })
                    }
                    return newSecs
                })
            }, 1000)
        }
        return () => clearInterval(interval)
    }, [isRunning, activeTimerId, updateLog])

    const formatTime = (totalSeconds: number) => {
        const hrs = Math.floor(totalSeconds / 3600)
        const mins = Math.floor((totalSeconds % 3600) / 60)
        const secs = totalSeconds % 60
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    const formatDurationHrs = (secs: number) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        return `${h}:${m.toString().padStart(2, '0')}`;
    };

    const renderBidWidget = () => {
        if (!selectedProjectName || !selectedTaskName) return null;

        const relatedLogs = logs.filter(l => l.project_id === selectedProjectName && l.ftrack_path === selectedPath && l.ftrack_task_name === selectedTaskName);
        if (relatedLogs.length === 0) return null;

        const bidSecs = relatedLogs[0].bid_time;
        if (!bidSecs) return null;

        let totalLoggedSecs = relatedLogs.reduce((acc, l) => acc + l.duration, 0);

        if (activeTimerId) {
            const activeLog = logs.find(l => l.id === activeTimerId);
            if (activeLog && activeLog.project_id === selectedProjectName && activeLog.ftrack_task_name === selectedTaskName) {
                totalLoggedSecs = totalLoggedSecs - activeLog.duration + seconds;
            }
        } else if (isRunning) {
            totalLoggedSecs += seconds;
        }

        const percentage = Math.min(100, Math.round((totalLoggedSecs / bidSecs) * 100));
        const isOver = totalLoggedSecs > bidSecs;

        const color = isOver ? '#e06c75' : '#98c379';
        const remainingColor = '#3a3f4b';
        const bidHrs = bidSecs / 3600;

        return (
            <div className="flex items-center gap-2 pl-3 ml-3 border-l border-[#3a3f4b]" title={`Total logged: ${formatDurationHrs(totalLoggedSecs)} / Bid: ${formatDurationHrs(bidSecs)}`}>
                <div
                    className="w-5 h-5 rounded-full"
                    style={{
                        background: `conic-gradient(${color} ${percentage}%, ${remainingColor} ${percentage}%)`
                    }}
                />
                <div className="flex flex-col justify-center">
                    <span className="text-[9px] text-[#5c6370] leading-none uppercase tracking-wider font-semibold">Bid: {bidHrs}h</span>
                    <span className="text-[10px] text-white leading-tight font-mono">{percentage}%</span>
                </div>
            </div>
        );
    };

    const toggleTimer = () => {
        if (activeTimerId) {
            stopTimer()
        } else {
            setIsRunning(!isRunning)
        }
    }

    return (
        <div className="h-16 bg-[#2c313a] border-b border-[#3a3f4b] shadow-sm flex items-center justify-between px-6 z-10 sticky top-0">

            {/* Left side: Project / Path / Task Selection */}
            <div className="flex-1 flex items-center gap-6 max-w-4xl relative" ref={pickerRef}>
                <div
                    className="flex items-center cursor-pointer group"
                    onClick={() => setIsPickerOpen(!isPickerOpen)}
                >
                    <button className="flex items-center gap-2 text-[#abb2bf] transition-colors text-sm font-medium bg-[#1e2227] px-4 py-1.5 rounded-md border border-[#3a3f4b] group-hover:border-[#61afef]">
                        {selectedTaskName ? (
                            <div className="flex items-center gap-2 max-w-[60vw]">
                                <Layers size={16} className="text-[#61afef] shrink-0" />
                                <span className="truncate max-w-[200px]" title={projects.find(p => p.id === selectedProjectName)?.name || selectedProjectName}>
                                    {projects.find(p => p.id === selectedProjectName)?.name || selectedProjectName}
                                </span>
                                <span className="text-[#5c6370] font-mono shrink-0">/</span>
                                <Folder size={16} className="text-[#c678dd] shrink-0" />
                                <span className="truncate max-w-[300px]">{selectedPath}</span>
                                <span className="text-[#5c6370] font-mono shrink-0">/</span>
                                <Target size={16} className="text-[#98c379] shrink-0" />
                                <span className="truncate max-w-[200px] text-white font-semibold">{selectedTaskName}</span>
                            </div>
                        ) : (
                            <>
                                <Target size={16} className="text-[#61afef] group-hover:text-[#5294cc] transition-colors" />
                                <span>Select Task</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Path Picker Popover */}
                {isPickerOpen && (
                    <div className="absolute top-full left-0 mt-2 z-50">
                        <PathPicker
                            onClose={() => setIsPickerOpen(false)}
                            onSelect={(node: FtrackNode, path: string[]) => {
                                // Extract project and middle path
                                const projectName = path.length > 0 ? path[0] : node.name;
                                const middlePath = path.length > 1 ? path.slice(1).join('/') : '...';

                                setSelectedProjectName(projectName);
                                setSelectedPath(middlePath);
                                setSelectedTaskName(node.name);
                                setIsPickerOpen(false);
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Right side: Toggles & Start Button */}
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3 pr-4">
                    <select
                        value={globalCurrency}
                        onChange={(e) => setGlobalCurrency(e.target.value)}
                        className="bg-[#1e2227] border border-[#3a3f4b] text-[#abb2bf] text-sm rounded px-2 py-1 outline-none focus:border-[#61afef] transition-colors cursor-pointer mr-2"
                        title="Display Currency"
                    >
                        {settings.currency.bookmarks.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>

                    <button
                        className={clsx(
                            "transition-colors",
                            billable ? "text-[#98c379]" : "text-[#abb2bf] hover:text-white"
                        )}
                        onClick={() => setBillable(!billable)}
                        title="Toggle Billable"
                    >
                        <DollarSign size={18} />
                    </button>
                    {renderBidWidget()}
                </div>

                <div className="flex items-center gap-4 bg-[#3a3f4b] rounded-full pl-5 pr-1 py-1 shadow-inner">
                    <div className="font-mono text-lg font-semibold tracking-wider text-white min-w-[100px] text-center">
                        {formatTime(seconds)}
                    </div>

                    <button
                        onClick={toggleTimer}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all shadow-md ",
                            (isRunning || activeTimerId)
                                ? "bg-[#e06c75] hover:bg-[#be5046] text-white"
                                : "bg-[#98c379] hover:bg-[#7cb359] text-[#1e2227]"
                        )}
                    >
                        {(isRunning || activeTimerId) ? (
                            <>
                                <Square size={16} fill="currentColor" />
                                <span>STOP</span>
                            </>
                        ) : (
                            <>
                                <Play size={16} fill="currentColor" />
                                <span>START</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
