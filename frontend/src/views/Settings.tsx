import { useState, useEffect } from 'react'
import { Save, AlertCircle } from 'lucide-react'
import { useTimeTracker } from '../context/TimeTrackerContext'
import type { AppSettings } from '../context/TimeTrackerContext'
import { clsx } from 'clsx'

// Common world currencies for the dropdown
const ALL_CURRENCIES = [
    'USD', 'EUR', 'GBP', 'CZK', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK', 'NZD'
]

export default function Settings() {
    const { settings, updateSettings, setGlobalCurrency } = useTimeTracker()
    const [formData, setFormData] = useState<AppSettings>(settings)
    const [isSaved, setIsSaved] = useState(false)

    // Sync form if settings change externally
    useEffect(() => {
        setFormData(settings)
    }, [settings])

    const handleCurrencyChange = (field: 'preferred', value: string) => {
        setFormData(prev => ({
            ...prev,
            currency: { ...prev.currency, [field]: value }
        }))
    }

    const toggleBookmark = (currency: string) => {
        setFormData(prev => {
            const currentBookmarks = prev.currency.bookmarks
            const newBookmarks = currentBookmarks.includes(currency)
                ? currentBookmarks.filter(c => c !== currency)
                : [...currentBookmarks, currency]

            return {
                ...prev,
                currency: { ...prev.currency, bookmarks: newBookmarks }
            }
        })
    }

    const handleLimitChange = (field: keyof AppSettings['loggingLimits'], value: any) => {
        setFormData(prev => ({
            ...prev,
            loggingLimits: { ...prev.loggingLimits, [field]: value }
        }))
    }

    const handleTimeObjChange = (
        field: 'autoSubmitAfter' | 'allowAddingPast' | 'allowAddingFuture',
        subField: 'days' | 'hours',
        value: number
    ) => {
        setFormData(prev => ({
            ...prev,
            loggingLimits: {
                ...prev.loggingLimits,
                [field]: {
                    ...prev.loggingLimits[field],
                    [subField]: value
                }
            }
        }))
    }

    const handleSave = () => {
        updateSettings(formData)
        // If preferred currency changed, we might want to update the global dropdown instantly too
        if (formData.currency.preferred !== settings.currency.preferred) {
            setGlobalCurrency(formData.currency.preferred)
        }
        setIsSaved(true)
        setTimeout(() => setIsSaved(false), 3000)
    }

    return (
        <div className="flex flex-col h-full bg-[#21252b] p-6 max-w-4xl mx-auto w-full animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-8 border-b border-[#3a3f4b] pb-4">
                <div>
                    <h1 className="text-2xl font-semibold text-white mb-1">Workspace Settings</h1>
                    <p className="text-sm text-[#abb2bf]">Configure currency, time logging boundaries, and application defaults.</p>
                </div>
                <button
                    onClick={handleSave}
                    className="flex items-center gap-2 bg-[#98c379] hover:bg-[#7cb359] text-[#1e2227] px-6 py-2 rounded-md font-bold transition-colors shadow-sm"
                >
                    <Save size={18} />
                    {isSaved ? 'Saved!' : 'Save Settings'}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-8 pr-2">

                {/* Currency Section */}
                <section className="bg-[#282c33] border border-[#3a3f4b] rounded-lg p-6">
                    <h2 className="text-lg font-medium text-[#e5c07b] mb-4">Currency Configuration</h2>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-[#abb2bf] mb-2">
                                Preferred Base Currency
                            </label>
                            <p className="text-xs text-[#5c6370] mb-3">All project native prices will default to this currency internally.</p>
                            <select
                                value={formData.currency.preferred}
                                onChange={e => handleCurrencyChange('preferred', e.target.value)}
                                className="bg-[#1e2227] border border-[#3a3f4b] text-white text-sm rounded-md px-3 py-2 w-full max-w-xs focus:outline-none focus:border-[#61afef]"
                            >
                                {ALL_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#abb2bf] mb-2">
                                Global Currency Bookmarks
                            </label>
                            <p className="text-xs text-[#5c6370] mb-3">Select which currencies should appear in the rapid-switcher dropdown in the top header.</p>
                            <div className="flex flex-wrap gap-2">
                                {ALL_CURRENCIES.map(c => {
                                    const isSelected = formData.currency.bookmarks.includes(c)
                                    return (
                                        <button
                                            key={c}
                                            onClick={() => toggleBookmark(c)}
                                            className={clsx(
                                                "px-4 py-1.5 rounded-md text-sm font-medium transition-colors border",
                                                isSelected
                                                    ? "bg-[#3a3f4b] text-[#61afef] border-[#61afef]"
                                                    : "bg-[#1e2227] text-[#abb2bf] border-[#3a3f4b] hover:border-[#abb2bf]"
                                            )}
                                        >
                                            {c}
                                        </button>
                                    )
                                })}
                            </div>
                            {formData.currency.bookmarks.length === 0 && (
                                <p className="text-xs text-[#e06c75] mt-2 flex items-center gap-1">
                                    <AlertCircle size={12} /> You must select at least one bookmark.
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                {/* Time Logging Limits Section */}
                <section className="bg-[#282c33] border border-[#3a3f4b] rounded-lg p-6">
                    <h2 className="text-lg font-medium text-[#c678dd] mb-4">Time Logging Boundaries</h2>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Auto Submit */}
                            <div className="bg-[#1e2227] p-4 rounded border border-[#3a3f4b]/50">
                                <label className="block text-sm font-medium text-[#abb2bf] mb-3">Auto-Submit Time Logs After</label>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 text-sm text-white">
                                        <input
                                            type="number" min="0" max="30"
                                            value={formData.loggingLimits.autoSubmitAfter.days}
                                            onChange={e => handleTimeObjChange('autoSubmitAfter', 'days', parseInt(e.target.value) || 0)}
                                            className="w-16 bg-[#282c33] border border-[#3a3f4b] rounded px-2 py-1 text-center"
                                        />
                                        <span>days</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-white">
                                        <input
                                            type="number" min="0" max="23"
                                            value={formData.loggingLimits.autoSubmitAfter.hours}
                                            onChange={e => handleTimeObjChange('autoSubmitAfter', 'hours', parseInt(e.target.value) || 0)}
                                            className="w-16 bg-[#282c33] border border-[#3a3f4b] rounded px-2 py-1 text-center"
                                        />
                                        <span>hours</span>
                                    </div>
                                </div>
                            </div>

                            {/* Allow Past */}
                            <div className="bg-[#1e2227] p-4 rounded border border-[#3a3f4b]/50">
                                <label className="block text-sm font-medium text-[#abb2bf] mb-3">Allow Adding Logs in Past (before today)</label>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 text-sm text-white">
                                        <input
                                            type="number" min="0" max="365"
                                            value={formData.loggingLimits.allowAddingPast.days}
                                            onChange={e => handleTimeObjChange('allowAddingPast', 'days', parseInt(e.target.value) || 0)}
                                            className="w-16 bg-[#282c33] border border-[#3a3f4b] rounded px-2 py-1 text-center"
                                        />
                                        <span>days</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-white">
                                        <input
                                            type="number" min="0" max="23"
                                            value={formData.loggingLimits.allowAddingPast.hours}
                                            onChange={e => handleTimeObjChange('allowAddingPast', 'hours', parseInt(e.target.value) || 0)}
                                            className="w-16 bg-[#282c33] border border-[#3a3f4b] rounded px-2 py-1 text-center"
                                        />
                                        <span>hours</span>
                                    </div>
                                </div>
                            </div>

                            {/* Allow Future */}
                            <div className="bg-[#1e2227] p-4 rounded border border-[#3a3f4b]/50">
                                <label className="block text-sm font-medium text-[#abb2bf] mb-3">Allow Adding Logs in Future (after today)</label>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 text-sm text-white">
                                        <input
                                            type="number" min="0" max="365"
                                            value={formData.loggingLimits.allowAddingFuture.days}
                                            onChange={e => handleTimeObjChange('allowAddingFuture', 'days', parseInt(e.target.value) || 0)}
                                            className="w-16 bg-[#282c33] border border-[#3a3f4b] rounded px-2 py-1 text-center"
                                        />
                                        <span>days</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-white">
                                        <input
                                            type="number" min="0" max="23"
                                            value={formData.loggingLimits.allowAddingFuture.hours}
                                            onChange={e => handleTimeObjChange('allowAddingFuture', 'hours', parseInt(e.target.value) || 0)}
                                            className="w-16 bg-[#282c33] border border-[#3a3f4b] rounded px-2 py-1 text-center"
                                        />
                                        <span>hours</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-[#3a3f4b]/50 space-y-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.loggingLimits.submitLocksTimeLog}
                                    onChange={e => handleLimitChange('submitLocksTimeLog', e.target.checked)}
                                    className="w-4 h-4 rounded bg-[#1e2227] border-[#3a3f4b] text-[#61afef] focus:ring-[#61afef]"
                                />
                                <span className="text-sm font-medium text-[#abb2bf]">Submit locks time log (prevents further local editing once pushed to Ftrack)</span>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.loggingLimits.allowEditingDisputed}
                                    onChange={e => handleLimitChange('allowEditingDisputed', e.target.checked)}
                                    className="w-4 h-4 rounded bg-[#1e2227] border-[#3a3f4b] text-[#61afef] focus:ring-[#61afef]"
                                />
                                <span className="text-sm font-medium text-[#abb2bf]">Allow editing disputed tasks</span>
                            </label>
                        </div>
                    </div>
                </section>

                {/* General Defaults */}
                <section className="bg-[#282c33] border border-[#3a3f4b] rounded-lg p-6 mb-8">
                    <h2 className="text-lg font-medium text-[#56b6c2] mb-4">General Defaults</h2>
                    <div>
                        <label className="block text-sm font-medium text-[#abb2bf] mb-2">Default Work Start Time</label>
                        <input
                            type="time"
                            value={formData.defaultWorkStartTime}
                            onChange={e => setFormData(prev => ({ ...prev, defaultWorkStartTime: e.target.value }))}
                            className="bg-[#1e2227] border border-[#3a3f4b] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-[#61afef]"
                        />
                    </div>
                </section>

            </div>
        </div>
    )
}
