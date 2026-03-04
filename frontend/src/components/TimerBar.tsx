import { useState, useEffect } from 'react'
import { Play, Square, Tag, DollarSign, Folder, Layers, Target } from 'lucide-react'
import { clsx } from 'clsx'

export default function TimerBar() {
    const [isRunning, setIsRunning] = useState(false)
    const [seconds, setSeconds] = useState(0)
    const [billable, setBillable] = useState(true)

    // Basic timer logic
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>
        if (isRunning) {
            interval = setInterval(() => {
                setSeconds(s => s + 1)
            }, 1000)
        }
        return () => clearInterval(interval)
    }, [isRunning])

    const formatTime = (totalSeconds: number) => {
        const hrs = Math.floor(totalSeconds / 3600)
        const mins = Math.floor((totalSeconds % 3600) / 60)
        const secs = totalSeconds % 60
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    const toggleTimer = () => {
        setIsRunning(!isRunning)
    }

    return (
        <div className="h-16 bg-[#2c313a] border-b border-[#3a3f4b] shadow-sm flex items-center justify-between px-6 z-10 sticky top-0">

            {/* Left side: Project / Path / Task Selection */}
            <div className="flex-1 flex items-center gap-6 max-w-4xl">
                <button className="flex items-center gap-2 text-[#abb2bf] hover:text-white transition-colors text-sm font-medium bg-[#1e2227] px-3 py-1.5 rounded-md border border-[#3a3f4b] hover:border-[#61afef] group">
                    <Folder size={16} className="text-[#61afef] group-hover:text-[#5294cc] transition-colors" />
                    <span>Select Project</span>
                </button>

                <div className="text-[#5c6370] text-sm font-mono">/</div>

                <button className="flex items-center gap-2 text-[#abb2bf] hover:text-white transition-colors text-sm font-medium bg-[#1e2227] px-3 py-1.5 rounded-md border border-[#3a3f4b] hover:border-[#c678dd] group">
                    <Layers size={16} className="text-[#c678dd] group-hover:text-[#b462cc] transition-colors" />
                    <span>Select Path</span>
                </button>

                <div className="text-[#5c6370] text-sm font-mono">/</div>

                <button className="flex items-center gap-2 text-[#abb2bf] hover:text-white transition-colors text-sm font-medium bg-[#1e2227] px-3 py-1.5 rounded-md border border-[#3a3f4b] hover:border-[#98c379] group">
                    <Target size={16} className="text-[#98c379] group-hover:text-[#8aba67] transition-colors" />
                    <span>Select Task</span>
                </button>
            </div>

            {/* Right side: Toggles & Start Button */}
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                    <button
                        className="text-[#abb2bf] hover:text-[#e5c07b] transition-colors"
                        title="Add Tags"
                    >
                        <Tag size={18} />
                    </button>

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
                </div>

                <div className="flex items-center gap-4 bg-[#3a3f4b] rounded-full pl-5 pr-1 py-1 shadow-inner">
                    <div className="font-mono text-lg font-semibold tracking-wider text-white min-w-[100px] text-center">
                        {formatTime(seconds)}
                    </div>

                    <button
                        onClick={toggleTimer}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all shadow-md ",
                            isRunning
                                ? "bg-[#e06c75] hover:bg-[#be5046] text-white"
                                : "bg-[#98c379] hover:bg-[#7cb359] text-[#1e2227]"
                        )}
                    >
                        {isRunning ? (
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
