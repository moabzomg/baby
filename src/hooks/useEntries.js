import { useState, useEffect } from "react";
import { load, save } from "../utils/helpers";

export default function useEntries() {
  const [entries, setEntries] = useState(() => load("bd_entries", []));

  useEffect(() => {
    save("bd_entries", entries);
  }, [entries]);

  const addEntry = (entry) => {
    setEntries((prev) => [{ id: Date.now(), ...entry }, ...prev]);
  };

  const deleteEntry = (id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const updateEntry = (id, patch) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    );
  };

  const clearAll = () => setEntries([]);

  return { entries, addEntry, deleteEntry, updateEntry, clearAll, setEntries };
}
