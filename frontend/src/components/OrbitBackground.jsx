import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Mail,
  MessageSquare
} from "lucide-react";
import { useEffect, useRef } from "react";

const agents = [
  {
    label: "Email Agent",
    icon: Mail,
    className: "orbit-agent-email",
    duration: 34,
    start: 222,
    reverse: false,
    rx: 0.28,
    ry: 0.25
  },
  {
    label: "Calendar Agent",
    icon: CalendarDays,
    className: "orbit-agent-calendar",
    duration: 39,
    start: 305,
    reverse: true,
    rx: 0.28,
    ry: 0.24
  },
  {
    label: "Task Agent",
    icon: ClipboardCheck,
    className: "orbit-agent-task",
    duration: 31,
    start: 180,
    reverse: false,
    rx: 0.42,
    ry: 0.28
  },
  {
    label: "Notes Agent",
    icon: FileText,
    className: "orbit-agent-notes",
    duration: 36,
    start: 8,
    reverse: true,
    rx: 0.42,
    ry: 0.27
  },
  {
    label: "Analytics Agent",
    icon: BarChart3,
    className: "orbit-agent-analytics",
    duration: 42,
    start: 128,
    reverse: false,
    rx: 0.36,
    ry: 0.32
  },
  {
    label: "Research Agent",
    icon: MessageSquare,
    className: "orbit-agent-research",
    duration: 28,
    start: 52,
    reverse: true,
    rx: 0.36,
    ry: 0.31
  }
];

const sparkDots = [
  ["7%", "19%", "1.1s"],
  ["14%", "77%", "3.8s"],
  ["21%", "33%", "2.2s"],
  ["31%", "84%", "0.4s"],
  ["39%", "27%", "4.4s"],
  ["47%", "89%", "2.7s"],
  ["54%", "20%", "1.7s"],
  ["61%", "75%", "4.9s"],
  ["70%", "31%", "0.8s"],
  ["78%", "68%", "3.2s"],
  ["86%", "24%", "5.1s"],
  ["94%", "82%", "2.9s"],
  ["18%", "58%", "5.5s"],
  ["36%", "48%", "1.2s"],
  ["67%", "51%", "3.6s"],
  ["90%", "44%", "0.1s"]
];

const defaultBounds = { width: 1536, height: 790 };

function getAgentTransform(agent, elapsedSeconds, bounds) {
  const direction = agent.reverse ? -1 : 1;
  const angle = ((agent.start + direction * (elapsedSeconds / agent.duration) * 360) * Math.PI) / 180;
  const x = Math.cos(angle) * bounds.width * agent.rx;
  const y = Math.sin(angle) * bounds.height * agent.ry;

  return `translate(-50%, -50%) translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
}

export default function OrbitBackground() {
  const rootRef = useRef(null);
  const agentRefs = useRef([]);

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return undefined;

    const bounds = { ...defaultBounds };
    const applyAgentPositions = (elapsedSeconds) => {
      agents.forEach((agent, index) => {
        const agentElement = agentRefs.current[index];
        if (agentElement) {
          agentElement.style.transform = getAgentTransform(agent, elapsedSeconds, bounds);
        }
      });
    };

    const updateBounds = () => {
      const next = element.getBoundingClientRect();
      bounds.width = next.width || defaultBounds.width;
      bounds.height = next.height || defaultBounds.height;
      applyAgentPositions(0);
    };

    let frameId;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const startedAt = performance.now();
    const animate = (now) => {
      applyAgentPositions((now - startedAt) / 1000);
      frameId = requestAnimationFrame(animate);
    };

    updateBounds();
    const observer = new ResizeObserver(updateBounds);
    observer.observe(element);

    if (!reduceMotion.matches) {
      frameId = requestAnimationFrame(animate);
    }

    return () => {
      observer.disconnect();
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div className="orbit-background" aria-hidden="true" ref={rootRef}>
      <div className="orbit-core-glow" />
      <div className="orbit-horizon-glow" />

      <svg className="orbit-rings" viewBox="0 0 1600 820" preserveAspectRatio="none">
        <ellipse className="orbit-ring orbit-ring-dotted orbit-ring-outer" cx="800" cy="410" rx="790" ry="335" />
        <ellipse className="orbit-ring orbit-ring-solid" cx="800" cy="410" rx="700" ry="285" />
        <ellipse className="orbit-ring orbit-ring-dotted" cx="800" cy="410" rx="610" ry="240" />
        <ellipse className="orbit-ring orbit-ring-solid orbit-ring-soft" cx="800" cy="410" rx="505" ry="190" />
        <ellipse className="orbit-ring orbit-ring-dotted orbit-ring-inner-soft" cx="800" cy="410" rx="410" ry="150" />
        <ellipse className="orbit-ring orbit-ring-solid orbit-ring-inner" cx="800" cy="410" rx="300" ry="112" />
      </svg>

      <div className="orbit-sparks">
        {sparkDots.map(([left, top, delay]) => (
          <span style={{ "--spark-left": left, "--spark-top": top, "--spark-delay": delay }} key={`${left}-${top}`} />
        ))}
      </div>

      {agents.map((agent, index) => {
        const { label, icon: Icon, className } = agent;

        return (
        <div
          className={`orbit-agent-live ${className}`}
          ref={(element) => {
            agentRefs.current[index] = element;
          }}
          style={{ transform: getAgentTransform(agent, 0, defaultBounds) }}
          key={label}
        >
          <div className="orbit-agent-content">
            <span className="orbit-agent-badge">
              <Icon size={24} strokeWidth={2.2} />
            </span>
            <span className="orbit-agent-label">{label}</span>
          </div>
        </div>
        );
      })}
    </div>
  );
}
