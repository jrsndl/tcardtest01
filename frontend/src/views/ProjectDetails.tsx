import { useState } from 'react'
import { ChevronLeft, Save } from 'lucide-react'
import { useTimeTracker } from '../context/TimeTrackerContext'
import type { Project } from '../context/TimeTrackerContext'
import { clsx } from 'clsx'

export default function ProjectDetails({ project, onClose }: { project: Project, onClose: () => void }) {
    const { logs, updateProject, formatCurrency } = useTimeTracker()
    const [activeTab, setActiveTab] = useState<'overview' | 'edit'>('overview')
    const [formData, setFormData] = useState<Project>(project)

    const projectLogs = logs.filter(l => l.project_id === project.id)
    const totalSecs = projectLogs.reduce((acc, l) => acc + l.duration, 0)

    const formatHours = (secs: number) => {
        const h = Math.floor(secs / 3600)
        const m = Math.floor((secs % 3600) / 60)
        return `${h}h ${m}m`
    }

    const handleChange = (field: keyof Project, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSave = () => {
        updateProject(project.id, formData)
        // Switch back to overview on save
        setActiveTab('overview')
    }

    return (
        <div className="flex flex-col h-full w-full bg-[#21252b] animate-in slide-in-from-right-8 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#3a3f4b]">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-md hover:bg-[#3a3f4b] text-[#abb2bf] hover:text-white transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
                            <h1 className="text-2xl font-semibold text-white">{project.name}</h1>
                        </div>
                        <p className="text-sm text-[#5c6370] font-mono mt-0.5">{project.id} ({project.short_name})</p>
                    </div>
                </div>

                <div className="flex items-center bg-[#1e2227] rounded-md p-1 border border-[#3a3f4b]">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={clsx(
                            "px-4 py-1.5 rounded text-sm font-medium transition-colors",
                            activeTab === 'overview' ? "bg-[#3a3f4b] text-white shadow-sm" : "text-[#abb2bf] hover:text-white hover:bg-[#2c313a]"
                        )}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('edit')}
                        className={clsx(
                            "px-4 py-1.5 rounded text-sm font-medium transition-colors",
                            activeTab === 'edit' ? "bg-[#3a3f4b] text-white shadow-sm" : "text-[#abb2bf] hover:text-white hover:bg-[#2c313a]"
                        )}
                    >
                        Edit Details
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
                {activeTab === 'overview' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
                        {/* Stats Card */}
                        <div className="bg-[#282c33] border border-[#3a3f4b] rounded-lg p-6">
                            <h3 className="text-[#e5c07b] font-medium mb-4">Project Statistics</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center pb-3 border-b border-[#3a3f4b]/50">
                                    <span className="text-[#abb2bf] text-sm">Total Time Logged</span>
                                    <span className="text-white font-mono font-medium">{formatHours(totalSecs)}</span>
                                </div>
                                <div className="flex justify-between items-center pb-3 border-b border-[#3a3f4b]/50">
                                    <span className="text-[#abb2bf] text-sm">Active Team Size</span>
                                    <span className="text-white font-mono font-medium">{project.assigned_users?.length || 0} Members</span>
                                </div>
                                <div className="flex justify-between items-center pb-3 border-b border-[#3a3f4b]/50">
                                    <span className="text-[#abb2bf] text-sm">Total Logs</span>
                                    <span className="text-white font-mono font-medium">{projectLogs.length} Entries</span>
                                </div>
                            </div>
                        </div>

                        {/* Ftrack Sync Info Card */}
                        <div className="bg-[#282c33] border border-[#3a3f4b] rounded-lg p-6">
                            <h3 className="text-[#61afef] font-medium mb-4">Ftrack Sync Information</h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="block text-xs text-[#5c6370] uppercase mb-1">Start Date</span>
                                        <span className="text-white text-sm">{project.start_date || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs text-[#5c6370] uppercase mb-1">End Date</span>
                                        <span className="text-white text-sm">{project.end_date || 'N/A'}</span>
                                    </div>
                                </div>
                                <div>
                                    <span className="block text-xs text-[#5c6370] uppercase mb-1">Departments</span>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {project.departments?.length ? project.departments.map(d => (
                                            <span key={d} className="px-2 py-0.5 bg-[#1e2227] border border-[#3a3f4b] rounded text-xs text-[#abb2bf]">{d}</span>
                                        )) : <span className="text-sm text-[#5c6370]">None synced</span>}
                                    </div>
                                </div>
                                <div>
                                    <span className="block text-xs text-[#5c6370] uppercase mb-1">Project Groups</span>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {project.project_group?.length ? project.project_group.map(g => (
                                            <span key={g} className="px-2 py-0.5 bg-[#1e2227] border border-[#3a3f4b] rounded text-xs text-[#abb2bf]">{g}</span>
                                        )) : <span className="text-sm text-[#5c6370]">None assigned</span>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Financials & Client Card */}
                        <div className="bg-[#282c33] border border-[#3a3f4b] rounded-lg p-6 md:col-span-2">
                            <h3 className="text-[#98c379] font-medium mb-4">Financials & Client</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <span className="block text-xs text-[#5c6370] uppercase mb-1">Client to Invoice</span>
                                    <span className="text-white text-sm">{project.client_invoice || 'Unassigned'}</span>
                                </div>
                                <div>
                                    <span className="block text-xs text-[#5c6370] uppercase mb-1">Bid Price</span>
                                    <span className="text-white text-sm font-mono" title={`${project.bid_price.toLocaleString()} ${project.currency || 'USD'} Native`}>
                                        {project.bid_price > 0 ? formatCurrency(project.bid_price, project.currency || 'USD') : 'TBD'}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-xs text-[#5c6370] uppercase mb-1">Contacts</span>
                                    <span className="text-white text-sm">{project.contacts || 'None'}</span>
                                </div>
                            </div>

                            {project.notes && (
                                <div className="mt-6 pt-6 border-t border-[#3a3f4b]/50">
                                    <span className="block text-xs text-[#5c6370] uppercase mb-2">Notes</span>
                                    <p className="text-[#abb2bf] text-sm whitespace-pre-wrap">{project.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="max-w-3xl bg-[#282c33] border border-[#3a3f4b] rounded-lg p-6">
                        <div className="flex justify-between items-center mb-6 border-b border-[#3a3f4b] pb-4">
                            <h2 className="text-lg font-medium text-white">Edit Custom Fields</h2>
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 bg-[#98c379] hover:bg-[#7cb653] text-[#282c34] px-4 py-2 rounded-md font-medium text-sm transition-colors"
                            >
                                <Save size={16} /> Save Changes
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-[#abb2bf] mb-1.5">
                                        Bid Price <span className="text-xs text-[#5c6370] font-normal">(in {formData.currency || 'USD'})</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.bid_price || ''}
                                        onChange={e => handleChange('bid_price', Number(e.target.value))}
                                        className="w-full bg-[#1e2227] border border-[#3a3f4b] rounded p-2.5 text-white text-sm focus:outline-none focus:border-[#61afef]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#abb2bf] mb-1.5">Currency</label>
                                    <input
                                        type="text"
                                        value={formData.currency || ''}
                                        onChange={e => handleChange('currency', e.target.value)}
                                        placeholder="e.g. USD, EUR"
                                        className="w-full bg-[#1e2227] border border-[#3a3f4b] rounded p-2.5 text-white text-sm focus:outline-none focus:border-[#61afef]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-[#abb2bf] mb-1.5">Client to Invoice</label>
                                    <input
                                        type="text"
                                        value={formData.client_invoice || ''}
                                        onChange={e => handleChange('client_invoice', e.target.value)}
                                        className="w-full bg-[#1e2227] border border-[#3a3f4b] rounded p-2.5 text-white text-sm focus:outline-none focus:border-[#61afef]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#abb2bf] mb-1.5">Contacts</label>
                                    <input
                                        type="text"
                                        value={formData.contacts || ''}
                                        onChange={e => handleChange('contacts', e.target.value)}
                                        className="w-full bg-[#1e2227] border border-[#3a3f4b] rounded p-2.5 text-white text-sm focus:outline-none focus:border-[#61afef]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#abb2bf] mb-1.5">Project Notes</label>
                                <textarea
                                    value={formData.notes || ''}
                                    onChange={e => handleChange('notes', e.target.value)}
                                    rows={4}
                                    className="w-full bg-[#1e2227] border border-[#3a3f4b] rounded p-2.5 text-white text-sm focus:outline-none focus:border-[#61afef] resize-y"
                                />
                            </div>

                            <div className="p-4 bg-[#1e2227] border border-[#3a3f4b] rounded text-sm text-[#abb2bf]">
                                <p><strong>Note:</strong> Fields like Start Date, End Date, Assigned Users, and Departments are synced automatically from Ftrack and cannot be edited here directly.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
