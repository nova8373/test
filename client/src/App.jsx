import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Clock3,
  RefreshCw,
  Server,
  TriangleAlert,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";

const MAX_TOASTS = 4;
const MAX_EVENTS = 12;
const FALLBACK_WS_URL ="wss://test-e39m.onrender.com"
const WS_URL = "wss://test-e39m.onrender.com"

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
    },
    connected: {
      label: "Connected",
      icon: Wifi,
      description: "Real-time updates are flowing normally.",
    },
    reconnecting: {
      label: "Reconnecting",
      icon: WifiOff,
      description: "Trying to restore the connection automatically.",
    },
  };

  const status = statusConfig[connectionStatus];
  const StatusIcon = status.icon;

  return (
    <div className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <main className="dashboard">
        <section className="hero-card">
          <div className="eyebrow">
            <Bell size={16} />
            <span>Full-stack real-time notification system</span>
          </div>

          <h1>Instant server updates, delivered live with WebSockets.</h1>
          <p>
            The Express server broadcasts a new notification every 10 seconds to
            every connected React client. Connection state, reconnection flow,
            and active client tracking all stay visible on screen.
          </p>
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
            </div>
            <div className="pill">
              <Server size={16} />
              <span>Server push</span>
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="empty-state">
              <TriangleAlert size={18} />
              <span>Waiting for the first server notification...</span>
            </div>
          ) : (
            <ul className="notification-list">
              {notifications.map((notification) => (
                <li key={notification.id} className="notification-item">
                  <div className="notification-badge">
                    <Bell size={16} />
                  </div>
                  <div>
                    <strong>{notification.message}</strong>
                    <p>
                      Broadcast #{notification.sequence} at{" "}
                      {formatTimestamp(notification.sentAt)}
                    </p>
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

export default App;
