import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Sparkles,
  Activity,
  CalendarClock,
  Mail,
  CalendarDays,
  CheckSquare,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  MessageSquare,
  Settings,
  ChevronUp,
  Zap,
} from "lucide-react";

const NAV = [
  {
    section: null,
    items: [{ icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" }],
  },
  {
    section: "Workflow",
    items: [
      { icon: Sparkles, label: "Generate Briefing", path: "/dashboard" },
      { icon: Activity, label: "Agent Runs", path: "/dashboard" },
      { icon: CalendarClock, label: "Scheduled Briefings", path: "/dashboard" },
    ],
  },
  {
    section: "Data Sources",
    items: [
      { icon: Mail, label: "Emails", path: "/dashboard" },
      { icon: CalendarDays, label: "Calendar", path: "/dashboard" },
      { icon: CheckSquare, label: "Tasks", path: "/dashboard" },
    ],
  },
  {
    section: "Insights",
    items: [
      { icon: TrendingUp, label: "Priorities", path: "/dashboard" },
      { icon: AlertTriangle, label: "Conflicts", path: "/dashboard" },
      { icon: BarChart3, label: "Analytics", path: "/dashboard" },
      { icon: MessageSquare, label: "Feedback", path: "/dashboard" },
    ],
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div>
          <div className="sidebar-logo-text">Orbit</div>
          <div className="sidebar-logo-sub">Personal OS</div>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 py-3">
        {NAV.map((group, gi) => (
          <div key={gi}>
            {group.section && (
              <div className="sidebar-section-label">{group.section}</div>
            )}
            {group.items.map((item) => {
              const isActive =
                item.label === "Dashboard" &&
                location.pathname === "/dashboard";
              return (
                <a
                  key={item.label}
                  className={`sidebar-link ${isActive ? "active" : ""}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(item.path);
                  }}
                  href={item.path}
                >
                  <item.icon size={15} />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="sidebar-bottom">
        <a className="sidebar-link" href="#">
          <Settings size={15} />
          <span>Settings</span>
        </a>
        <div className="sidebar-link" style={{ cursor: "default" }}>
          <div className="w-7 h-7 rounded-full bg-[#6FFF00]/20 border border-[#6FFF00]/30 flex items-center justify-center flex-shrink-0">
            <span className="font-grotesk text-[10px] text-[#6FFF00]">P</span>
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="text-[12px] text-[#EFF4FF]/70 truncate"
              style={{ fontFamily: "'Pixelify Sans', sans-serif" }}
            >
              Pranav Gupta
            </div>
            <div
              className="text-[10px] text-[#EFF4FF]/30 truncate"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              pranav@example.com
            </div>
          </div>
          <ChevronUp size={13} className="text-[#EFF4FF]/25 flex-shrink-0" />
        </div>
      </div>
    </aside>
  );
}
