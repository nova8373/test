import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Bell,
  Clock3,
  Globe,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Users,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";

const MAX_TOASTS = 4;
const MAX_EVENTS = 12;
const DEFAULT_WS_URL = "wss://test-e39m.onrender.com";
const WS_URL = import.meta.env.VITE_WS_URL ?? DEFAULT_WS_URL;

const createToast = (tone, title, message) => ({
  id: crypto.randomUUID(),
  tone,
  title,
  message,
});

function App() {
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [activeClients, setActiveClients] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [lastMessageAt, setLastMessageAt] = useState(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef(null);
  const socketRef = useRef(null);
  const closeRequested = useRef(false);

  useEffect(() => {
    const addToast = (tone, title, message) => {
      const toast = createToast(tone, title, message);

      setToasts((current) => [toast, ...current].slice(0, MAX_TOASTS));

      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id));
      }, 4500);
    };

    const connect = () => {
      setConnectionStatus((current) =>
        current === "connected" ? "connected" : "connecting",
      );

      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        reconnectAttempts.current = 0;
        setConnectionStatus("connected");
        addToast("success", "Connected", "Live notification channel is active.");
      });

      socket.addEventListener("message", (event) => {
        const payload = JSON.parse(event.data);

        if (payload.type === "clients:count") {
          setActiveClients(payload.count);
          return;
        }

        if (payload.type === "connection:ready") {
          setActiveClients(payload.activeClients);
          return;
        }

        if (payload.type === "notification") {
          setLastMessageAt(payload.sentAt);
          setNotifications((current) => [payload, ...current].slice(0, MAX_EVENTS));
          addToast("info", "New update from server", payload.message);
        }
      });

      socket.addEventListener("close", () => {
        socketRef.current = null;

        if (closeRequested.current) {
          return;
        }

        const attempt = reconnectAttempts.current + 1;
        reconnectAttempts.current = attempt;
        setConnectionStatus("reconnecting");
        scheduleReconnect(attempt);
      });

      socket.addEventListener("error", () => {
        socket.close();
      });
    };

    const scheduleReconnect = (attempt) => {
      const delay = Math.min(1000 * 2 ** (attempt - 1), 10000);

      addToast(
        "warning",
        "Connection lost",
        `Retrying in ${Math.round(delay / 1000)} seconds.`,
      );

      reconnectTimer.current = window.setTimeout(() => {
        connect();
      }, delay);
    };

    const handleBeforeUnload = () => {
      closeRequested.current = true;
      socketRef.current?.close();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    connect();

    return () => {
      closeRequested.current = true;
      window.removeEventListener("beforeunload", handleBeforeUnload);

      if (reconnectTimer.current) {
        window.clearTimeout(reconnectTimer.current);
      }

      socketRef.current?.close();
    };
  }, []);

  const statusConfig = {
    connecting: {
      label: "Connecting",
      icon: RefreshCw,
      description: "Opening the WebSocket channel to the server.",
      tone: "neutral",
    },
    connected: {
      label: "Connected",
      icon: Wifi,
      description: "Real-time updates are flowing normally.",
      tone: "success",
    },
    reconnecting: {
      label: "Reconnecting",
      icon: WifiOff,
      description: "Trying to restore the connection automatically.",
      tone: "warning",
    },
  };

  const status = statusConfig[connectionStatus];
  const StatusIcon = status.icon;
  const latestNotification = notifications[0];
  const heroHighlights = [
    {
      icon: Clock3,
      label: "Cadence",
      value: "Every 10 seconds",
    },
    {
      icon: ShieldCheck,
      label: "Recovery",
      value: "Automatic reconnects",
    },
    {
      icon: Globe,
      label: "Transport",
      value: WS_URL.startsWith("wss") ? "Secure WebSocket" : "WebSocket",
    },
  ];

  return (
    <div className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <main className="dashboard">
        <section className="hero-card">
          <div className="hero-grid">
            <div className="hero-copy">
              <div className="eyebrow">
                <Bell size={16} />
                <span>Full-stack real-time notification system</span>
              </div>

              <div className={`hero-status hero-status-${status.tone}`} role="status">
                <span className="hero-status-dot" />
                <StatusIcon size={15} />
                <span>{status.label}</span>
                <p>{status.description}</p>
              </div>

              <h1>Ship server updates the moment they happen.</h1>
              

              <div className="hero-chip-row">
                {heroHighlights.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.label} className="hero-chip">
                      <div className="hero-chip-icon">
                        <Icon size={16} />
                      </div>
                      <div>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="hero-preview">
              <div className="hero-preview-head">
                <div>
                  <span className="section-kicker">Live snapshot</span>
                  <h2>Channel overview</h2>
                </div>
                <div className={`hero-badge hero-badge-${status.tone}`}>
                  <StatusIcon size={14} />
                  <span>{status.label}</span>
                </div>
              </div>

              <div className="hero-preview-grid">
                <article className="preview-tile">
                  <span>Active clients</span>
                  <strong>{activeClients}</strong>
                  <p>Tracked live on the server.</p>
                </article>

                <article className="preview-tile">
                  <span>Last server push</span>
                  <strong>
                    {lastMessageAt ? formatTimestamp(lastMessageAt) : "Waiting..."}
                  </strong>
                  <p>New broadcast rolls out every 10 seconds.</p>
                </article>
              </div>

              <div className="hero-preview-story">
                <div className="story-line">
                  <Activity size={16} />
                  <div>
                    <span>Socket endpoint</span>
                    <strong>{formatEndpoint(WS_URL)}</strong>
                  </div>
                </div>

                <div className="story-line">
                  <Zap size={16} />
                  <div>
                    <span>Latest payload</span>
                    <strong>
                      {latestNotification?.message ?? "Awaiting the first broadcast"}
                    </strong>
                  </div>
                </div>

                <div className="story-line">
                  <Sparkles size={16} />
                  <div>
                    <span>Recent event cache</span>
                    <strong>{notifications.length} notifications on screen</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="stats-grid">
          <article className="stat-card">
            <div className="stat-icon">
              <StatusIcon size={18} />
            </div>
            <div>
              <span className="stat-label">Connection</span>
              <strong>{status.label}</strong>
              <p>{status.description}</p>
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-icon">
              <Users size={18} />
            </div>
            <div>
              <span className="stat-label">Active clients</span>
              <strong>{activeClients}</strong>
              <p>Server-side connection count updates in real time.</p>
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-icon">
              <Clock3 size={18} />
            </div>
            <div>
              <span className="stat-label">Last notification</span>
              <strong>{lastMessageAt ? formatTimestamp(lastMessageAt) : "Waiting..."}</strong>
              <p>A broadcast arrives every 10 seconds while connected.</p>
            </div>
          </article>
        </section>

        <section className="feed-card">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Live feed</span>
              <h2>Recent notifications</h2>
              <p className="section-copy">
                The newest messages appear first and surface immediately as toast
                alerts, so users always know when the server has something new.
              </p>
            </div>
            <div className="feed-pill-group">
              <div className="pill">
                <Server size={16} />
                <span>Server push</span>
              </div>
              <div className="pill pill-soft">
                <Bell size={16} />
                <span>{notifications.length} cached</span>
              </div>
            </div>
          </div>

          <div className="feed-status-strip">
            <div className="status-strip-item">
              <span>Connection</span>
              <strong>{status.label}</strong>
            </div>
            <div className="status-strip-item">
              <span>Broadcast rhythm</span>
              <strong>10-second interval</strong>
            </div>
            <div className="status-strip-item">
              <span>Current audience</span>
              <strong>{activeClients} active</strong>
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="empty-state">
              <TriangleAlert size={18} />
              <div>
                <strong>Waiting for the first server notification...</strong>
                <p>
                  Keep this page open. As soon as the server pushes an update, a
                  toast and feed entry will appear automatically.
                </p>
              </div>
            </div>
          ) : (
            <ul className="notification-list">
              {notifications.map((notification, index) => (
                <li
                  key={notification.id}
                  className={`notification-item ${index === 0 ? "notification-item-featured" : ""}`}
                >
                  <div className="notification-badge">
                    <Bell size={16} />
                  </div>

                  <div className="notification-copy">
                    <div className="notification-topline">
                      <strong>{notification.message}</strong>
                      {index === 0 ? <span className="mini-pill">Latest</span> : null}
                    </div>
                    <p>
                      Broadcast #{notification.sequence} at{" "}
                      {formatTimestamp(notification.sentAt)}
                    </p>
                  </div>

                  <div className="notification-meta">
                    <span>#{notification.sequence}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <aside className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.tone}`}>
            <Bell size={18} />
            <div>
              <strong>{toast.title}</strong>
              <p>{toast.message}</p>
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
}

function formatTimestamp(value) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatEndpoint(value) {
  try {
    const parsed = new URL(value);
    return parsed.host;
  } catch {
    return value;
  }
}

export default App;
