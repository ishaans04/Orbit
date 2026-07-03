import { useNavigate } from "react-router-dom";
import MouseSpotlight from "../components/MouseSpotlight";
import OrbitBackground from "../components/OrbitBackground";
import TypingHeroWord from "../components/TypingHeroWord";

const navItems = ["Solutions", "Framework", "Company", "Reach Out"];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-shell">
      <div className="landing-vignette" aria-hidden="true" />
      <div className="landing-grid" aria-hidden="true" />
      <MouseSpotlight />
      <div className="landing-glow landing-glow-left" aria-hidden="true" />
      <div className="landing-glow landing-glow-right" aria-hidden="true" />

      <header className="landing-header">
        <button
          type="button"
          className="landing-logo"
          onClick={() => navigate("/")}
          aria-label="Orbit home"
        >
          <span>Orbit</span>
          <i aria-hidden="true" />
        </button>

        <nav className="landing-nav" aria-label="Landing navigation">
          {navItems.map((item) => (
            <a href={`#${item.toLowerCase().replaceAll(" ", "-")}`} key={item}>
              {item}
            </a>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="landing-header-cta liquid-glass"
        >
          Open Dashboard
        </button>
      </header>

      <main className="landing-main">
        <OrbitBackground />

        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="hero-kicker">
            <span />
            <p>Built for focus. Tuned for productivity.</p>
          </div>

          <h1 id="landing-title" className="hero-title">
            <span>Multiple Agents, One</span>
            <strong>
              <TypingHeroWord />
            </strong>
          </h1>

          <p className="hero-subtitle">
            Orbit brings your emails, calendar, and tasks together into one
            clear, prioritized plan for the day.
          </p>

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="hero-cta liquid-glass"
          >
            Open Dashboard
          </button>
        </section>
      </main>
    </div>
  );
}
