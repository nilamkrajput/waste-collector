import React, { useCallback, useEffect, useState } from "react";

const API = "http://localhost:3001/collections";

export default function App() {

  // set states using useState
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // get collection data from api(server)
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRows(await res.json());
      setError("");
    } catch (e) {
      setError(`Failed to load data: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 5000);
    return () => clearInterval(id);
  }, [fetchData]);

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h1 className="h4 fw-bold mb-0">Waste Collections</h1>
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-success">{rows.length} record{rows.length !== 1 ? "s" : ""}</span>
          <button className="btn btn-sm btn-outline-secondary" onClick={fetchData}>↻ Refresh</button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="text-center py-5 text-muted">
          <div className="spinner-border spinner-border-sm me-2" />
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-5 text-muted">No collections yet. Submit one from the mobile app.</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped table-hover align-middle">
            <thead className="table-dark">
              <tr>
                <th>QR ID</th>
                <th>Weight (kg)</th>
                <th>Points</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.qr_id}>
                  <td><code>{r.qr_id}</code></td>
                  <td>{Number(r.weight).toFixed(2)}</td>
                  <td><span className="badge bg-success">{r.points}</span></td>
                  <td className="text-muted">{new Date(r.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
