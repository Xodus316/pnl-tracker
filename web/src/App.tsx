import { Link, NavLink, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Trades from "./pages/Trades";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-lg text-sm font-body font-medium transition-all duration-200 ${
    isActive
      ? "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 shadow-neon-cyan-sm"
      : "text-cyber-400 hover:text-neon-cyan border border-transparent"
  }`;

export default function App() {
  return (
    <div className="min-h-full flex flex-col">
      <header className="header-border-glow bg-cyber-950/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-6">
          <Link
            to="/"
            className="font-display text-lg font-bold tracking-[0.15em] text-cyber-100"
          >
            pnl
            <span className="text-neon-cyan drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]">
              .
            </span>
            tracker
          </Link>
          <nav className="flex gap-1">
            <NavLink to="/" end className={navClass}>
              Dashboard
            </NavLink>
            <NavLink to="/trades" className={navClass}>
              Trades
            </NavLink>
            <NavLink to="/upload" className={navClass}>
              Upload
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/trades" element={<Trades />} />
          <Route path="/upload" element={<Upload />} />
        </Routes>
      </main>
    </div>
  );
}
