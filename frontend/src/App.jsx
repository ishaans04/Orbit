import { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Inbox,
  Loader2,
  MessageSquareText,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  TriangleAlert
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";

const AGENT_LABELS = {
  planner: "Planner",
  email: "Email",
  calendar: "Calendar",
  task: "Task",
  priority: "Priority",
  final_briefing: "Final Briefing"
};

const SECTION_LABELS = {
  emails: "Emails",
  meetings: "Meetings",
  tasks: "Tasks",
  ranking: "Priority Ranking"
};

function App() {
  const [request, setRequest] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [statuses, setStatuses] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [feedbackState, setFeedbackState] = useState({});
  const [openSections, setOpenSections] = useState({
    emails: true,
    meetings: true,
    tasks: true,
    ranking: false
  });

  const topScoreById = useMemo(() => {
    const ranking = result?.briefing?.full_sections?.ranking ?? [];
    return Object.fromEntries(ranking.map((item) => [item.item_id, item.priority_score]));
  }, [result]);

  async function generateBriefing(prompt = request) {
    setIsGenerating(true);
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

  async function sendFeedback(item, action) {
    const itemId = item.item_id ?? item.id;
    const itemType = item.type ?? inferItemType(item);
    if (!itemId || !itemType) return;

    setFeedbackState((current) => ({
      ...current,
      [itemId]: action
    }));

    await fetch(`${API_BASE}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_id: itemId,
        item_type: itemType,
        action
      })
    });
  }

  function toggleSection(key) {
    setOpenSections((current) => ({
      ...current,
      [key]: !current[key]
    }));
  }

  return (
    <main className="app-shell">
      <section className="command-band">
        <div className="title-block">
          <p className="eyebrow">Multi-agent personal OS</p>
          <h1>AI Daily Briefing Assistant</h1>
          <p className="subtitle">
            A typed planner-agent workflow for email, calendar, tasks, priorities,
            and feedback-aware briefings.
          </p>
        </div>

        <div className="command-panel">
          <label htmlFor="briefing-request">Ask about your day</label>
          <div className="request-row">
            <input
              id="briefing-request"
              value={request}
              onChange={(event) => setRequest(event.target.value)}
              placeholder="Generate a daily briefing, find conflicts, or check urgent emails..."
            />
            <button
              className="icon-button primary"
              type="button"
              onClick={() => generateBriefing()}
              disabled={isGenerating}
              title="Generate Daily Briefing"
            >
              {isGenerating ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
              <span>Generate</span>
            </button>
          </div>
          <div className="quick-prompts" aria-label="Example requests">
            <button type="button" onClick={() => generateBriefing("generate_daily_briefing")}>
              Full briefing
            </button>
            <button
              type="button"
              onClick={() => generateBriefing("Do I have scheduling conflicts today?")}
            >
              Conflicts
            </button>
            <button
              type="button"
              onClick={() => generateBriefing("Any urgent emails from my manager?")}
            >
              Manager email
            </button>
            <button
              type="button"
              onClick={() => generateBriefing("Which tasks are due soon?")}
            >
              Due tasks
            </button>
          </div>
        </div>
      </section>

      <section className="workspace-grid">
        <aside className="status-panel">
          <div className="panel-heading">
            <Sparkles size={18} />
            <h2>Agent Run</h2>
          </div>
          {statuses.length === 0 ? (
            <p className="empty-state">Run a briefing to watch the planner and agents work.</p>
          ) : (
            <ol className="status-list">
              {statuses.map((status, index) => (
                <li key={`${status.agent}-${index}`} className={`status-row ${status.status}`}>
                  {status.status === "running" ? (
                    <Loader2 className="spin" size={16} />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  <div>
                    <strong>{AGENT_LABELS[status.agent] ?? status.agent}</strong>
                    <span>{status.message ?? status.status}</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
          {result?.plan && (
            <div className="plan-box">
              <h3>Planner Output</h3>
              <p>{result.plan.reasoning}</p>
              <div className="agent-chips">
                {result.plan.agents_to_run.map((agent) => (
                  <span key={agent}>{AGENT_LABELS[agent]}</span>
                ))}
              </div>
            </div>
          )}
        </aside>

        <section className="briefing-panel">
          {error && (
            <div className="error-banner">
              <TriangleAlert size={18} />
              <span>{error}</span>
            </div>
          )}

          {!result ? (
            <div className="briefing-empty">
              <Clock3 size={24} />
              <h2>Your briefing will appear here</h2>
              <p>
                The Phase 1 flow uses local fixtures, validates every agent response,
                and streams status events as the orchestrator runs.
              </p>
            </div>
          ) : (
            <BriefingView
              result={result}
              topScoreById={topScoreById}
              feedbackState={feedbackState}
              onFeedback={sendFeedback}
              openSections={openSections}
              onToggleSection={toggleSection}
            />
          )}
        </section>
      </section>
    </main>
  );
}

function BriefingView({
  result,
  topScoreById,
  feedbackState,
  onFeedback,
  openSections,
  onToggleSection
}) {
  const briefing = result.briefing;

  return (
    <div className="briefing-content">
      <div className="summary-band">
        <div>
          <p className="eyebrow">Today</p>
          <h2>Daily Briefing</h2>
          <p>{briefing.summary}</p>
        </div>
      </div>

      <section className="priority-strip" aria-label="Top priorities">
        {briefing.top_priorities.map((item) => (
          <article className="priority-card" key={`${item.type}-${item.item_id}`}>
            <div className="priority-meta">
              <TypeIcon type={item.type} />
              <span>{item.type}</span>
              <strong>{topScoreById[item.item_id] ?? "-"}/10</strong>
            </div>
            <h3>{item.headline}</h3>
            <FeedbackControls
              item={item}
              selected={feedbackState[item.item_id]}
              onFeedback={onFeedback}
            />
          </article>
        ))}
      </section>

      {briefing.suggested_schedule.length > 0 && (
        <section className="schedule-band">
          <div className="section-heading">
            <Clock3 size={18} />
            <h3>Suggested Schedule</h3>
          </div>
          <div className="schedule-list">
            {briefing.suggested_schedule.map((item) => (
              <div className="schedule-row" key={`${item.time_block}-${item.activity}`}>
                <strong>{item.time_block}</strong>
                <span>{item.activity}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="sections-stack">
        {Object.entries(briefing.full_sections).map(([key, items]) => (
          <BriefingSection
            key={key}
            sectionKey={key}
            items={items}
            isOpen={openSections[key]}
            onToggle={() => onToggleSection(key)}
            feedbackState={feedbackState}
            onFeedback={onFeedback}
          />
        ))}
      </div>
    </div>
  );
}

function BriefingSection({
  sectionKey,
  items,
  isOpen,
  onToggle,
  feedbackState,
  onFeedback
}) {
  return (
    <section className="briefing-section">
      <button className="section-toggle" type="button" onClick={onToggle}>
        {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        <span>{SECTION_LABELS[sectionKey] ?? sectionKey}</span>
        <strong>{items.length}</strong>
      </button>
      {isOpen && (
        <div className="item-list">
          {items.length === 0 ? (
            <p className="empty-state">No items for this scoped run.</p>
          ) : (
            items.map((item) => (
              <BriefingItem
                key={item.item_id ?? item.id}
                item={item}
                sectionKey={sectionKey}
                selected={feedbackState[item.item_id ?? item.id]}
                onFeedback={onFeedback}
              />
            ))
          )}
        </div>
      )}
    </section>
  );
}

function BriefingItem({ item, sectionKey, selected, onFeedback }) {
  const title = item.headline ?? item.subject ?? item.title ?? item.item_id ?? item.id;
  const detail =
    item.justification ??
    item.reason_flagged ??
    item.sender ??
    formatTimeRange(item.start, item.end) ??
    item.source;

  return (
    <article className="briefing-item">
      <div className="item-main">
        <div className="item-title-row">
          <TypeIcon type={item.type ?? inferItemType(item, sectionKey)} />
          <h4>{title}</h4>
        </div>
        {detail && <p>{detail}</p>}
        <ItemMeta item={item} />
      </div>
      {sectionKey !== "ranking" && (
        <FeedbackControls item={item} selected={selected} onFeedback={onFeedback} />
      )}
    </article>
  );
}

function ItemMeta({ item }) {
  const parts = [];
  if (item.priority_score) parts.push(`Priority ${item.priority_score}/10`);
  if (item.urgency_score) parts.push(`Urgency ${item.urgency_score}/5`);
  if (item.deadline) parts.push(`Deadline ${formatDateTime(item.deadline)}`);
  if (item.due_date) parts.push(`Due ${formatDateTime(item.due_date)}`);
  if (item.start && item.end) parts.push(formatTimeRange(item.start, item.end));
  if (item.estimated_effort_minutes) parts.push(`${item.estimated_effort_minutes} min`);

  if (parts.length === 0) return null;
  return (
    <div className="item-meta">
      {parts.map((part) => (
        <span key={part}>{part}</span>
      ))}
    </div>
  );
}

function FeedbackControls({ item, selected, onFeedback }) {
  return (
    <div className="feedback-controls" aria-label="Feedback controls">
      <button
        className={selected === "up" ? "selected" : ""}
        type="button"
        onClick={() => onFeedback(item, "up")}
        title="Mark useful"
      >
        <ThumbsUp size={15} />
      </button>
      <button
        className={selected === "down" ? "selected" : ""}
        type="button"
        onClick={() => onFeedback(item, "down")}
        title="Mark not useful"
      >
        <ThumbsDown size={15} />
      </button>
    </div>
  );
}

function TypeIcon({ type }) {
  if (type === "email") return <Inbox size={16} />;
  if (type === "meeting") return <CalendarDays size={16} />;
  if (type === "task") return <CheckCircle2 size={16} />;
  return <MessageSquareText size={16} />;
}

function inferItemType(item, sectionKey) {
  if (item.type) return item.type;
  if (sectionKey === "emails" || item.sender || item.subject) return "email";
  if (sectionKey === "meetings" || item.start) return "meeting";
  if (sectionKey === "tasks" || item.due_date || item.estimated_effort_minutes) return "task";
  return undefined;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatTimeRange(start, end) {
  if (!start || !end) return "";
  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  });
  return `${formatter.format(new Date(start))} - ${formatter.format(new Date(end))}`;
}

export default App;
