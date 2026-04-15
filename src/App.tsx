import { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  Cpu, 
  Database, 
  Server, 
  Wifi, 
  WifiOff 
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { io } from 'socket.io-client';

interface MemoryStats {
  projectId: string;
  projectName: string;
  timestamp: string;
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
}

interface ProcessedStats extends MemoryStats {
  timeLabel: string;
  heapUsedMb: number;
  heapTotalMb: number;
  rssMb: number;
}

const MAX_DATA_POINTS = 30;
// Escuchar en varios puertos por si tienes multiples microservicios/APIs corriendo
const MONITOR_ENDPOINTS = ['http://localhost:3010', 'http://localhost:3011', 'http://localhost:3012', 'http://localhost:3013'];

function formatMB(bytes: number): number {
  return Math.round((bytes / 1024 / 1024) * 100) / 100;
}

function ProjectDashboard({ 
  project, 
  data, 
  isConnected 
}: { 
  project: { id: string, name: string }, 
  data: ProcessedStats[], 
  isConnected: boolean 
}) {
  const currentStats = data.length > 0 ? data[data.length - 1] : null;

  const memoryUtilization = currentStats 
    ? (currentStats.heapUsed / currentStats.heapTotal) * 100 
    : 0;
  
  const isWarning = memoryUtilization > 85;

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Server size={20} color="var(--accent-blue)" /> {project.name}
        </h2>
        <div className={`status-badge ${!isConnected ? 'disconnected' : ''}`}>
          <div className="status-dot"></div>
          {isConnected ? <><Wifi size={14}/> Live</> : <><WifiOff size={14}/> Offline / Mock</>}
        </div>
      </div>

      <div className="grid-metrics">
        <div className="metric-card" style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
          <div className="metric-header" style={{ alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Cpu size={14} /> Heap Used</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', textTransform: 'none', letterSpacing: 'normal' }}>
                Memoria ejecutando tu código. Mide objetos, strings y closures activos de JavaScript. 
              </div>
            </div>
          </div>
          <div className="metric-value" style={{ marginTop: '0.5rem' }}>{currentStats?.heapUsedMb.toFixed(1) || '--'} <span className="metric-unit">MB</span></div>
          <div className="mem-bar-container">
            <div className={`mem-bar-fill ${isWarning ? 'warning' : ''}`} style={{ width: `${Math.min(memoryUtilization, 100)}%` }} />
          </div>
        </div>

        <div className="metric-card" style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
          <div className="metric-header" style={{ alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Database size={14} /> Heap Total</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', textTransform: 'none', letterSpacing: 'normal' }}>
                Espacio pre-reservado por el motor V8. Crece automáticamente si "Heap Used" lo llega a exigir.
              </div>
            </div>
          </div>
          <div className="metric-value" style={{ marginTop: '0.5rem' }}>{currentStats?.heapTotalMb.toFixed(1) || '--'} <span className="metric-unit">MB</span></div>
          <div className="mem-bar-container">
            <div className="mem-bar-fill" style={{ width: '100%', opacity: 0.3 }} />
          </div>
        </div>

        <div className="metric-card" style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
          <div className="metric-header" style={{ alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={14} /> RSS</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', textTransform: 'none', letterSpacing: 'normal' }}>
                (Resident Set Size) Memoria RAM total física ocupada por todo el proceso de Node.js.
              </div>
            </div>
          </div>
          <div className="metric-value" style={{ marginTop: '0.5rem' }}>{currentStats?.rssMb.toFixed(1) || '--'} <span className="metric-unit">MB</span></div>
          <div className="mem-bar-container">
            <div className="mem-bar-fill" style={{ background: 'var(--accent-green)', width: '100%' }} />
          </div>
        </div>
      </div>

      <div className="chart-container" style={{ height: '300px', marginTop: '1rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`colorUsed-${project.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id={`colorTotal-${project.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent-purple)" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="var(--accent-purple)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id={`colorRss-${project.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent-green)" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="var(--accent-green)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="timeLabel" stroke="var(--text-muted)" fontSize={11} tickMargin={10} tickFormatter={(v, i) => i % 3 === 0 ? v : ''} />
            <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(v) => `${v} MB`} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(20, 25, 40, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.4)', color: '#fff' }} 
              itemStyle={{ fontSize: '13px', padding: '2px 0' }} 
            />
            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '13px', paddingBottom: '10px' }} />
            
            <Area type="monotone" dataKey="rssMb" name="RSS (Total en RAM)" stroke="var(--accent-green)" strokeWidth={2} fillOpacity={1} fill={`url(#colorRss-${project.id})`} isAnimationActive={false} />
            <Area type="monotone" dataKey="heapTotalMb" name="Heap Total (Reserva V8)" stroke="var(--accent-purple)" strokeWidth={2} fillOpacity={1} fill={`url(#colorTotal-${project.id})`} isAnimationActive={false} />
            <Area type="monotone" dataKey="heapUsedMb" name="Heap Usado (Activo)" stroke="var(--accent-blue)" strokeWidth={3} fillOpacity={1} fill={`url(#colorUsed-${project.id})`} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


function App() {
  const [discoveredProjects, setDiscoveredProjects] = useState<Record<string, { id: string, name: string }>>({});
  const [statsData, setStatsData] = useState<Record<string, ProcessedStats[]>>({});
  const [activeProjects, setActiveProjects] = useState<string[]>([]);
  const [liveConnections, setLiveConnections] = useState<Set<string>>(new Set()); // IDs of sockets connected

  const handleStats = useCallback((data: MemoryStats, endpoint: string) => {
    // Si el proyecto llega con id y nombre desde NestJS, lo usamos
    const pId = data.projectId || 'unknown';
    const pName = data.projectName || 'Proyecto ' + endpoint;

    setDiscoveredProjects(prev => {
      if (!prev[pId]) {
        // Al descubrir un proyecto vivo, lo activamos automáticamente si es la primera vez
        setActiveProjects(currentActive => currentActive.includes(pId) ? currentActive : [...currentActive, pId]);
        return { ...prev, [pId]: { id: pId, name: pName } };
      }
      // Actualizar nombre en caso de que cambie en caliente
      if (prev[pId].name !== pName) {
        return { ...prev, [pId]: { ...prev[pId], name: pName } };
      }
      return prev;
    });

    const processed: ProcessedStats = {
      ...data,
      projectId: pId,
      projectName: pName,
      timeLabel: new Date(data.timestamp).toLocaleTimeString([], { hour12: false, minute: '2-digit', second:'2-digit' }),
      heapUsedMb: formatMB(data.heapUsed),
      heapTotalMb: formatMB(data.heapTotal),
      rssMb: formatMB(data.rss),
    };
    
    setStatsData(prev => {
      const pStats = prev[pId] ? [...prev[pId]] : [];
      pStats.push(processed);
      if (pStats.length > MAX_DATA_POINTS) pStats.shift();
      return { ...prev, [pId]: pStats };
    });
  }, []);

  useEffect(() => {
    const sockets = MONITOR_ENDPOINTS.map(endpoint => {
      const socket = io(endpoint, { reconnectionAttempts: 3 });
      
      socket.on('connect', () => {
        setLiveConnections(prev => new Set(prev).add(endpoint));
      });
      
      socket.on('disconnect', () => {
        setLiveConnections(prev => {
          const next = new Set(prev);
          next.delete(endpoint);
          return next;
        });
      });

      socket.on('memory_stats', (data: MemoryStats) => handleStats(data, endpoint));
      return socket;
    });

    return () => {
      sockets.forEach(s => s.disconnect());
    };
  }, [handleStats]);

  // Generador de Mocks para DEMO interactiva (si no hay proyecto backend real conectado)
  useEffect(() => {
    if (liveConnections.size > 0) return; // Si hay backend real, paramos los mocks

    const interval = setInterval(() => {
      const mockProjects = [
        { id: 'mock-ui', name: 'Mock Server UI' },
        { id: 'mock-ai', name: 'Mock AI Worker' },
      ];

      mockProjects.forEach((p, idx) => {
        const baseHeap = 80 + (idx * 50);
        const variance = Math.random() * 10 - 2;
        
        handleStats({
          projectId: p.id,
          projectName: p.name,
          timestamp: new Date().toISOString(),
          heapUsed: (baseHeap + variance) * 1024 * 1024,
          heapTotal: (baseHeap + 30) * 1024 * 1024,
          rss: (baseHeap + 70) * 1024 * 1024,
          external: 1.5 * 1024 * 1024,
        }, 'mock');
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [liveConnections.size, handleStats]);

  const toggleProject = (id: string) => {
    setActiveProjects(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const projectArray = Object.values(discoveredProjects);

  return (
    <div className="app-container">
      <header>
        <div className="title-container">
          <Activity size={32} className="title-icon" />
          <h1>NestJS Memory Monitor</h1>
        </div>
      </header>

      <div style={{ padding: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Proyectos Detectados:</span>
        <div className="project-selector">
          {projectArray.length === 0 ? (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>Buscando conexiones...</span>
          ) : (
            projectArray.map(p => (
              <button 
                key={p.id}
                className={`project-btn ${activeProjects.includes(p.id) ? 'active' : ''}`}
                onClick={() => toggleProject(p.id)}
              >
                <Server size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }}/>
                {p.name}
              </button>
            ))
          )}
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        {activeProjects.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
            Selecciona al menos un proyecto arriba para monitorear.
          </div>
        ) : (
          projectArray
            .filter(p => activeProjects.includes(p.id))
            .map(p => (
              <ProjectDashboard 
                key={p.id} 
                project={p} 
                data={statsData[p.id] || []}
                isConnected={liveConnections.size > 0 || String(p.id).startsWith('mock-')}
              />
            ))
        )}
      </div>
    </div>
  );
}

export default App;
