import { useState, useMemo } from "react";
import {
  Send,
  Loader2,
  Mail,
  CalendarDays,
  CheckSquare,
  Clock3,
  Settings,
  Sun,
  FileText,
  AlertTriangle,
  User,
  ArrowRight,
  Inbox,
  CheckCircle2,
  MessageSquareText,
  Zap
} from "lucide-react";
import Sidebar from "../components/Sidebar";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";

const AGENT_LABELS = {
  planner: "Planner Agent",
  email: "Email Agent",
  calendar: "Calendar Agent",
  task: "Task Agent",
  priority: "Priority Agent",
  final_briefing: "Final Briefing"
};

const AGENT_ORDER = [
  "planner",
  "email",
  "calendar",
  "task",
  "priority",
  "final_briefing"
];

function scoreBand(score) {
  if (!score) return "medium";
  if (score >= 7) return "high";
  if (score >= 4) return "medium";
  return "low";
}

function TypeIcon({ type }) {
  if (type === "email") return <Inbox size={15} />;
  if (type === "meeting") return <CalendarDays size={15} />;
  if (type === "task") return <CheckSquare size={15} />;
  return <MessageSquareText size={15} />;
}

function inferItemType(item) {
  if (item.type) return item.type;
  if (item.sender || item.subject) return "email";
  if (item.start) return "meeting";
  if (item.due_date || item.estimated_effort_minutes) return "task";
  return undefined;
}

export default function Dashboard() {
  const [request, setRequest] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasStarted, setHasStarted] = useState(false); // To toggle empty state
  const [statuses, setStatuses] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const topScoreById = useMemo(() => {
    const ranking = result?.briefing?.full_sections?.ranking ?? [];
    return Object.fromEntries(ranking.map((item) => [item.item_id, item.priority_score]));
  }, [result]);

  async function generateBriefing(prompt = request) {
    setIsGenerating(true);
    setHasStarted(true);
    setStatuses([]);
    setResult(null);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/api/briefing/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: prompt || "generate_daily_briefing" })
      });

      if (!response.ok || !response.body) {
        throw new Error(`Briefing request failed with ${response.status}`);
      }

      await readEventStream(response.body.getReader());
    } catch (caught) {
      setError(caught.message ?? "Unable to generate briefing.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function readEventStream(reader) {
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        handleStreamEvent(part);
      }
    }
  }

  function handleStreamEvent(rawEvent) {
    const eventLine = rawEvent
      .split("\n")
      .find((line) => line.startsWith("event:"));
    const dataLine = rawEvent
      .split("\n")
      .find((line) => line.startsWith("data:"));

    if (!eventLine || !dataLine) return;

    const event = eventLine.replace("event:", "").trim();
    const payload = JSON.parse(dataLine.replace("data:", "").trim());

    if (event === "status") {
      setStatuses((current) => [...current, payload]);
    }
    if (event === "final") {
      setResult(payload);
    }
    if (event === "error") {
      setError(payload.message);
    }
  }

  // Calculate agent statuses for pipeline
  const agentStatusMap = {};
  statuses.forEach((s) => {
    agentStatusMap[s.agent] = s.status; // 'running' or 'done'
  });

  const briefing = result?.briefing;

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-area">
        {/* HEADER */}
        <header className="dash-header">
          <div>
            <h1 className="dash-header-title">AI Daily Briefing Assistant</h1>
            <p className="dash-header-sub">Your AI co-pilot for a focused and productive day.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="status-pill">
              <div className="status-dot" />
              System Status: All Systems Online
            </div>
            <button className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-colors">
              <Sun size={16} />
            </button>
          </div>
        </header>

        {/* GENERATE BAR */}
        <div className="generate-bar">
          <div className="font-grotesk text-[13px] uppercase text-[#EFF4FF] tracking-wide mb-3">
            What would you like to know today?
          </div>
          <div className="generate-row">
            <input
              className="generate-input"
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isGenerating && generateBriefing()}
              placeholder="E.g., Give me my daily briefing, check conflicts, show urgent emails..."
            />
            <button
              className="generate-btn"
              onClick={() => generateBriefing()}
              disabled={isGenerating}
            >
              {isGenerating ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
              Generate Briefing
            </button>
          </div>
          <div className="chip-row">
            <button className="chip" onClick={() => generateBriefing("Full Briefing")}>
              <FileText className="text-[#4ADE80]" /> Full Briefing
            </button>
            <button className="chip" onClick={() => generateBriefing("Conflicts")}>
              <AlertTriangle className="text-[#f59e0b]" /> Conflicts
            </button>
            <button className="chip" onClick={() => generateBriefing("Manager Email")}>
              <Mail className="text-[#a855f7]" /> Manager Email
            </button>
            <button className="chip" onClick={() => generateBriefing("Due Tasks")}>
              <CheckSquare className="text-[#3b82f6]" /> Due Tasks
            </button>
            <button className="chip" onClick={() => generateBriefing("Free Time")}>
              <Clock3 className="text-[#4ADE80]" /> Free Time
            </button>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="content-area">
          {!hasStarted ? (
            /* EMPTY STATE */
            <div className="dash-empty fade-in-up">
              <div className="dash-empty-orbit">
                <div className="orbit-ring" />
                <div className="orbit-ring" />
                <div className="orbit-core">
                  <Zap size={24} />
                </div>
              </div>
              <h2>Ready for your briefing</h2>
              <p>
                Enter a request above or select a quick prompt to begin. The orchestrator will engage the necessary agents to analyze your data.
              </p>
            </div>
          ) : (
            <div className="fade-in-up">
              {error && (
                <div className="mb-4 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-[12px]">
                  {error}
                </div>
              )}

              {/* STATS */}
              <div className="font-grotesk text-[14px] uppercase text-[#EFF4FF] tracking-wide mb-3 mt-2">
                Today at a glance
              </div>
              <div className="stat-grid">
                <div className="stat-card">
                  <div className="stat-icon bg-[#4ADE80]/10 text-[#4ADE80]"><Mail size={20} /></div>
                  <div>
                    <div className="stat-num">{briefing?.full_sections?.emails?.length || 0}</div>
                    <div className="stat-label">Important Emails</div>
                    <div className="stat-sub text-[#4ADE80]">Active items</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon bg-[#a855f7]/10 text-[#a855f7]"><CalendarDays size={20} /></div>
                  <div>
                    <div className="stat-num">{briefing?.full_sections?.meetings?.length || 0}</div>
                    <div className="stat-label">Meetings</div>
                    <div className="stat-sub text-[#f87171]">Check schedule</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon bg-[#3b82f6]/10 text-[#3b82f6]"><CheckSquare size={20} /></div>
                  <div>
                    <div className="stat-num">{briefing?.full_sections?.tasks?.length || 0}</div>
                    <div className="stat-label">Pending Tasks</div>
                    <div className="stat-sub text-[#3b82f6]">Requires action</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon bg-[#f59e0b]/10 text-[#f59e0b]"><Clock3 size={20} /></div>
                  <div>
                    <div className="stat-num">
                      {briefing?.suggested_schedule?.length || 0}
                    </div>
                    <div className="stat-label">Schedule Blocks</div>
                    <div className="stat-sub text-[#EFF4FF]/50">Suggested blocks</div>
                  </div>
                </div>
              </div>

              {/* TWO COLUMNS: Priorities & Schedule */}
              <div className="two-col">
                {/* Top Priorities */}
                <div className="panel-card flex flex-col">
                  <div className="panel-card-header">
                    <span className="panel-card-title">Top Priorities</span>
                    <span className="panel-card-action">View all</span>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {!briefing ? (
                      <div className="p-8 text-center opacity-50"><Loader2 className="spin inline text-[#6FFF00]" size={20} /></div>
                    ) : (
                      briefing.top_priorities.map((item, idx) => {
                        const score = topScoreById[item.item_id];
                        const band = scoreBand(score);
                        const type = item.type ?? inferItemType(item);
                        return (
                          <div key={idx} className="priority-row">
                            <div className="priority-num">{idx + 1}</div>
                            <div className={`priority-icon bg-${band === 'urgent' || band === 'high' ? 'red' : 'green'}-500/10 text-${band === 'urgent' || band === 'high' ? 'red' : 'green'}-400`}>
                              <TypeIcon type={type} />
                            </div>
                            <div className="priority-info">
                              <div className="priority-title">{item.headline}</div>
                              <div className="priority-detail">{item.source || item.sender || "System"}</div>
                            </div>
                            <div className={`urgency-badge badge-${band}`}>
                              {band.charAt(0).toUpperCase() + band.slice(1)}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Today's Schedule */}
                <div className="panel-card flex flex-col">
                  <div className="panel-card-header">
                    <span className="panel-card-title">Today's Schedule</span>
                    <span className="panel-card-action flex items-center border border-white/10 px-3 py-1 rounded-full text-[#EFF4FF]">
                      View calendar
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 pt-2">
                    {!briefing ? (
                       <div className="p-8 text-center opacity-50"><Loader2 className="spin inline text-[#6FFF00]" size={20} /></div>
                    ) : (
                      briefing.suggested_schedule.map((block, idx) => (
                        <div key={idx} className="schedule-row-item">
                          <div className="sched-time">{block.time_block.split(" - ")[0]}</div>
                          <div className="flex flex-col items-center h-full pt-1">
                            <div className="sched-dot bg-[#6FFF00]"></div>
                            {idx < briefing.suggested_schedule.length - 1 && (
                              <div className="w-[1px] h-full bg-gradient-to-b from-[#6FFF00]/50 to-transparent my-1"></div>
                            )}
                          </div>
                          <div className="sched-info">
                            <div className="sched-title text-[#EFF4FF]">{block.activity}</div>
                            <div className="sched-detail">{block.time_block}</div>
                          </div>
                          {block.activity.toLowerCase().includes("conflict") && (
                            <div className="conflict-badge">
                              <AlertTriangle size={10} /> Conflict
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* AGENT PIPELINE */}
              <div className="pipeline-section">
                <div className="pipeline-header">
                  <span className="pipeline-title">AI Agent Workflow (Live)</span>
                  <span className="pipeline-action border border-white/10 px-3 py-1 rounded-full text-[#EFF4FF] hover:bg-white/5 flex items-center gap-2">
                    <ArrowRight size={10}/> View latest run
                  </span>
                </div>
                <div className="pipeline-flow">
                  {AGENT_ORDER.map((agentKey, idx) => {
                    const status = agentStatusMap[agentKey] || (result ? "done" : "pending");
                    let Icon = User;
                    if (agentKey === "planner") Icon = Zap;
                    if (agentKey === "email") Icon = Mail;
                    if (agentKey === "calendar") Icon = CalendarDays;
                    if (agentKey === "task") Icon = CheckSquare;
                    if (agentKey === "priority") Icon = AlertTriangle;
                    if (agentKey === "final_briefing") Icon = FileText;

                    return (
                      <div key={agentKey} className="flex items-center">
                        <div className="pipeline-node">
                          <div className={`pipeline-icon ${status === 'running' ? 'border-[#f59e0b] shadow-[0_0_10px_rgba(245,158,11,0.2)]' : status === 'done' ? 'border-[#6FFF00] bg-[#6FFF00]/5' : ''}`}>
                             <Icon size={20} className={status === 'running' ? 'text-[#f59e0b]' : status === 'done' ? 'text-[#6FFF00]' : 'text-white/30'} />
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="pipeline-label">{AGENT_LABELS[agentKey]}</span>
                            <span className={`pipeline-status ${status}`}>
                              {status === 'running' ? 'Running...' : status === 'done' ? 'Completed' : 'Pending'}
                            </span>
                          </div>
                        </div>
                        {idx < AGENT_ORDER.length - 1 && (
                          <div className="pipeline-arrow">
                            <ArrowRight size={12} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
