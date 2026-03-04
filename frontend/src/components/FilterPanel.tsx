import { useState } from 'react'
import { Filter, X, Search, Pin, PinOff } from 'lucide-react'
import { clsx } from 'clsx'

interface FilterState {
    timeFilter: string
    projects: string[] // 'all-active', 'all', or array of IDs
    persons: string[] // 'me', 'all', or array of names
    taskTypes: string[]
    taskName: string
    statusesInclude: string[]
    statusesExclude: string[]
}

const initialFilters: FilterState = {
    timeFilter: 'today',
    projects: ['all-active'],
    persons: ['me'],
    taskTypes: [],
    taskName: '',
    statusesInclude: [],
    statusesExclude: []
}

export default function FilterPanel({
    onFilterChange,
    isPinned,
    onTogglePin
}: {
    onFilterChange: (filters: FilterState) => void
    isPinned: boolean
    onTogglePin: () => void
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [filters, setFilters] = useState<FilterState>(initialFilters)

    const handleUpdate = (updates: Partial<FilterState>) => {
        const newFilters = { ...filters, ...updates }
        setFilters(newFilters)
        onFilterChange(newFilters)
    }

    const clearAll = () => {
        const cleared = {
            ...initialFilters,
            timeFilter: 'all',
            projects: ['all'],
            persons: ['all']
        }
        setFilters(cleared)
        onFilterChange(cleared)
    }

    // Helper for displaying active pill counts
    const activeCount =
        (filters.timeFilter !== 'all' ? 1 : 0) +
        (filters.projects[0] !== 'all' ? 1 : 0) +
        (filters.persons[0] !== 'all' ? 1 : 0) +
        (filters.taskName ? 1 : 0) +
        filters.taskTypes.length +
        filters.statusesInclude.length +
        filters.statusesExclude.length

    const panelContent = (
        <div className="flex flex-col h-full bg-[#282c33] border border-[#3a3f4b] rounded-md shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-[#3a3f4b] bg-[#2c313a]">
                <h3 className="font-semibold text-white">Advanced Filters</h3>
                <div className="flex items-center gap-3">
                    <button onClick={clearAll} className="text-xs text-[#abb2bf] hover:text-white underline">Clear</button>
                    <button onClick={onTogglePin} className="text-[#abb2bf] hover:text-white" title={isPinned ? "Unpin" : "Pin to right"}>
                        {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
                    </button>
                    {!isPinned && <button onClick={() => setIsOpen(false)} className="text-[#abb2bf] hover:text-white"><X size={18} /></button>}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Time Filter */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-[#5c6370] uppercase tracking-wider">Time</label>
                    <select
                        value={filters.timeFilter}
                        onChange={e => handleUpdate({ timeFilter: e.target.value })}
                        className="w-full bg-[#1e2227] border border-[#3a3f4b] text-[#abb2bf] text-sm rounded px-3 py-2 outline-none focus:border-[#61afef]"
                    >
                        <option value="today">Today</option>
                        <option value="yesterday">Yesterday</option>
                        <option value="current_week">Current Week</option>
                        <option value="last_week">Last Week</option>
                        <option value="this_month">This Month</option>
                        <option value="prev_month">Previous Month</option>
                        <option value="all">All Time</option>
                    </select>
                </div>

                {/* Projects Filter */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-[#5c6370] uppercase tracking-wider">Projects</label>
                    <select
                        value={filters.projects[0] || 'all'}
                        onChange={e => handleUpdate({ projects: [e.target.value] })}
                        className="w-full bg-[#1e2227] border border-[#3a3f4b] text-[#abb2bf] text-sm rounded px-3 py-2 outline-none focus:border-[#61afef]"
                    >
                        <option value="all-active">All Active Projects</option>
                        <option value="all">All Projects</option>
                        <option value="Prj-Ayon">Ayon Cloud Integration</option>
                        <option value="Prj-Commercial">Nike Commercial</option>
                    </select>
                </div>

                {/* Persons Filter */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-[#5c6370] uppercase tracking-wider">Person</label>
                    <select
                        value={filters.persons[0] || 'all'}
                        onChange={e => handleUpdate({ persons: [e.target.value] })}
                        className="w-full bg-[#1e2227] border border-[#3a3f4b] text-[#abb2bf] text-sm rounded px-3 py-2 outline-none focus:border-[#61afef]"
                    >
                        <option value="me">Assigned to Me</option>
                        <option value="all">Everyone</option>
                        <option value="artist1">Artist One</option>
                        <option value="artist2">Artist Two</option>
                    </select>
                </div>

                {/* Task Name Search */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-[#5c6370] uppercase tracking-wider">Task Name</label>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c6370]" />
                        <input
                            type="text"
                            placeholder="Custom task name..."
                            value={filters.taskName}
                            onChange={e => handleUpdate({ taskName: e.target.value })}
                            className="w-full bg-[#1e2227] border border-[#3a3f4b] text-[#abb2bf] text-sm rounded pl-8 pr-3 py-2 outline-none focus:border-[#61afef] placeholder:text-[#5c6370]"
                        />
                    </div>
                </div>

                {/* Task Types (Multi-select) */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-[#5c6370] uppercase tracking-wider">Task Types</label>
                    <div className="flex flex-wrap gap-1.5 p-2 bg-[#1e2227] border border-[#3a3f4b] rounded">
                        {['Comp', 'Anim', 'Light', 'Model', 'Rig', 'VFX', 'Prep'].map(type => {
                            const isSelected = filters.taskTypes.includes(type)
                            return (
                                <button
                                    key={type}
                                    onClick={() => {
                                        if (isSelected) {
                                            handleUpdate({ taskTypes: filters.taskTypes.filter(t => t !== type) })
                                        } else {
                                            handleUpdate({ taskTypes: [...filters.taskTypes, type] })
                                        }
                                    }}
                                    className={clsx(
                                        "px-2 py-0.5 text-xs rounded transition-colors border",
                                        isSelected
                                            ? "bg-[#61afef]/20 border-[#61afef] text-[#61afef] font-medium"
                                            : "bg-[#282c33] border-[#3a3f4b] text-[#abb2bf] hover:border-[#5c6370]"
                                    )}
                                >
                                    {type}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Task Status Include/Exclude Mock */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-[#5c6370] uppercase tracking-wider">Statuses</label>
                    <div className="flex flex-wrap gap-2 text-xs">
                        {['logged', 'submitted', 'approved', 'disputed'].map(status => {
                            const isInc = filters.statusesInclude.includes(status)
                            const isExc = filters.statusesExclude.includes(status)

                            return (
                                <button
                                    key={status}
                                    onClick={() => {
                                        if (isInc) handleUpdate({ statusesInclude: filters.statusesInclude.filter(s => s !== status), statusesExclude: [...filters.statusesExclude, status] })
                                        else if (isExc) handleUpdate({ statusesExclude: filters.statusesExclude.filter(s => s !== status) })
                                        else handleUpdate({ statusesInclude: [...filters.statusesInclude, status] })
                                    }}
                                    className={clsx(
                                        "px-2 py-1 rounded border",
                                        isInc ? "bg-[#3a3f4b] border-[#98c379] text-[#98c379]" :
                                            isExc ? "bg-[#3a3f4b] border-[#e06c75] text-[#e06c75] line-through" :
                                                "bg-[#1e2227] border-[#3a3f4b] text-[#abb2bf] hover:text-white"
                                    )}
                                >
                                    {status}
                                </button>
                            )
                        })}
                    </div>
                    <p className="text-[10px] text-[#5c6370] leading-tight mt-1">
                        Click once to Require. Click again to Exclude. Click a third time to ignore.
                    </p>
                </div>
            </div>
        </div>
    )

    if (isPinned) {
        return <div className="w-80 h-full pl-6 shrink-0">{panelContent}</div>
    }

    return (
        <div className="relative z-20">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors border",
                    isOpen || activeCount > 0
                        ? "bg-[#3a3f4b] text-white border-[#4b5363]"
                        : "bg-[#2c313a] text-[#abb2bf] hover:text-white border-[#3a3f4b]"
                )}
            >
                <Filter size={16} />
                Filters
                {activeCount > 0 && (
                    <span className="bg-[#61afef] text-[#282c34] text-xs font-bold px-1.5 rounded-full ml-1">
                        {activeCount}
                    </span>
                )}
            </button>

            {/* Flyout Panel */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 max-h-[70vh]">
                    {panelContent}
                </div>
            )}
        </div>
    )
}
