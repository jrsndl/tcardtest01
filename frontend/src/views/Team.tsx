import { useState } from 'react'
import { Users, Building2, Layers, Key, Save, Plus, Trash2 } from 'lucide-react'
import { useTimeTracker } from '../context/TimeTrackerContext'
import type { User, Unit, AccessRole } from '../context/TimeTrackerContext'
import { clsx } from 'clsx'

const ALL_CURRENCIES = ['USD', 'EUR', 'GBP', 'CZK', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK', 'NZD']

export default function Team() {
    const [activeTab, setActiveTab] = useState<'users' | 'units' | 'departments' | 'access'>('users')

    return (
        <div className="flex flex-col h-full bg-[#21252b] p-6 max-w-7xl mx-auto w-full animate-in fade-in duration-300">
            {/* Header & Main Nav */}
            <div className="flex items-center justify-between mb-8 border-b border-[#3a3f4b] pb-4">
                <div className="flex items-center gap-3">
                    <Users size={28} className="text-[#98c379]" />
                    <h1 className="text-2xl font-semibold text-white">Team Management</h1>
                </div>

                <div className="flex items-center bg-[#1e2227] rounded-md p-1 border border-[#3a3f4b]">
                    <NavBtn id="users" icon={Users} label="Users" current={activeTab} set={setActiveTab} />
                    <NavBtn id="units" icon={Building2} label="Units" current={activeTab} set={setActiveTab} />
                    <NavBtn id="departments" icon={Layers} label="Departments" current={activeTab} set={setActiveTab} />
                    <NavBtn id="access" icon={Key} label="Access" current={activeTab} set={setActiveTab} />
                </div>
            </div>

            {/* Sub-Views */}
            <div className="flex-1 overflow-y-auto">
                {activeTab === 'users' && <UsersSubtab />}
                {activeTab === 'units' && <UnitsSubtab />}
                {activeTab === 'departments' && <DepartmentsSubtab />}
                {activeTab === 'access' && <AccessSubtab />}
            </div>
        </div>
    )
}

function NavBtn({ id, icon: Icon, label, current, set }: any) {
    const active = current === id
    return (
        <button
            onClick={() => set(id)}
            className={clsx(
                "flex items-center gap-2 px-4 py-1.5 rounded text-sm font-medium transition-colors",
                active ? "bg-[#3a3f4b] text-white shadow-sm" : "text-[#abb2bf] hover:text-white hover:bg-[#2c313a]"
            )}
        >
            <Icon size={16} />
            {label}
        </button>
    )
}

// -------------------------------------------------------------------------------------------------
// USERS SUBTAB
// -------------------------------------------------------------------------------------------------
function UsersSubtab() {
    const { users, roles, departments, units, updateUser } = useTimeTracker()
    const [selectedId, setSelectedId] = useState<string | null>(users.length > 0 ? users[0].id : null)

    const selectedUser = users.find(u => u.id === selectedId)

    return (
        <div className="flex h-full gap-6">
            {/* List */}
            <div className="w-1/3 bg-[#282c33] border border-[#3a3f4b] rounded-lg overflow-y-auto">
                <div className="p-4 border-b border-[#3a3f4b] flex justify-between items-center sticky top-0 bg-[#282c33] z-10">
                    <h3 className="text-white font-medium">Team Members</h3>
                    <button className="p-1 hover:bg-[#3a3f4b] rounded text-[#98c379]"><Plus size={18} /></button>
                </div>
                <div className="p-2 space-y-1">
                    {users.map(u => (
                        <button
                            key={u.id}
                            onClick={() => setSelectedId(u.id)}
                            className={clsx(
                                "w-full text-left px-3 py-2 rounded-md transition-colors flex justify-between items-center",
                                selectedId === u.id ? "bg-[#3a3f4b] text-white" : "text-[#abb2bf] hover:bg-[#1e2227]"
                            )}
                        >
                            <span>{u.fullName}</span>
                            <span className="text-xs px-2 rounded-full bg-[#1e2227] border border-[#3a3f4b]">{roles.find(r => r.id === u.roleId)?.name || 'None'}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 bg-[#282c33] border border-[#3a3f4b] rounded-lg p-6 overflow-y-auto">
                {selectedUser ? (
                    <UserEditor key={selectedUser.id} user={selectedUser} roles={roles} departments={departments} units={units} onSave={(updates: Partial<User>) => updateUser(selectedUser.id, updates)} />
                ) : (
                    <div className="h-full flex items-center justify-center text-[#5c6370]">Select a user to edit</div>
                )}
            </div>
        </div>
    )
}

function UserEditor({ user, roles, departments, units, onSave }: any) {
    const [formData, setFormData] = useState<User>(user)
    const [isSaved, setIsSaved] = useState(false)

    const handleChange = (field: keyof User, value: any) => setFormData(prev => ({ ...prev, [field]: value }))

    const toggleDepartment = (deptId: string) => {
        setFormData(prev => {
            const depts = prev.departmentIds || []
            if (depts.includes(deptId)) return { ...prev, departmentIds: depts.filter(d => d !== deptId) }
            return { ...prev, departmentIds: [...depts, deptId] }
        })
    }

    const save = () => {
        onSave(formData)
        setIsSaved(true)
        setTimeout(() => setIsSaved(false), 2000)
    }

    return (
        <div className="max-w-xl animate-in fade-in duration-200">
            <div className="flex justify-between items-center border-b border-[#3a3f4b] pb-4 mb-6">
                <h2 className="text-lg text-white font-medium">Edit User: <span className="text-[#61afef]">{user.username}</span></h2>
                <button onClick={save} className="flex items-center gap-2 bg-[#98c379] hover:bg-[#7cb359] text-[#1e2227] px-4 py-1.5 rounded-md font-bold text-sm transition-colors">
                    <Save size={16} /> {isSaved ? 'Saved!' : 'Save'}
                </button>
            </div>

            <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-[#abb2bf] mb-1">User Name (Login)</label>
                        <input type="text" value={formData.username} onChange={e => handleChange('username', e.target.value)} className="w-full bg-[#1e2227] border border-[#3a3f4b] text-white p-2 rounded focus:outline-none focus:border-[#61afef]" />
                    </div>
                    <div>
                        <label className="block text-sm text-[#abb2bf] mb-1">Password</label>
                        <input type="password" value={formData.password || ''} onChange={e => handleChange('password', e.target.value)} placeholder="••••••••" className="w-full bg-[#1e2227] border border-[#3a3f4b] text-white p-2 rounded focus:outline-none focus:border-[#61afef]" />
                    </div>
                    <div>
                        <label className="block text-sm text-[#abb2bf] mb-1">Full Name</label>
                        <input type="text" value={formData.fullName} onChange={e => handleChange('fullName', e.target.value)} className="w-full bg-[#1e2227] border border-[#3a3f4b] text-white p-2 rounded focus:outline-none focus:border-[#61afef]" />
                    </div>
                    <div>
                        <label className="block text-sm text-[#abb2bf] mb-1">Email</label>
                        <input type="email" value={formData.email} onChange={e => handleChange('email', e.target.value)} className="w-full bg-[#1e2227] border border-[#3a3f4b] text-white p-2 rounded focus:outline-none focus:border-[#61afef]" />
                    </div>
                </div>

                <div className="pt-4 border-t border-[#3a3f4b]/50 grid grid-cols-2 gap-6">
                    <div>
                        <label className="flex items-center gap-2 text-sm text-[#abb2bf] cursor-pointer mb-4">
                            <input type="checkbox" checked={formData.isActive} onChange={e => handleChange('isActive', e.target.checked)} className="w-4 h-4 rounded bg-[#1e2227] border-[#3a3f4b] text-[#61afef]" />
                            User Active
                        </label>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-[#abb2bf] mb-1">Access Role</label>
                                <select value={formData.roleId} onChange={e => handleChange('roleId', e.target.value)} className="w-full bg-[#1e2227] border border-[#3a3f4b] text-white p-2 rounded text-sm focus:outline-none focus:border-[#61afef]">
                                    <option value="">Select Role...</option>
                                    {roles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-[#abb2bf] mb-1">Assigned Unit</label>
                                <select value={formData.unitId} onChange={e => handleChange('unitId', e.target.value)} className="w-full bg-[#1e2227] border border-[#3a3f4b] text-white p-2 rounded text-sm focus:outline-none focus:border-[#61afef]">
                                    <option value="">Select Unit...</option>
                                    {units.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-[#abb2bf] mb-2">Departments (Select multiple)</label>
                        <div className="bg-[#1e2227] border border-[#3a3f4b] rounded p-2 h-40 overflow-y-auto space-y-1">
                            {departments.map((d: any) => (
                                <label key={d.id} className="flex items-center gap-2 text-sm text-[#c8c8c8] hover:bg-[#2c313a] p-1.5 rounded cursor-pointer">
                                    <input type="checkbox" checked={(formData.departmentIds || []).includes(d.id)} onChange={() => toggleDepartment(d.id)} className="rounded bg-[#1e2227] border-[#3a3f4b] text-[#c678dd]" />
                                    {d.name}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-[#3a3f4b]/50">
                    <h3 className="text-sm font-medium text-[#e5c07b] mb-3">Currency Override</h3>
                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 text-sm text-[#abb2bf] cursor-pointer">
                            <input type="checkbox" checked={formData.currencyOverrideEnabled} onChange={e => handleChange('currencyOverrideEnabled', e.target.checked)} className="w-4 h-4 rounded bg-[#1e2227] border-[#3a3f4b] text-[#e5c07b]" />
                            Enable specific Currency for User
                        </label>
                        {formData.currencyOverrideEnabled && (
                            <select value={formData.preferredCurrency} onChange={e => handleChange('preferredCurrency', e.target.value)} className="bg-[#1e2227] border border-[#3a3f4b] text-white p-1.5 rounded text-sm focus:outline-none focus:border-[#e5c07b]">
                                {ALL_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// -------------------------------------------------------------------------------------------------
// UNITS SUBTAB
// -------------------------------------------------------------------------------------------------
function UnitsSubtab() {
    const { units, updateUnit } = useTimeTracker()
    const [selectedId, setSelectedId] = useState<string | null>(units.length > 0 ? units[0].id : null)
    const selectedUnit = units.find(u => u.id === selectedId)

    return (
        <div className="flex h-full gap-6">
            {/* List */}
            <div className="w-1/3 bg-[#282c33] border border-[#3a3f4b] rounded-lg overflow-y-auto">
                <div className="p-4 border-b border-[#3a3f4b] flex justify-between items-center sticky top-0 bg-[#282c33]">
                    <h3 className="text-white font-medium">Business Units</h3>
                    <button className="p-1 hover:bg-[#3a3f4b] rounded text-[#61afef]"><Plus size={18} /></button>
                </div>
                <div className="p-2 space-y-1">
                    {units.map(u => (
                        <button key={u.id} onClick={() => setSelectedId(u.id)} className={clsx("w-full text-left px-3 py-2 rounded-md transition-colors", selectedId === u.id ? "bg-[#3a3f4b] text-white" : "text-[#abb2bf] hover:bg-[#1e2227]")}>
                            {u.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 bg-[#282c33] border border-[#3a3f4b] rounded-lg p-6">
                {selectedUnit ? (
                    <UnitEditor key={selectedUnit.id} unit={selectedUnit} onSave={(updates: Partial<Unit>) => updateUnit(selectedUnit.id, updates)} />
                ) : (
                    <div className="h-full flex items-center justify-center text-[#5c6370]">Select a unit to edit</div>
                )}
            </div>
        </div>
    )
}

function UnitEditor({ unit, onSave }: any) {
    const [formData, setFormData] = useState<Unit>(unit)
    const [isSaved, setIsSaved] = useState(false)

    const handleChange = (field: keyof Unit, value: any) => setFormData(prev => ({ ...prev, [field]: value }))
    const save = () => { onSave(formData); setIsSaved(true); setTimeout(() => setIsSaved(false), 2000) }

    return (
        <div className="max-w-xl animate-in fade-in duration-200">
            <div className="flex justify-between items-center border-b border-[#3a3f4b] pb-4 mb-6">
                <h2 className="text-lg text-white font-medium">Edit Unit: <span className="text-[#61afef]">{unit.name}</span></h2>
                <button onClick={save} className="flex items-center gap-2 bg-[#61afef] hover:bg-[#4d93d9] text-[#1e2227] px-4 py-1.5 rounded-md font-bold text-sm transition-colors">
                    <Save size={16} /> {isSaved ? 'Saved!' : 'Save'}
                </button>
            </div>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm text-[#abb2bf] mb-1">Unit Name</label>
                    <input type="text" value={formData.name} onChange={e => handleChange('name', e.target.value)} className="w-full bg-[#1e2227] border border-[#3a3f4b] text-white p-2 rounded focus:outline-none focus:border-[#61afef]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-[#abb2bf] mb-1">Country</label>
                        <input type="text" value={formData.country} onChange={e => handleChange('country', e.target.value)} className="w-full bg-[#1e2227] border border-[#3a3f4b] text-white p-2 rounded focus:outline-none focus:border-[#61afef]" />
                    </div>
                    <div>
                        <label className="block text-sm text-[#abb2bf] mb-1">Native Currency</label>
                        <select value={formData.currency} onChange={e => handleChange('currency', e.target.value)} className="w-full bg-[#1e2227] border border-[#3a3f4b] text-white p-2 rounded focus:outline-none focus:border-[#61afef]">
                            {ALL_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-sm text-[#abb2bf] mb-1">Location / Timezone</label>
                    <input type="text" value={formData.location} onChange={e => handleChange('location', e.target.value)} className="w-full bg-[#1e2227] border border-[#3a3f4b] text-white p-2 rounded focus:outline-none focus:border-[#61afef]" />
                </div>
                <div>
                    <label className="block text-sm text-[#abb2bf] mb-1">Address</label>
                    <textarea value={formData.address} onChange={e => handleChange('address', e.target.value)} rows={3} className="w-full bg-[#1e2227] border border-[#3a3f4b] text-white p-2 rounded focus:outline-none focus:border-[#61afef]" />
                </div>
            </div>
        </div>
    )
}

// -------------------------------------------------------------------------------------------------
// DEPARTMENTS SUBTAB
// -------------------------------------------------------------------------------------------------
function DepartmentsSubtab() {
    const { departments, addDepartment, removeDepartment } = useTimeTracker()
    const [newDept, setNewDept] = useState('')

    const handleAdd = () => {
        if (newDept.trim()) { addDepartment(newDept.trim()); setNewDept('') }
    }

    return (
        <div className="max-w-2xl bg-[#282c33] border border-[#3a3f4b] rounded-lg p-6">
            <h2 className="text-lg text-white font-medium mb-4">Department Management</h2>
            <p className="text-sm text-[#abb2bf] mb-6">From user perspective, a department is a "user group". A user can be part of multiple departments simultaneously.</p>

            <div className="flex gap-3 mb-6">
                <input
                    type="text"
                    value={newDept}
                    onChange={e => setNewDept(e.target.value)}
                    placeholder="e.g. animators, pre-viz, support"
                    className="flex-1 bg-[#1e2227] border border-[#3a3f4b] text-white px-3 py-2 rounded focus:outline-none focus:border-[#c678dd]"
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                />
                <button onClick={handleAdd} className="bg-[#c678dd] hover:bg-[#a862bd] text-white px-4 py-2 rounded font-medium transition-colors flex items-center gap-2">
                    <Plus size={18} /> Add Department
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {departments.map(d => (
                    <div key={d.id} className="bg-[#1e2227] border border-[#3a3f4b] rounded flex items-center justify-between px-3 py-2 group">
                        <span className="text-[#c8c8c8] text-sm">{d.name}</span>
                        <button onClick={() => removeDepartment(d.id)} className="text-[#5c6370] hover:text-[#e06c75] opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}

// -------------------------------------------------------------------------------------------------
// ACCESS PROTOCOLS SUBTAB
// -------------------------------------------------------------------------------------------------
function AccessSubtab() {
    const { roles, updateRole } = useTimeTracker()
    const [selectedId, setSelectedId] = useState<string | null>(roles.length > 0 ? roles[0].id : null)
    const selectedRole = roles.find(r => r.id === selectedId)

    return (
        <div className="flex h-full gap-6">
            <div className="w-1/3 bg-[#282c33] border border-[#3a3f4b] rounded-lg overflow-y-auto">
                <div className="p-4 border-b border-[#3a3f4b] flex justify-between items-center sticky top-0 bg-[#282c33]">
                    <h3 className="text-white font-medium">Access Roles</h3>
                    <button className="p-1 hover:bg-[#3a3f4b] rounded text-[#e5c07b]"><Plus size={18} /></button>
                </div>
                <div className="p-2 space-y-1">
                    {roles.map(r => (
                        <button key={r.id} onClick={() => setSelectedId(r.id)} className={clsx("w-full text-left px-3 py-2 rounded-md transition-colors", selectedId === r.id ? "bg-[#3a3f4b] text-[#e5c07b]" : "text-[#abb2bf] hover:bg-[#1e2227]")}>
                            {r.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 bg-[#282c33] border border-[#3a3f4b] rounded-lg p-6 overflow-y-auto">
                {selectedRole ? (
                    <RoleEditor key={selectedRole.id} role={selectedRole} onSave={(updates: Partial<AccessRole>) => updateRole(selectedRole.id, updates)} />
                ) : (
                    <div className="h-full flex items-center justify-center text-[#5c6370]">Select a role to configure privileges</div>
                )}
            </div>
        </div>
    )
}

function RoleEditor({ role, onSave }: any) {
    const [formData, setFormData] = useState<AccessRole>(role)
    const [isSaved, setIsSaved] = useState(false)

    const toggle = (field: keyof AccessRole) => setFormData(prev => ({ ...prev, [field]: !prev[field] }))
    const save = () => { onSave(formData); setIsSaved(true); setTimeout(() => setIsSaved(false), 2000) }

    const CheckRow = ({ label, field, color = '#61afef' }: { label: string, field: keyof AccessRole, color?: string }) => (
        <label className="flex items-center justify-between p-3 rounded hover:bg-[#1e2227] cursor-pointer border border-transparent hover:border-[#3a3f4b]/50 transition-colors">
            <span className="text-sm text-[#abb2bf]">{label}</span>
            <input type="checkbox" checked={formData[field] as boolean} onChange={() => toggle(field)} className="w-4 h-4 rounded bg-[#1e2227] border-[#3a3f4b] focus:ring-0" style={{ color }} />
        </label>
    )

    return (
        <div className="max-w-2xl animate-in fade-in duration-200">
            <div className="flex justify-between items-center border-b border-[#3a3f4b] pb-4 mb-6 sticky top-0 bg-[#282c33] z-10">
                <input
                    type="text" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-transparent text-xl text-[#e5c07b] font-medium border-b border-transparent hover:border-[#3a3f4b] focus:border-[#e5c07b] focus:outline-none px-1"
                />
                <button onClick={save} className="flex items-center gap-2 bg-[#e5c07b] hover:bg-[#d1a654] text-[#1e2227] px-4 py-1.5 rounded-md font-bold text-sm transition-colors">
                    <Save size={16} /> {isSaved ? 'Saved!' : 'Save Privileges'}
                </button>
            </div>

            <div className="space-y-6">
                <div>
                    <h3 className="text-xs font-semibold uppercase text-[#5c6370] mb-2 tracking-wider">Logging Allowances</h3>
                    <div className="bg-[#1e2227] border border-[#3a3f4b]/50 rounded-lg divide-y divide-[#3a3f4b]/50">
                        <CheckRow label="Allow seeing projects/paths/tasks NOT assigned to them" field="seeUnassignedTasks" color="#98c379" />
                        <CheckRow label="Allow logging time to UNASSIGNED tasks" field="logToUnassignedTasks" color="#98c379" />
                        <CheckRow label="Allow logging time to project WITHOUT selecting task (requires path)" field="logToProjectWithoutTask" color="#98c379" />
                        <CheckRow label="Allow logging time to project WITHOUT selecting path & task" field="logToProjectWithoutPath" color="#98c379" />
                    </div>
                </div>

                <div>
                    <h3 className="text-xs font-semibold uppercase text-[#5c6370] mb-2 tracking-wider">Financial Visibility</h3>
                    <div className="bg-[#1e2227] border border-[#3a3f4b]/50 rounded-lg divide-y divide-[#3a3f4b]/50">
                        <CheckRow label="Allow seeing the price of timelogs from their Department(s)" field="seeDeptPrices" color="#e5c07b" />
                        <CheckRow label="Allow seeing the price of timelogs from their Unit" field="seeUnitPrices" color="#e5c07b" />
                        <CheckRow label="Allow seeing the rates of users from their Department(s)" field="seeDeptRates" color="#e5c07b" />
                        <CheckRow label="Allow seeing the rates of users from their Unit" field="seeUnitRates" color="#e5c07b" />
                        <CheckRow label="Allow changing the rates of users from their Department(s)" field="changeDeptRates" color="#e06c75" />
                        <CheckRow label="Allow changing the rates of users from their Unit" field="changeUnitRates" color="#e06c75" />
                    </div>
                </div>

                <div>
                    <h3 className="text-xs font-semibold uppercase text-[#5c6370] mb-2 tracking-wider">Activity Visibility</h3>
                    <div className="bg-[#1e2227] border border-[#3a3f4b]/50 rounded-lg divide-y divide-[#3a3f4b]/50">
                        <CheckRow label="Allow tracking the raw timelogs from their Department(s)" field="seeDeptLogs" color="#c678dd" />
                        <CheckRow label="Allow tracking the raw timelogs from their Unit" field="seeUnitLogs" color="#c678dd" />
                    </div>
                </div>
            </div>
        </div>
    )
}
