import { NavLink } from 'react-router-dom'
import {
    Clock,
    Calendar,
    CalendarDays,
    Briefcase,
    Users,
    BarChart2,
    Settings,
    ChevronLeft,
    ChevronRight
} from 'lucide-react'
import { clsx } from 'clsx'

interface SidebarProps {
    isOpen: boolean
    setIsOpen: (isOpen: boolean) => void
}

const navItems = [
    { path: '/tracker', icon: Clock, label: 'Tracker' },
    { path: '/timesheet', icon: Calendar, label: 'Timesheet' },
    { path: '/calendar', icon: CalendarDays, label: 'Calendar' },
    { path: '/projects', icon: Briefcase, label: 'Projects' },
    { path: '/team', icon: Users, label: 'Team' },
    { path: '/reports', icon: BarChart2, label: 'Reports' },
]

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
    return (
        <aside
            className={clsx(
                "bg-[#1e2227] border-r border-[#3a3f4b] transition-all duration-300 flex flex-col justify-between",
                isOpen ? "w-64" : "w-16",
                "h-full z-20"
            )}
        >
            <div className="flex flex-col flex-1 overflow-hidden">
                {/* Logo / Header */}
                <div className="h-16 flex items-center px-4 border-b border-[#3a3f4b]">
                    <div className="flex items-center gap-3 w-full">
                        {isOpen && <span className="text-white font-light text-xl tracking-wider truncate">Sand2Gold</span>}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 overflow-y-auto space-y-1 px-3">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => clsx(
                                "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors group relative",
                                isActive
                                    ? "bg-[#3a3f4b] text-white"
                                    : "text-[#abb2bf] hover:bg-[#2c313a] hover:text-white"
                            )}
                            title={!isOpen ? item.label : undefined}
                        >
                            <item.icon size={20} className="shrink-0" />
                            {isOpen && <span className="font-medium">{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>
            </div>

            {/* Bottom Actions */}
            <div className="p-3 border-t border-[#3a3f4b] space-y-1">
                <NavLink
                    to="/settings"
                    className={({ isActive }) => clsx(
                        "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors group relative",
                        isActive
                            ? "bg-[#3a3f4b] text-white"
                            : "text-[#abb2bf] hover:bg-[#2c313a] hover:text-white"
                    )}
                    title={!isOpen ? 'Settings' : undefined}
                >
                    <Settings size={20} className="shrink-0" />
                    {isOpen && <span className="font-medium">Settings</span>}
                </NavLink>

                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-[#abb2bf] hover:bg-[#2c313a] hover:text-white transition-colors"
                >
                    {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                    {isOpen && <span className="font-medium">Collapse</span>}
                </button>
            </div>
        </aside>
    )
}
