import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { addDays, subDays, addSeconds, format } from 'date-fns';

export interface Project {
    id: string;
    name: string;
    color: string;
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
}

const initialProjects: Project[] = [
    { id: 'Prj-Ayon', name: 'Ayon Cloud Integration', color: '#98c379' },
    { id: 'Prj-Commercial', name: 'Nike Commercial', color: '#61afef' },
    { id: 'Prj-Internal', name: 'Internal Dev & RnD', color: '#e5c07b' }
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
    const [projects] = useState<Project[]>(initialProjects);
    const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
    const [globalSelectedEntryIds, setGlobalSelectedEntryIds] = useState<string[]>([]);
    const [favoriteTasks, setFavoriteTasks] = useState<string[]>([]);

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
            favoriteTasks, toggleFavoriteTask
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
