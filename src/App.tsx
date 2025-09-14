import React, { useEffect, useMemo, useReducer, useRef, useState } from "react";

// --- Types
export type Todo = {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
};

export enum Filter {
  All = "all",
  Active = "active",
  Completed = "completed",
}

// Discriminated union for actions
type Action =
  | { type: "add"; text: string }
  | { type: "toggle"; id: string }
  | { type: "remove"; id: string }
  | { type: "clearCompleted" }
  | { type: "hydrate"; todos: Todo[] };

// --- Reducer with exhaustive checks
function todosReducer(state: Todo[], action: Action): Todo[] {
  switch (action.type) {
    case "hydrate":
      return action.todos;
    case "add":
      if (!action.text.trim()) return state;
      return [
        {
          id: crypto.randomUUID(),
          text: action.text.trim(),
          completed: false,
          createdAt: Date.now(),
        },
        ...state,
      ];
    case "toggle":
      return state.map((t) => (t.id === action.id ? { ...t, completed: !t.completed } : t));
    case "remove":
      return state.filter((t) => t.id !== action.id);
    case "clearCompleted":
      return state.filter((t) => !t.completed);
    default: {
      // Compile-time exhaustiveness
      const _exhaustive: never = action;
      return state;
    }
  }
}

// --- Storage helpers (typed)
const STORAGE_KEY = "ts_todo_app_v1" as const;
function loadTodos(): Todo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    // naive runtime guard
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is Todo =>
        typeof x?.id === "string" && typeof x?.text === "string" && typeof x?.completed === "boolean" && typeof x?.createdAt === "number"
      );
    }
    return [];
  } catch {
    return [];
  }
}

function saveTodos(todos: Todo[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

// --- Main component
export default function TodoApp() {
  const [todos, dispatch] = useReducer(todosReducer, []);
  const [filter, setFilter] = useState<Filter>(Filter.All);
  const inputRef = useRef<HTMLInputElement>(null);

  // hydrate from localStorage once
  useEffect(() => {
    dispatch({ type: "hydrate", todos: loadTodos() });
  }, []);

  // persist on change
  useEffect(() => {
    saveTodos(todos);
  }, [todos]);

  const filtered = useMemo(() => {
    switch (filter) {
      case Filter.Active:
        return todos.filter((t) => !t.completed);
      case Filter.Completed:
        return todos.filter((t) => t.completed);
      default:
        return todos;
    }
  }, [todos, filter]);

  const remaining = useMemo(() => todos.filter((t) => !t.completed).length, [todos]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = inputRef.current?.value ?? "";
    dispatch({ type: "add", text: value });
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={{ margin: 0 }}>TypeScript Todo</h1>
        <p style={{ marginTop: 6, opacity: 0.8 }}>Strongly typed, reducer-based, localStorage-persisted.</p>

        <form onSubmit={handleSubmit} style={styles.row}>
          <input ref={inputRef} placeholder="Add a task…" aria-label="New todo" style={styles.input} />
          <button type="submit" style={styles.button}>Add</button>
        </form>

        <div style={styles.controls}>
          <FilterButton active={filter === Filter.All} onClick={() => setFilter(Filter.All)}>All</FilterButton>
          <FilterButton active={filter === Filter.Active} onClick={() => setFilter(Filter.Active)}>Active</FilterButton>
          <FilterButton active={filter === Filter.Completed} onClick={() => setFilter(Filter.Completed)}>Completed</FilterButton>
          <div style={{ flex: 1 }} />
          <span>{remaining} left</span>
          <button style={{ ...styles.ghostBtn, marginLeft: 12 }} onClick={() => dispatch({ type: "clearCompleted" })}>
            Clear completed
          </button>
        </div>

        <ul style={styles.list}>
          {filtered.map((t) => (
            <li key={t.id} style={styles.item}>
              <label style={styles.itemLeft}>
                <input
                  type="checkbox"
                  checked={t.completed}
                  onChange={() => dispatch({ type: "toggle", id: t.id })}
                />
                <span style={{ ...styles.text, textDecoration: t.completed ? "line-through" : "none", opacity: t.completed ? 0.6 : 1 }}>
                  {t.text}
                </span>
              </label>
              <button aria-label={`Delete ${t.text}`} style={styles.deleteBtn} onClick={() => dispatch({ type: "remove", id: t.id })}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      </div>
      <footer style={{ marginTop: 24, opacity: 0.7 }}>Built with React + TypeScript</footer>
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ ...styles.ghostBtn, ...(active ? styles.ghostBtnActive : null) }}>{children}</button>
  );
}

// --- Inline styles (to keep single-file)
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100svh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#0b1220",
    color: "#eef2ff",
    padding: 24,
  },
  card: {
    width: "min(720px, 92vw)",
    background: "#111827",
    border: "1px solid #1f2937",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
  },
  row: { display: "flex", gap: 12, marginTop: 12 },
  input: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #374151",
    background: "#0b1220",
    color: "#fff",
    outline: "none",
  },
  button: {
    padding: "10px 16px",
    borderRadius: 10,
    border: "1px solid #374151",
    background: "#1f2937",
    color: "#fff",
    cursor: "pointer",
  },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  ghostBtn: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid #374151",
    background: "transparent",
    color: "#e5e7eb",
    cursor: "pointer",
  },
  ghostBtnActive: {
    background: "#1f2937",
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: "12px 0 0",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  item: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #1f2937",
    background: "#0b1220",
  },
  itemLeft: { display: "flex", alignItems: "center", gap: 10 },
  text: { fontSize: 16 },
  deleteBtn: {
    appearance: "none",
    background: "#ef44441a",
    color: "#fca5a5",
    border: "1px solid #ef444433",
    borderRadius: 8,
    cursor: "pointer",
    padding: "4px 8px",
  },
};
