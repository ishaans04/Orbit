import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  Clock3,
  Database,
  FileText,
  LayoutDashboard,
  Loader2,
  Mail,
  MessageSquare,
  Send,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  User,
  X
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";

const AGENTS = [
  { key: "planner", label: "Planner", icon: Brain },
  { key: "email", label: "Email Agent", icon: Mail },
  { key: "calendar", label: "Calendar Agent", icon: CalendarDays },
  { key: "task", label: "Task Agent", icon: CheckSquare },
  { key: "priority", label: "Priority Agent", icon: Star },
  { key: "final_briefing", label: "Briefing Agent", icon: FileText }
];

const DATA_SOURCES = [
  { label: "Emails", icon: Mail },
  { label: "Calendar", icon: CalendarDays },
  { label: "Tasks", icon: CheckSquare }
];

const DASHBOARD_NAV = [{ label: "Dashboard", icon: LayoutDashboard }];

const INSIGHTS = [
  { label: "Priorities", icon: TrendingUp },
  { label: "Conflicts", icon: AlertTriangle },
  { label: "Analytics", icon: BarChart3 },
  { label: "Feedback", icon: MessageSquare },
  { label: "History", icon: Clock3 }
];

const QUICK_COMMANDS = [
  { label: "Morning Brief", prompt: "Morning Brief", icon: Sparkles },
  { label: "Conflicts", prompt: "Conflicts", icon: AlertTriangle },
  { label: "Inbox", prompt: "Inbox", icon: Mail },
  { label: "Due Tasks", prompt: "Due Tasks", icon: CheckSquare },
  { label: "Free Time", prompt: "Free Time", icon: Clock3 }
];

const cardMotion = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
};

function formatClock(date = new Date()) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatTopBarDate(date) {
  const day = date.toLocaleDateString([], { weekday: "long" });
  return `Today is ${day} \u2022 ${formatClock(date)}`;
}

function formatValueTime(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDateTime(value) {
  if (!value) return "No date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function eventLabel(event) {
  if (event.message) return event.message;
  if (event.status === "running") return "Processing live data";
  if (event.status === "done") return "Completed";
  return "Waiting to start";
}

function normalizeAgentKey(key) {
  return key === "final" ? "final_briefing" : key;
}

function getSectionOutput(statuses, key) {
  return [...statuses].reverse().find(
    (event) => normalizeAgentKey(event.agent) === key && event.output
  )?.output;
}

function getAgentStatus(agentKey, statuses, result, isGenerating, simulatedStep) {
  if (result) return "completed";

  const latest = [...statuses]
    .reverse()
    .find((event) => normalizeAgentKey(event.agent) === agentKey);

  if (latest?.status === "done") return "completed";
  if (latest?.status === "running") return "running";

  if (isGenerating && statuses.length === 0) {
    const index = AGENTS.findIndex((agent) => agent.key === agentKey);
    if (index < simulatedStep) return "completed";
    if (index === simulatedStep) return "running";
  }

  return "waiting";
}

function detectConflicts(events) {
  return [...events]
    .sort((left, right) => new Date(left.start) - new Date(right.start))
    .slice(0, -1)
    .flatMap((event, index, sorted) => {
      const next = sorted[index + 1];
      if (!next || new Date(event.end) <= new Date(next.start)) return [];
      return [{
        event_ids: [event.id, next.id],
        description: `${event.title} overlaps with ${next.title}.`
      }];
    });
}

function SidebarGroup({ title, items, activeLabel, onSelect }) {
  return (
    <div className="orbit-os-nav-group">
      <div className="orbit-os-section-label">{title}</div>
      <div className="orbit-os-nav-list">
        {items.map(({ label, icon: Icon }) => (
          <button
            type="button"
            className={`orbit-os-nav-item ${label === activeLabel ? "is-active" : ""}`}
            onClick={() => onSelect(label)}
            key={label}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function FeedbackControls({ target, onFeedback, feedbackState }) {
  if (!target) return null;

  const key = `${target.item_type}:${target.item_id}`;
  const state = feedbackState[key];
  const isSaving = state === "saving-up" || state === "saving-down";
  const savedAction = state?.replace("saved-", "");

  return (
    <div className="orbit-feedback-actions" aria-label="Feedback controls">
      {["up", "down"].map((action) => {
        const Icon = action === "up" ? ThumbsUp : ThumbsDown;
        const isSaved = savedAction === action;
        return (
          <button
            type="button"
            className={isSaved ? "is-saved" : ""}
            onClick={() => onFeedback(target, action)}
            disabled={isSaving}
            aria-label={action === "up" ? "Mark useful" : "Mark not useful"}
            key={action}
          >
            <Icon size={14} />
          </button>
        );
      })}
      {savedAction && <span>Saved</span>}
    </div>
  );
}

function BriefingItem({
  children,
  meta,
  icon: Icon = Sparkles,
  feedbackTarget,
  feedbackState,
  onFeedback
}) {
  return (
    <motion.div className="orbit-brief-item" {...cardMotion}>
      <div className="orbit-brief-item-icon">
        <Icon size={16} />
      </div>
      <div>
        <p>{children}</p>
        {meta && <span>{meta}</span>}
      </div>
      <FeedbackControls
        target={feedbackTarget}
        feedbackState={feedbackState}
        onFeedback={onFeedback}
      />
    </motion.div>
  );
}

function BriefSection({ title, children }) {
  return (
    <motion.section className="orbit-brief-section" {...cardMotion}>
      <h3>{title}</h3>
      <div className="orbit-brief-section-body">{children}</div>
    </motion.section>
  );
}

function StatCard({ label, value, detail }) {
  return (
    <div className="orbit-mvp-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <p>{detail}</p>}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="orbit-modal-backdrop" role="presentation" onClick={onClose}>
      <motion.div
        className="orbit-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="orbit-modal-header">
          <div>
            <span className="orbit-os-section-heading">{title}</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>
        <div className="orbit-modal-body">{children}</div>
      </motion.div>
    </div>
  );
}

export default function Dashboard() {
  const [request, setRequest] = useState("");
  const [activeView, setActiveView] = useState("Dashboard");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [statuses, setStatuses] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(new Date());
  const [simulatedStep, setSimulatedStep] = useState(0);
  const [runStartedAt, setRunStartedAt] = useState(null);
  const [mockData, setMockData] = useState({ emails: [], calendar: [], tasks: [] });
  const [feedbackRecords, setFeedbackRecords] = useState([]);
  const [briefingRuns, setBriefingRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [dataError, setDataError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [feedbackState, setFeedbackState] = useState({});
  const [telemetry, setTelemetry] = useState(null);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadDashboardData() {
      setIsDataLoading(true);
      setDataError("");
      try {
        const [emails, calendar, tasks, feedback, runs] = await Promise.all([
          fetchJson("/api/data/mock/emails"),
          fetchJson("/api/data/mock/calendar"),
          fetchJson("/api/data/mock/tasks"),
          fetchJson("/api/feedback"),
          fetchJson("/api/briefing/runs")
        ]);

        if (!ignore) {
          setMockData({ emails, calendar, tasks });
          setFeedbackRecords(feedback);
          setBriefingRuns(runs);
        }
      } catch (caught) {
        if (!ignore) {
          setDataError(caught.message ?? "Unable to load dashboard data.");
        }
      } finally {
        if (!ignore) setIsDataLoading(false);
      }
    }

    loadDashboardData();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!isGenerating || statuses.length > 0) {
      setSimulatedStep(0);
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setSimulatedStep((step) => Math.min(step + 1, AGENTS.length - 1));
    }, 750);

    return () => window.clearInterval(timerId);
  }, [isGenerating, statuses.length]);

  const briefing = result?.briefing;
  const calendarOutput = useMemo(() => getSectionOutput(statuses, "calendar"), [statuses]);
  const priorityOutput = useMemo(() => getSectionOutput(statuses, "priority"), [statuses]);
  const latestConflicts = calendarOutput?.conflicts?.length
    ? calendarOutput.conflicts
    : detectConflicts(mockData.calendar);

  const analytics = useMemo(() => {
    const importantEmails = mockData.emails.filter((email) => email.labels?.includes("important")).length;
    const unreadEmails = mockData.emails.filter((email) => !email.read).length;
    const pendingTasks = mockData.tasks.filter((task) => task.status?.toLowerCase() === "pending").length;
    const upcomingMeetings = mockData.calendar.length;

    return {
      importantEmails,
      unreadEmails,
      pendingTasks,
      upcomingMeetings,
      conflicts: latestConflicts.length,
      feedback: feedbackRecords.length
    };
  }, [feedbackRecords.length, latestConflicts.length, mockData]);

  const timelineEvents = useMemo(() => {
    const actualEvents = statuses.map((event, index) => ({
      ...event,
      id: `${event.agent}-${event.status}-${index}`,
      displayTime: formatClock(new Date(event.observedAt ?? Date.now())),
      label: AGENTS.find((agent) => agent.key === normalizeAgentKey(event.agent))?.label ?? event.agent
    }));

    if (actualEvents.length) return actualEvents.slice(-6);

    const base = runStartedAt ?? Date.now();
    return AGENTS.slice(0, 5).map((agent, index) => ({
      id: `placeholder-${agent.key}`,
      agent: agent.key,
      status: isGenerating && index === simulatedStep ? "running" : "waiting",
      displayTime: index < 3 ? formatClock(new Date(base + index * 60000)) : "--:--",
      label: agent.label,
      message: index < 3 ? "Waiting for live status" : "Waiting to start"
    }));
  }, [isGenerating, runStartedAt, simulatedStep, statuses]);

  async function fetchJson(path, options) {
    const response = await fetch(`${API_BASE}${path}`, options);
    if (!response.ok) {
      throw new Error(`${path} failed with ${response.status}`);
    }
    return response.json();
  }

  function selectView(label) {
    setActiveView(label);
    window.history.replaceState(null, "", "/dashboard");
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }

  async function loadHistory(runId = selectedRun?.id) {
    setIsHistoryLoading(true);
    setHistoryError("");
    try {
      const runs = await fetchJson("/api/briefing/runs");
      setBriefingRuns(runs);
      const nextRunId = runId ?? runs[0]?.id;
      if (nextRunId) {
        const detail = await fetchJson(`/api/briefing/runs/${nextRunId}`);
        setSelectedRun(detail);
      }
    } catch (caught) {
      setHistoryError(caught.message ?? "Unable to load briefing history.");
    } finally {
      setIsHistoryLoading(false);
    }
  }

  async function openRunDetail(runId) {
    setIsHistoryLoading(true);
    setHistoryError("");
    try {
      const detail = await fetchJson(`/api/briefing/runs/${runId}`);
      setSelectedRun(detail);
    } catch (caught) {
      setHistoryError(caught.message ?? "Unable to load briefing run.");
    } finally {
      setIsHistoryLoading(false);
    }
  }

  async function generateBriefing(prompt = request) {
    setActiveView("Dashboard");
    setIsGenerating(true);
    setHasStarted(true);
    setStatuses([]);
    setResult(null);
    setError("");
    setRunStartedAt(Date.now());

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
      setStatuses((current) => [...current, { ...payload, observedAt: Date.now() }]);
    }
    if (event === "final") {
      setResult(payload);
      if (payload.run_id) {
        loadHistory(payload.run_id);
      }
    }
    if (event === "error") {
      setError(payload.message);
    }
  }

  async function submitFeedback(target, action) {
    const itemKey = `${target.item_type}:${target.item_id}`;
    setFeedbackState((current) => ({ ...current, [itemKey]: `saving-${action}` }));

    try {
      const record = await fetchJson("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...target,
          action
        })
      });
      setFeedbackRecords((current) => [...current, record]);
      setFeedbackState((current) => ({ ...current, [itemKey]: `saved-${action}` }));
    } catch (caught) {
      setFeedbackState((current) => ({ ...current, [itemKey]: "error" }));
      setError(caught.message ?? "Unable to save feedback.");
    }
  }

  async function openTelemetry() {
    setIsTelemetryOpen(true);
    setTelemetry({ status: "checking" });
    try {
      const health = await fetchJson("/api/health");
      setTelemetry({
        status: health.status,
        checkedAt: new Date().toISOString()
      });
    } catch (caught) {
      setTelemetry({
        status: "offline",
        message: caught.message ?? "Unable to reach backend.",
        checkedAt: new Date().toISOString()
      });
    }
  }

  function renderDashboardView() {
    return (
      <>
        <motion.section className="orbit-os-command" {...cardMotion}>
          <div className="orbit-os-title-row">
            <span />
            <h1>Orbit Command Center</h1>
            <span />
          </div>

          <div className="orbit-command-input-wrap">
            <Sparkles size={28} />
            <input
              value={request}
              onChange={(event) => setRequest(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !isGenerating) generateBriefing();
              }}
              placeholder="Ask Orbit anything..."
            />
            <button
              type="button"
              onClick={() => generateBriefing()}
              disabled={isGenerating}
              aria-label="Send command"
            >
              {isGenerating ? <Loader2 size={24} className="spin" /> : <Send size={24} />}
            </button>
          </div>

          <div className="orbit-command-chips">
            {QUICK_COMMANDS.map(({ label, prompt, icon: Icon }) => (
              <button
                type="button"
                key={label}
                onClick={() => generateBriefing(prompt)}
                disabled={isGenerating}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </motion.section>

        {renderBriefingPanel()}
      </>
    );
  }

  function renderBriefingPanel() {
    return (
      <motion.section className="orbit-ai-brief" {...cardMotion}>
        <div className="orbit-os-section-heading">AI Brief</div>
        {error && <div className="orbit-os-error">{error}</div>}

        <AnimatePresence mode="wait">
          {!briefing ? (
            <motion.div
              className="orbit-brief-empty"
              key="empty"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <div className="orbit-brief-empty-orbits" aria-hidden="true" />
              <h2>{hasStarted ? "Orbit is building your briefing" : "Your personalized briefing will appear here"}</h2>
              <p>Orbit is analyzing your data from all connected sources...</p>
            </motion.div>
          ) : (
            <motion.div
              className="orbit-brief-results"
              key="results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <div className="orbit-brief-summary">
                <Sparkles size={18} />
                <p>{briefing.summary}</p>
              </div>

              <BriefSection title="Top Priorities">
                {(briefing.top_priorities ?? []).map((item) => (
                  <BriefingItem
                    key={item.item_id}
                    icon={Star}
                    meta={item.type}
                    feedbackTarget={{
                      item_id: item.item_id,
                      item_type: item.type,
                      item_features: { source: "top_priority" }
                    }}
                    feedbackState={feedbackState}
                    onFeedback={submitFeedback}
                  >
                    {item.headline}
                  </BriefingItem>
                ))}
              </BriefSection>

              <BriefSection title="Important Emails">
                {(briefing.full_sections?.emails ?? []).length ? (
                  briefing.full_sections.emails.map((email) => (
                    <BriefingItem
                      key={email.id}
                      icon={Mail}
                      meta={`${email.sender} ${email.requires_reply ? "Reply needed" : ""}`}
                      feedbackTarget={{
                        item_id: email.id,
                        item_type: "email",
                        item_features: {
                          sender_domain: email.sender?.split("@").at(-1),
                          has_deadline: Boolean(email.deadline)
                        }
                      }}
                      feedbackState={feedbackState}
                      onFeedback={submitFeedback}
                    >
                      {email.subject}
                    </BriefingItem>
                  ))
                ) : (
                  <p className="orbit-brief-muted">No important emails detected.</p>
                )}
              </BriefSection>

              <BriefSection title="Schedule Conflicts">
                {latestConflicts.length ? (
                  latestConflicts.map((conflict, index) => (
                    <BriefingItem key={`${conflict.description}-${index}`} icon={AlertTriangle}>
                      {conflict.description}
                    </BriefingItem>
                  ))
                ) : (
                  <p className="orbit-brief-muted">No schedule conflicts detected.</p>
                )}
              </BriefSection>

              <BriefSection title="Due Tasks">
                {(briefing.full_sections?.tasks ?? []).length ? (
                  briefing.full_sections.tasks.map((task) => (
                    <BriefingItem
                      key={task.id}
                      icon={CheckSquare}
                      meta={task.due_date ? `Due ${formatValueTime(task.due_date)}` : task.source}
                      feedbackTarget={{
                        item_id: task.id,
                        item_type: "task",
                        item_features: { has_deadline: Boolean(task.due_date) }
                      }}
                      feedbackState={feedbackState}
                      onFeedback={submitFeedback}
                    >
                      {task.title}
                    </BriefingItem>
                  ))
                ) : (
                  <p className="orbit-brief-muted">No due tasks found.</p>
                )}
              </BriefSection>

              <BriefSection title="Suggested Schedule">
                {(briefing.suggested_schedule ?? []).length ? (
                  briefing.suggested_schedule.map((block, index) => (
                    <BriefingItem key={`${block.time_block}-${index}`} icon={Clock3} meta={block.time_block}>
                      {block.activity}
                    </BriefingItem>
                  ))
                ) : (
                  <p className="orbit-brief-muted">No schedule blocks suggested yet.</p>
                )}
              </BriefSection>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
    );
  }

  function renderDataView() {
    if (activeView === "Emails") {
      return (
        <DataView title="Emails" subtitle="Mock inbox data currently feeding the Email Agent.">
          {mockData.emails.map((email) => (
            <div className="orbit-data-row" key={email.id}>
              <Mail size={18} />
              <div>
                <strong>{email.subject}</strong>
                <p>{email.sender} - {formatDateTime(email.received_at)}</p>
                <span>{email.read ? "Read" : "Unread"} {email.labels?.join(" / ")}</span>
              </div>
            </div>
          ))}
        </DataView>
      );
    }

    if (activeView === "Calendar") {
      return (
        <DataView title="Calendar" subtitle="Mock meetings currently feeding the Calendar Agent.">
          {mockData.calendar.map((event) => (
            <div className="orbit-data-row" key={event.id}>
              <CalendarDays size={18} />
              <div>
                <strong>{event.title}</strong>
                <p>{formatDateTime(event.start)} - {formatValueTime(event.end)}</p>
                <span>{event.attendees?.length ?? 0} attendee(s)</span>
              </div>
            </div>
          ))}
        </DataView>
      );
    }

    return (
      <DataView title="Tasks" subtitle="Mock task data currently feeding the Task Agent.">
        {mockData.tasks.map((task) => (
          <div className="orbit-data-row" key={task.id}>
            <CheckSquare size={18} />
            <div>
              <strong>{task.title}</strong>
              <p>{task.due_date ? `Due ${formatDateTime(task.due_date)}` : "No due date"}</p>
              <span>{task.status} - {task.estimated_effort_minutes ?? 45} min</span>
            </div>
          </div>
        ))}
      </DataView>
    );
  }

  function renderInsightView() {
    if (activeView === "Priorities") {
      const ranking = priorityOutput?.ranked_items ?? briefing?.full_sections?.ranking ?? [];
      return (
        <DataView title="Priorities" subtitle="Latest ranked items from the Priority Agent.">
          {ranking.length ? ranking.map((item) => (
            <div className="orbit-data-row" key={`${item.type}-${item.item_id}`}>
              <Star size={18} />
              <div>
                <strong>{item.item_id}</strong>
                <p>{item.justification ?? item.headline ?? "Ranked by urgency signals"}</p>
                <span>{item.type} {item.priority_score ? `- score ${item.priority_score}/10` : ""}</span>
              </div>
            </div>
          )) : <EmptyView message="Run a briefing to generate ranked priorities." />}
        </DataView>
      );
    }

    if (activeView === "Conflicts") {
      return (
        <DataView title="Conflicts" subtitle="Calendar overlaps detected from the latest run or mock calendar.">
          {latestConflicts.length ? latestConflicts.map((conflict, index) => (
            <div className="orbit-data-row" key={`${conflict.description}-${index}`}>
              <AlertTriangle size={18} />
              <div>
                <strong>Schedule conflict</strong>
                <p>{conflict.description}</p>
                <span>{conflict.event_ids?.join(" + ")}</span>
              </div>
            </div>
          )) : <EmptyView message="No conflicts detected right now." />}
        </DataView>
      );
    }

    if (activeView === "Analytics") {
      return (
        <DataView title="Analytics" subtitle="A lightweight snapshot of the current mock workspace.">
          <div className="orbit-mvp-stats-grid">
            <StatCard label="Unread emails" value={analytics.unreadEmails} />
            <StatCard label="Important emails" value={analytics.importantEmails} />
            <StatCard label="Meetings" value={analytics.upcomingMeetings} />
            <StatCard label="Pending tasks" value={analytics.pendingTasks} />
            <StatCard label="Conflicts" value={analytics.conflicts} />
            <StatCard label="Feedback records" value={analytics.feedback} />
          </div>
        </DataView>
      );
    }

    if (activeView === "History") {
      return (
        <DataView title="History" subtitle="Persistent briefing runs saved by the backend database.">
          {historyError && <div className="orbit-os-error">{historyError}</div>}
          {isHistoryLoading && (
            <div className="orbit-empty-inline">
              <Loader2 size={16} className="spin" />
              <span>Loading briefing history...</span>
            </div>
          )}
          {briefingRuns.length ? (
            <div className="orbit-history-layout">
              <div className="orbit-data-list">
                {briefingRuns.map((run) => (
                  <button
                    type="button"
                    className={`orbit-data-row orbit-history-run ${
                      selectedRun?.id === run.id ? "is-selected" : ""
                    }`}
                    onClick={() => openRunDetail(run.id)}
                    key={run.id}
                  >
                    <Clock3 size={18} />
                    <div>
                      <strong>{run.prompt}</strong>
                      <p>{formatDateTime(run.created_at)} - {run.status}</p>
                      <span>{run.event_count} event(s) {run.has_output ? "- briefing saved" : ""}</span>
                    </div>
                  </button>
                ))}
              </div>
              <RunDetail run={selectedRun} />
            </div>
          ) : (
            <EmptyView message="Run a briefing to create your first saved history item." />
          )}
        </DataView>
      );
    }

    return (
      <DataView title="Feedback" subtitle="Recent up/down signals saved through the current feedback endpoint.">
        {feedbackRecords.length ? [...feedbackRecords].reverse().slice(0, 12).map((record, index) => (
          <div className="orbit-data-row" key={`${record.item_id}-${record.timestamp}-${index}`}>
            {record.action === "up" ? <ThumbsUp size={18} /> : <ThumbsDown size={18} />}
            <div>
              <strong>{record.item_id}</strong>
              <p>{record.item_type} marked {record.action === "up" ? "useful" : "not useful"}</p>
              <span>{formatDateTime(record.timestamp)}</span>
            </div>
          </div>
        )) : <EmptyView message="No feedback recorded yet. Run a briefing and rate an item." />}
      </DataView>
    );
  }

  function DataView({ title, subtitle, children }) {
    return (
      <motion.section className="orbit-mvp-view" {...cardMotion}>
        <div className="orbit-mvp-view-header">
          <span className="orbit-os-section-heading">{title}</span>
          <p>{subtitle}</p>
        </div>
        {dataError && <div className="orbit-os-error">{dataError}</div>}
        {isDataLoading ? (
          <div className="orbit-brief-empty">
            <Loader2 size={22} className="spin" />
            <p>Loading local demo data...</p>
          </div>
        ) : (
          <div className="orbit-data-list">{children}</div>
        )}
      </motion.section>
    );
  }

  function EmptyView({ message }) {
    return (
      <div className="orbit-empty-inline">
        <Sparkles size={18} />
        <span>{message}</span>
      </div>
    );
  }

  function RunDetail({ run }) {
    if (!run) {
      return (
        <div className="orbit-run-detail">
          <EmptyView message="Select a briefing run to inspect its saved output." />
        </div>
      );
    }

    const output = run.output;
    const savedBriefing = output?.briefing;

    return (
      <div className="orbit-run-detail">
        <div className="orbit-run-detail-header">
          <span className="orbit-os-section-heading">Run Detail</span>
          <strong>{run.status}</strong>
          <p>{formatDateTime(run.created_at)}</p>
        </div>

        {!savedBriefing ? (
          <EmptyView message={run.error_message || "This run has no saved briefing output yet."} />
        ) : (
          <div className="orbit-run-sections">
            <div className="orbit-brief-summary">
              <Sparkles size={18} />
              <p>{savedBriefing.summary}</p>
            </div>

            <BriefSection title="Top Priorities">
              {(savedBriefing.top_priorities ?? []).length ? (
                savedBriefing.top_priorities.map((item) => (
                  <BriefingItem key={item.item_id} icon={Star} meta={item.type}>
                    {item.headline}
                  </BriefingItem>
                ))
              ) : (
                <p className="orbit-brief-muted">No priorities saved for this run.</p>
              )}
            </BriefSection>

            <BriefSection title="Important Emails">
              {(savedBriefing.full_sections?.emails ?? []).length ? (
                savedBriefing.full_sections.emails.map((email) => (
                  <BriefingItem key={email.id} icon={Mail} meta={email.sender}>
                    {email.subject}
                  </BriefingItem>
                ))
              ) : (
                <p className="orbit-brief-muted">No important emails saved for this run.</p>
              )}
            </BriefSection>

            <BriefSection title="Due Tasks">
              {(savedBriefing.full_sections?.tasks ?? []).length ? (
                savedBriefing.full_sections.tasks.map((task) => (
                  <BriefingItem
                    key={task.id}
                    icon={CheckSquare}
                    meta={task.due_date ? `Due ${formatValueTime(task.due_date)}` : task.source}
                  >
                    {task.title}
                  </BriefingItem>
                ))
              ) : (
                <p className="orbit-brief-muted">No due tasks saved for this run.</p>
              )}
            </BriefSection>

            <BriefSection title="Suggested Schedule">
              {(savedBriefing.suggested_schedule ?? []).length ? (
                savedBriefing.suggested_schedule.map((block, index) => (
                  <BriefingItem key={`${block.time_block}-${index}`} icon={Clock3} meta={block.time_block}>
                    {block.activity}
                  </BriefingItem>
                ))
              ) : (
                <p className="orbit-brief-muted">No schedule saved for this run.</p>
              )}
            </BriefSection>
          </div>
        )}
      </div>
    );
  }

  function renderMainView() {
    if (activeView === "Dashboard") return renderDashboardView();
    if (["Emails", "Calendar", "Tasks"].includes(activeView)) return renderDataView();
    return renderInsightView();
  }

  return (
    <div className="orbit-os-shell">
      <div className="orbit-os-grid" aria-hidden="true" />
      <div className="orbit-os-glow orbit-os-glow-left" aria-hidden="true" />
      <div className="orbit-os-glow orbit-os-glow-right" aria-hidden="true" />

      <header className="orbit-os-topbar">
        <div className="orbit-os-logo">
          <span>Orbit</span>
          <i aria-hidden="true" />
        </div>
        <div className="orbit-os-time">{formatTopBarDate(now)}</div>
        <div className="orbit-os-top-actions">
          <div className="orbit-os-live-pill">
            <span />
            <strong>Live</strong>
            <em>All Systems Online</em>
          </div>
          <button
            className="orbit-os-icon-button"
            type="button"
            aria-label="System telemetry"
            onClick={openTelemetry}
          >
            <Activity size={18} />
          </button>
        </div>
      </header>

      <div className="orbit-os-layout">
        <aside className="orbit-os-sidebar">
          <SidebarGroup
            title="Dashboard"
            items={DASHBOARD_NAV}
            activeLabel={activeView}
            onSelect={selectView}
          />
          <SidebarGroup
            title="Data Sources"
            items={DATA_SOURCES}
            activeLabel={activeView}
            onSelect={selectView}
          />
          <SidebarGroup
            title="Insights"
            items={INSIGHTS}
            activeLabel={activeView}
            onSelect={selectView}
          />

          <button className="orbit-os-login" type="button" onClick={() => setIsLoginOpen(true)}>
            <User size={21} />
            <span>Login / Sign up</span>
          </button>
        </aside>

        <main className="orbit-os-main">
          <AnimatePresence mode="wait">
            <motion.div key={activeView} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {renderMainView()}
            </motion.div>
          </AnimatePresence>
        </main>

        <aside className="orbit-os-right">
          <motion.section className="orbit-side-card" {...cardMotion}>
            <div className="orbit-os-section-heading">Agent Status</div>
            <div className="orbit-status-list">
              {AGENTS.map(({ key, label, icon: Icon }) => {
                const status = getAgentStatus(key, statuses, result, isGenerating, simulatedStep);
                return (
                  <div className={`orbit-status-row ${status}`} key={key}>
                    <Icon size={20} />
                    <span>{label}</span>
                    <CheckCircle2 className="orbit-status-check" size={17} />
                    <i />
                  </div>
                );
              })}
            </div>
          </motion.section>

          <motion.section className="orbit-side-card orbit-timeline-card" {...cardMotion}>
            <div className="orbit-os-section-heading">Execution Timeline</div>
            <div className="orbit-timeline">
              {timelineEvents.map((event) => {
                const status = event.status === "done" ? "completed" : event.status;
                return (
                  <div className={`orbit-timeline-item ${status}`} key={event.id}>
                    <div className="orbit-timeline-pin" />
                    <div>
                      <time>{event.displayTime}</time>
                      <strong>{event.label}</strong>
                      <span>{eventLabel(event)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>
        </aside>
      </div>

      <AnimatePresence>
        {isTelemetryOpen && (
          <Modal title="System Telemetry" onClose={() => setIsTelemetryOpen(false)}>
            <div className="orbit-modal-grid">
              <StatCard
                label="Backend"
                value={telemetry?.status === "checking" ? "Checking" : telemetry?.status ?? "Unknown"}
                detail={telemetry?.message}
              />
              <StatCard label="Data mode" value="Mock Data" detail="Local JSON fixtures" />
              <StatCard
                label="Last run"
                value={runStartedAt ? formatClock(new Date(runStartedAt)) : "Not run"}
                detail={isGenerating ? "Briefing in progress" : result ? "Briefing completed" : "Idle"}
              />
            </div>
          </Modal>
        )}

        {isLoginOpen && (
          <Modal title="Demo Mode" onClose={() => setIsLoginOpen(false)}>
            <div className="orbit-demo-modal-copy">
              <Database size={22} />
              <div>
                <h2>Orbit is running in local demo mode.</h2>
                <p>
                  Authentication is intentionally paused for this MVP phase. The app is using mock
                  emails, calendar events, tasks, and feedback until real integrations are added.
                </p>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
