import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TimerBar from './components/TimerBar'
import Tracker from './views/Tracker'
import Timesheet from './views/Timesheet'
import CalendarView from './views/CalendarView'
import { Projects, Team, Reports, Tags, Settings } from './views/AuxiliaryViews'
import { TimeTrackerProvider } from './context/TimeTrackerContext'

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  return (
    <TimeTrackerProvider>
      <div className="flex h-screen bg-[#21252b] text-[#c8c8c8] overflow-hidden">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <TimerBar />

          <main className="flex-1 overflow-auto bg-[#282c33]">
            <Routes>
              <Route path="/" element={<Navigate to="/tracker" replace />} />
              <Route path="/tracker" element={<Tracker />} />
              <Route path="/timesheet" element={<Timesheet />} />
              <Route path="/calendar" element={<CalendarView />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/team" element={<Team />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/tags" element={<Tags />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </div>
    </TimeTrackerProvider>
  )
}

export default App
