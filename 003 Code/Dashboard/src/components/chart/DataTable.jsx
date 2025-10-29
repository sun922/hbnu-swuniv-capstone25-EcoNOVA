export default function DataTable({ title, rows, showTitle = true }) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const headers = safeRows.length > 0 ? Object.keys(safeRows[0]) : [];

  return (
    <div style={wrapperStyle}>
      {showTitle && <h4 style={titleStyle}>{title}</h4>}
      <div style={scrollArea}>
        {safeRows.length === 0 ? (
          <div style={emptyStateStyle}>데이터가 없습니다.</div>
        ) : (
          <table style={tableStyle}>
            <thead style={theadStyle}>
              <tr>
                {headers.map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {safeRows.map((row, i) => (
                <tr key={i} style={rowStyle}>
                  {headers.map((h) => (
                    <td key={h} style={tdStyle}>{row[h]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const wrapperStyle = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  overflowY: "auto",
  overflowX: "auto",
};

const titleStyle = {
  margin: "0 0 10px 0",
  fontSize: 16,
  color: "var(--text)",
  fontWeight: 600,
};

const scrollArea = {
  flex: 1,
  width: "100%",
  overflowX: "auto",
  overflowY: "auto",
  border: "1px solid var(--border)",
  borderRadius: "4px",
  background: "var(--panel)",
};

const emptyStateStyle = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--muted)",
  fontSize: 14,
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
};

const theadStyle = {
  position: "sticky",
  top: 0,
  zIndex: 1,
  background: "var(--gray-100)",
  textAlign: "left",
};

const thStyle = {
  padding: "10px 20px",
  fontWeight: 600,
  color: "var(--text)",
};

const tdStyle = {
  padding: "10px 14px",
  borderBottom: "1px solid var(--border)",
  color: "var(--text)",
};

const rowStyle = {
  transition: "background-color 0.2s ease",
};
