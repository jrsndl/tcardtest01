import { Layers, Users, TrendingUp, Settings as SettingsIcon, Tag } from 'lucide-react'
import { useTimeTracker } from '../context/TimeTrackerContext'
function ViewSection({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) {
    return (
        <div className="flex flex-col h-full bg-[#21252b] p-6 max-w-6xl mx-auto w-full">
            <div className="flex items-center gap-3 mb-8 border-b border-[#3a3f4b] pb-4">
                <Icon size={28} className="text-[#61afef]" />
                <h1 className="text-2xl font-semibold text-white">{title}</h1>
            </div>
            <div className="flex-1 bg-[#282c33] rounded-md border border-[#3a3f4b] p-8 flex items-center justify-center text-[#abb2bf] shadow-sm">
                {children}
            </div>
        </div>
    )
}

export function Projects() {
    const { projects, logs } = useTimeTracker()

    const formatHours = (secs: number) => {
        const h = Math.floor(secs / 3600)
        const m = Math.floor((secs % 3600) / 60)
        return `${h}h ${m}m`
    }

    return (
        <div className="flex flex-col h-full bg-[#21252b] p-6 max-w-6xl mx-auto w-full">
            <div className="flex items-center justify-between mb-8 border-b border-[#3a3f4b] pb-4">
                <div className="flex items-center gap-3">
                    <Layers size={28} className="text-[#61afef]" />
                    <h1 className="text-2xl font-semibold text-white">Projects</h1>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 self-start w-full">
                {projects.map(project => {
                    const projectLogs = logs.filter(l => l.project_id === project.id)
                    const totalSecs = projectLogs.reduce((acc, l) => acc + l.duration, 0)

                    return (
                        <div key={project.id} className="bg-[#282c33] border border-[#3a3f4b] rounded-lg p-6 hover:border-[#61afef] transition-colors relative overflow-hidden group">
                            <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: project.color }} />

                            <h2 className="text-lg font-semibold text-white mb-2 group-hover:text-[#61afef] transition-colors">{project.name}</h2>
                            <p className="text-sm text-[#abb2bf] mb-6 font-mono">{project.id}</p>

                            <div className="flex items-center justify-between pt-4 border-t border-[#3a3f4b]/50">
                                <span className="text-xs font-medium text-[#5c6370]">TOTAL LOGGED</span>
                                <span className="text-lg font-bold text-[#e5c07b] font-mono">{formatHours(totalSecs)}</span>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export function Team() {
    return (
        <ViewSection title="Team" icon={Users}>
            <div className="text-center">
                <h2 className="text-xl mb-4 text-[#98c379]">Team Members</h2>
                <p>List of artists and management synced from Ftrack, along with their hourly rates and timezone data.</p>
            </div>
        </ViewSection>
    )
}

export function Reports() {
    return (
        <ViewSection title="Reports" icon={TrendingUp}>
            <div className="text-center">
                <h2 className="text-xl mb-4 text-[#c678dd]">Analytics & Exports</h2>
                <p>Time logs aggregation, charts (via Recharts), and management CSV export functionality will reside here.</p>
            </div>
        </ViewSection>
    )
}

export function Tags() {
    return (
        <ViewSection title="Tags" icon={Tag}>
            <div className="text-center">
                <h2 className="text-xl mb-4 text-[#d19a66]">Workspace Tags</h2>
                <p>Manage custom tags for detailed time filtering.</p>
            </div>
        </ViewSection>
    )
}

export function Settings() {
    return (
        <ViewSection title="Settings" icon={SettingsIcon}>
            <div className="text-center">
                <h2 className="text-xl mb-4 text-[#56b6c2]">Workspace Settings</h2>
                <p>Configuration for auto-submit times, working hours warnings, and Ftrack synchronization thresholds.</p>
            </div>
        </ViewSection>
    )
}
