import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ProjectSetup from './components/ProjectSetup';
import SubcontractorRegistry from './components/SubcontractorRegistry';
import GanttView from './components/GanttView';
import GanttBySpace from './components/GanttBySpace';
import OrdersSuppliers from './components/OrdersSuppliers';
import { getProject } from './api';

export default function App() {
  const [section, setSection]         = useState('dashboard');
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    getProject()
      .then(p => setProjectName(p.name || ''))
      .catch(() => {});
  }, []);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <Sidebar active={section} onNavigate={setSection} projectName={projectName} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {section === 'dashboard'       && <Dashboard />}
        {section === 'project'         && <ProjectSetup onSaved={setProjectName} />}
        {section === 'subcontractors'  && <SubcontractorRegistry />}
        {section === 'gantt'           && <GanttView />}
        {section === 'ganttbyspace'    && <GanttBySpace />}
        {section === 'orders'          && <OrdersSuppliers />}
      </main>
    </div>
  );
}
