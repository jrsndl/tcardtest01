import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { addDays, subDays, addSeconds, format } from 'date-fns';

export interface InvoicingMilestone {
    date: string;
    price: number;
    due_date: string;
}

export interface AccessRole {
    id: string;
    name: string;
    seeUnassignedTasks: boolean;
    logToUnassignedTasks: boolean;
    logToProjectWithoutTask: boolean;
    logToProjectWithoutPath: boolean;
    seeDeptPrices: boolean;
    seeUnitPrices: boolean;
    seeDeptLogs: boolean;
    seeUnitLogs: boolean;
    seeDeptRates: boolean;
    seeUnitRates: boolean;
    changeDeptRates: boolean;
    changeUnitRates: boolean;
}

export interface Department {
    id: string;
    name: string;
}

export interface Unit {
    id: string;
    name: string;
    country: string;
    currency: string;
    location: string;
    address: string;
}

export interface User {
    id: string;
    username: string;
    password?: string;
    fullName: string;
    email: string;
    isActive: boolean;
    roleId: string;
    departmentIds: string[];
    unitId: string;
    currencyOverrideEnabled: boolean;
    preferredCurrency: string;
}

export interface AppSettings {
    currency: {
        preferred: string;
        bookmarks: string[];
    };
    loggingLimits: {
        autoSubmitAfter: { days: number, hours: number };
        submitLocksTimeLog: boolean;
        allowAddingPast: { days: number, hours: number };
        allowAddingFuture: { days: number, hours: number };
        allowEditingDisputed: boolean;
    };
    defaultWorkStartTime: string;
}

export interface Project {
    // Synced from Ftrack
    id: string; // ftrack_id equivalent
    name: string;
    short_name: string;
    start_date: string;
    end_date: string;
    color: string;
    assigned_users: string[]; // From "organize team"

    // User Fillable Custom Fields
    currency: string;
    bid_price: number;
    client_invoice: string;
    contacts: string;
    notes: string;
    departments: string[];
    project_group: string[];
    invoicing_plan: InvoicingMilestone[];
    milestones: string[];
}

export interface TimeLog {
    id: string;
    description: string;
    start_time: string; // "HH:mm"
    end_time: string; // "HH:mm"
    duration: number; // in seconds
    project_id: string;
    project_color: string;
    ftrack_path: string;
    ftrack_task_name: string;
    ftrack_task_type: string;
    status: 'logged' | 'submitted' | 'approved' | 'disputed' | 'resolved';
    bid_time?: number | null;
    billable?: boolean;
    thumbnail_url?: string;
    date: Date;
}

export interface FtrackNode {
    id: string;
    name: string;
    type: 'project' | 'folder' | 'sequence' | 'shot' | 'task';
    task_type?: string; // e.g. 'Anim', 'Comp', 'Light' (only for tasks)
    thumbnail_url?: string;
    children?: FtrackNode[];
}

interface TimeTrackerContextType {
    projects: Project[];
    logs: TimeLog[];
    hierarchy: FtrackNode[];
    activeTimerId: string | null;
    startTimer: (entryId: string) => void;
    stopTimer: () => void;
    addLog: (log: Omit<TimeLog, 'id'>) => void;
    updateLog: (id: string, log: Partial<TimeLog>) => void;
    deleteLog: (id: string) => void;
    mergeLogs: (ids: string[]) => void;
    globalSelectedEntryIds: string[];
    setGlobalSelectedEntryIds: (ids: string[]) => void;
    favoriteTasks: string[];
    toggleFavoriteTask: (taskKey: string) => void;
    updateProject: (id: string, updates: Partial<Project>) => void;
    globalCurrency: string;
    setGlobalCurrency: (currency: string) => void;
    formatCurrency: (amount: number, nativeCurrency?: string) => string;
    settings: AppSettings;
    updateSettings: (updates: Partial<AppSettings>) => void;

    users: User[];
    updateUser: (id: string, updates: Partial<User>) => void;

    units: Unit[];
    updateUnit: (id: string, updates: Partial<Unit>) => void;

    departments: Department[];
    addDepartment: (name: string) => void;
    removeDepartment: (id: string) => void;

    roles: AccessRole[];
    updateRole: (id: string, updates: Partial<AccessRole>) => void;
}

const initialSettings: AppSettings = {
    currency: {
        preferred: 'EUR',
        bookmarks: ['USD', 'EUR', 'GBP', 'CZK']
    },
    loggingLimits: {
        autoSubmitAfter: { days: 1, hours: 12 },
        submitLocksTimeLog: true,
        allowAddingPast: { days: 1, hours: 16 },
        allowAddingFuture: { days: 0, hours: 0 },
        allowEditingDisputed: true
    },
    defaultWorkStartTime: '09:00'
};

// Mock Exchange Rates to USD base for now
const exchangeRates: Record<string, number> = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    CZK: 23.40
};

const initialRoles: AccessRole[] = [
    {
        id: 'r1', name: 'admin', seeUnassignedTasks: true, logToUnassignedTasks: true, logToProjectWithoutTask: true, logToProjectWithoutPath: true,
        seeDeptPrices: true, seeUnitPrices: true, seeDeptLogs: true, seeUnitLogs: true, seeDeptRates: true, seeUnitRates: true, changeDeptRates: true, changeUnitRates: true
    },
    {
        id: 'r2', name: 'artist', seeUnassignedTasks: false, logToUnassignedTasks: false, logToProjectWithoutTask: false, logToProjectWithoutPath: false,
        seeDeptPrices: false, seeUnitPrices: false, seeDeptLogs: true, seeUnitLogs: false, seeDeptRates: false, seeUnitRates: false, changeDeptRates: false, changeUnitRates: false
    }
];

const initialDepartments: Department[] = [
    { id: 'd1', name: 'io' }, { id: 'd2', name: 'producers' }, { id: 'd3', name: 'coordinators' },
    { id: 'd4', name: 'supervisors' }, { id: 'd5', name: 'leads' }, { id: 'd6', name: 'artists' },
    { id: 'd7', name: 'compositors' }, { id: 'd8', name: 'editors' }, { id: 'd9', name: 'colorists' },
    { id: 'd10', name: 'finishing' }, { id: 'd11', name: 'finance' }
];

const initialUnits: Unit[] = [
    { id: 'u1', name: 'Commercial Unit', country: 'US', currency: 'USD', location: 'New York', address: '123 Ad Space Ave' },
    { id: 'u2', name: 'Film Unit', country: 'UK', currency: 'GBP', location: 'London', address: '45 Cinema Road' }
];

const initialUsers: User[] = [
    { id: 'jirka', username: 'jirka', fullName: 'Jirka', email: 'jirka@studio.com', isActive: true, roleId: 'r1', departmentIds: ['d4', 'd5'], unitId: 'u1', currencyOverrideEnabled: false, preferredCurrency: 'USD' },
    { id: 'john.doe', username: 'john.doe', password: 'topsecret', fullName: 'John Doe', email: 'john.doe@gmail.com', isActive: true, roleId: 'r2', departmentIds: ['d6'], unitId: 'u2', currencyOverrideEnabled: true, preferredCurrency: 'EUR' }
];

const initialProjects: Project[] = [
    {
        id: 'Prj-Ayon', name: 'Ayon Cloud Integration', short_name: 'AYN', color: '#98c379',
        start_date: '2023-10-01', end_date: '2024-06-30', assigned_users: ['jirka', 'artist1'],
        currency: 'USD', bid_price: 50000, client_invoice: 'Ayon Studios', contacts: 'john@ayon.com',
        notes: 'Priority integration task.', departments: ['Dev', 'IT'], project_group: ['Internal Pipeline'],
        invoicing_plan: [{ date: '2023-12-01', price: 15000, due_date: '2023-12-15' }], milestones: ['Alpha Release']
    },
    {
        id: 'Prj-Commercial', name: 'Nike Commercial', short_name: 'NKE', color: '#61afef',
        start_date: '2024-01-15', end_date: '2024-03-01', assigned_users: ['jirka', 'artist2'],
        currency: 'EUR', bid_price: 120000, client_invoice: 'Nike Europe', contacts: 'marketing@nike.com',
        notes: 'Fast paced delivery.', departments: ['3D', 'Comp'], project_group: ['Commercials'],
        invoicing_plan: [], milestones: ['Animatic approval', 'Final delivery']
    },
    {
        id: 'Prj-Internal', name: 'Internal Dev & RnD', short_name: 'RND', color: '#e5c07b',
        start_date: '2024-01-01', end_date: '2024-12-31', assigned_users: ['jirka'],
        currency: 'USD', bid_price: 0, client_invoice: 'Internal', contacts: '',
        notes: 'Ongoing RnD tasks.', departments: ['R&D'], project_group: ['Internal'],
        invoicing_plan: [], milestones: []
    }
];

const today = new Date();

const initialLogs: TimeLog[] = [
    {
        id: '1',
        description: 'Working on main character animation',
        start_time: '09:00',
        end_time: '12:00',
        duration: 10800, // 3h
        project_id: 'Prj-Ayon',
        project_color: '#98c379',
        ftrack_path: 'assets/chr_hero',
        ftrack_task_name: 'anim',
        ftrack_task_type: 'Anim',
        status: 'logged',
        bid_time: 14400,
        billable: true,
        thumbnail_url: 'https://picsum.photos/seed/ayon1/100/100',
        date: today
    },
    {
        id: '2',
        description: 'Lighting setup for shot 010',
        start_time: '13:00',
        end_time: '17:00',
        duration: 14400, // 4h
        project_id: 'Prj-Commercial',
        project_color: '#61afef',
        ftrack_path: 'shots/sh010',
        ftrack_task_name: 'lighting',
        ftrack_task_type: 'Light',
        status: 'submitted',
        bid_time: 28800,
        billable: true,
        thumbnail_url: 'https://picsum.photos/seed/ayon2/100/100',
        date: today
    },
    {
        id: '3',
        description: 'Review adjustments',
        start_time: '10:00',
        end_time: '14:00',
        duration: 14400, // 4h
        project_id: 'Prj-Ayon',
        project_color: '#98c379',
        ftrack_path: 'shots/sh020',
        ftrack_task_name: 'comp',
        ftrack_task_type: 'Comp',
        status: 'approved',
        date: addDays(today, 1)
    },
    {
        id: '4',
        description: 'RnD for new pipeline tool',
        start_time: '08:00',
        end_time: '09:00',
        duration: 3600, // 1h
        project_id: 'Prj-Internal',
        project_color: '#e5c07b',
        ftrack_path: 'assets/dev',
        ftrack_task_name: 'rnd',
        ftrack_task_type: 'Dev',
        status: 'logged',
        date: subDays(today, 1)
    }
];

const mockHierarchy: FtrackNode[] = [
    {
        id: 'Prj-Ayon',
        name: 'Ayon Cloud Integration',
        type: 'project',
        children: [
            {
                id: 'f1',
                name: 'assets',
                type: 'folder',
                children: [
                    {
                        id: 'a1',
                        name: 'chr_hero',
                        type: 'shot', // Treating as asset leaf
                        children: [
                            { id: 't1', name: 'anim', type: 'task', task_type: 'Anim', thumbnail_url: 'https://picsum.photos/seed/ayon1/100/100' },
                            { id: 't2', name: 'model', type: 'task', task_type: 'Model', thumbnail_url: 'https://picsum.photos/seed/ayon1_model/100/100' }
                        ]
                    },
                    {
                        id: 'a2',
                        name: 'dev',
                        type: 'folder',
                        children: [
                            { id: 't3', name: 'rnd', type: 'task', task_type: 'Dev', thumbnail_url: 'https://picsum.photos/seed/ayon_dev/100/100' }
                        ]
                    }
                ]
            },
            {
                id: 'f2',
                name: 'shots',
                type: 'folder',
                children: [
                    {
                        id: 's1',
                        name: 'sh010',
                        type: 'shot',
                        children: [
                            { id: 't4', name: 'layout', type: 'task', task_type: 'Layout', thumbnail_url: 'https://picsum.photos/seed/ayon_sh010_layout/100/100' },
                            { id: 't5', name: 'anim', type: 'task', task_type: 'Anim', thumbnail_url: 'https://picsum.photos/seed/ayon_sh010_anim/100/100' }
                        ]
                    },
                    {
                        id: 's2',
                        name: 'sh020',
                        type: 'shot',
                        children: [
                            { id: 't6', name: 'comp', type: 'task', task_type: 'Comp', thumbnail_url: 'https://picsum.photos/seed/ayon2/100/100' },
                            { id: 't7', name: 'lighting', type: 'task', task_type: 'Light', thumbnail_url: 'https://picsum.photos/seed/ayon_sh020_light/100/100' }
                        ]
                    }
                ]
            }
        ]
    },
    {
        id: 'Prj-Commercial',
        name: 'Nike Commercial',
        type: 'project',
        children: [
            {
                id: 'c_shots',
                name: 'shots',
                type: 'folder',
                children: [
                    {
                        id: 'c_sh010',
                        name: 'sh010',
                        type: 'shot',
                        children: [
                            { id: 't8', name: 'lighting', type: 'task', task_type: 'Light', thumbnail_url: 'https://picsum.photos/seed/ayon2/100/100' },
                            { id: 't9', name: 'comp', type: 'task', task_type: 'Comp', thumbnail_url: 'https://picsum.photos/seed/c_sh010_comp/100/100' }
                        ]
                    }
                ]
            }
        ]
    }
];

const TimeTrackerContext = createContext<TimeTrackerContextType | undefined>(undefined);

export function TimeTrackerProvider({ children }: { children: ReactNode }) {
    const [logs, setLogs] = useState<TimeLog[]>(initialLogs);
    const [projects, setProjects] = useState<Project[]>(initialProjects);
    const [settings, setSettings] = useState<AppSettings>(initialSettings);
    const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
    const [globalSelectedEntryIds, setGlobalSelectedEntryIds] = useState<string[]>([]);
    const [favoriteTasks, setFavoriteTasks] = useState<string[]>([]);
    const [globalCurrency, setGlobalCurrency] = useState<string>(initialSettings.currency.preferred);

    const [users, setUsers] = useState<User[]>(initialUsers);
    const [units, setUnits] = useState<Unit[]>(initialUnits);
    const [departments, setDepartments] = useState<Department[]>(initialDepartments);
    const [roles, setRoles] = useState<AccessRole[]>(initialRoles);

    const updateSettings = (updates: Partial<AppSettings>) => {
        setSettings(prev => ({ ...prev, ...updates }));
    };

    const updateUser = (id: string, updates: Partial<User>) => setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    const updateUnit = (id: string, updates: Partial<Unit>) => setUnits(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    const updateRole = (id: string, updates: Partial<AccessRole>) => setRoles(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    const addDepartment = (name: string) => setDepartments(prev => [...prev, { id: Date.now().toString(), name }]);
    const removeDepartment = (id: string) => setDepartments(prev => prev.filter(d => d.id !== id));

    const formatCurrency = (amount: number, nativeCurrency: string = 'USD') => {
        // Fallback safely if rate is missing
        const fromRate = exchangeRates[nativeCurrency] || 1;
        const toRate = exchangeRates[globalCurrency] || 1;

        const convertedScore = (amount / fromRate) * toRate;

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: globalCurrency,
            maximumFractionDigits: 0
        }).format(convertedScore);
    };

    const toggleFavoriteTask = (taskKey: string) => {
        setFavoriteTasks(prev =>
            prev.includes(taskKey) ? prev.filter(k => k !== taskKey) : [...prev, taskKey]
        );
    };

    const startTimer = (id: string) => setActiveTimerId(id);
    const stopTimer = () => {
        if (activeTimerId) {
            setLogs(prev => prev.map(log => {
                if (log.id === activeTimerId && log.start_time) {
                    const [hours, minutes] = log.start_time.split(':').map(Number);
                    const startDate = new Date();
                    startDate.setHours(hours, minutes, 0, 0);
                    const endDate = addSeconds(startDate, log.duration);
                    return { ...log, end_time: format(endDate, 'HH:mm') };
                }
                return log;
            }));
        }
        setActiveTimerId(null);
    };

    const updateProject = (id: string, updates: Partial<Project>) => {
        setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    };

    const addLog = (log: Omit<TimeLog, 'id'>) => {
        setLogs(prev => [...prev, { ...log, id: Date.now().toString() }]);
    };

    const updateLog = (id: string, logUpdates: Partial<TimeLog>) => {
        setLogs(prev => prev.map(log => log.id === id ? { ...log, ...logUpdates } : log));
    };

    const deleteLog = (id: string) => {
        setLogs(prev => prev.filter(log => log.id !== id));
    };

    const mergeLogs = (ids: string[]) => {
        if (ids.length < 2) return;
        setLogs(prev => {
            const logsToMerge = prev.filter(l => ids.includes(l.id));
            if (!logsToMerge.length) return prev;

            // Just basic merge logic: sum duration, keep first log's meta
            const targetLog = logsToMerge[0];
            const totalDuration = logsToMerge.reduce((acc, l) => acc + l.duration, 0);

            const newLog = {
                ...targetLog,
                id: Date.now().toString(),
                duration: totalDuration,
                // End time would logically be extended, but keeping simple for now
            };

            return [...prev.filter(l => !ids.includes(l.id)), newLog];
        });
    };

    return (
        <TimeTrackerContext.Provider value={{
            projects, logs, hierarchy: mockHierarchy, activeTimerId, startTimer, stopTimer, addLog, updateLog, deleteLog, mergeLogs,
            globalSelectedEntryIds, setGlobalSelectedEntryIds,
            favoriteTasks, toggleFavoriteTask, updateProject,
            globalCurrency, setGlobalCurrency, formatCurrency,
            settings, updateSettings,
            users, updateUser, units, updateUnit, departments, addDepartment, removeDepartment, roles, updateRole
        }}>
            {children}
        </TimeTrackerContext.Provider>
    );
}

export function useTimeTracker() {
    const context = useContext(TimeTrackerContext);
    if (context === undefined) {
        throw new Error('useTimeTracker must be used within a TimeTrackerProvider');
    }
    return context;
}
