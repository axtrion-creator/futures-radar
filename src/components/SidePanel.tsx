import { marked } from 'marked';
import { RadarItem } from '../lib/types';

interface SidePanelProps {
  item: RadarItem | null;
  onClose: () => void;
}

export function SidePanel({ item, onClose }: SidePanelProps) {
  if (!item) {
    return (
      <aside className="sidebar" aria-label="Radar item details" aria-live="polite">
        <p>Select a node to see details.</p>
      </aside>
    );
  }

  const summaryHtml = marked.parse(item.summary || '', { async: false }) as string;

  return (
    <aside className="sidebar" aria-label="Radar item details" aria-live="polite">
      <button type="button" onClick={onClose} style={{ alignSelf: 'flex-end', marginBottom: '1rem' }}>
        Close
      </button>
      <h2>{item.title}</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <span className="badge">{item.type}</span>
        <span className="badge">{item.quadrant}</span>
        <span className="badge">{item.ring}</span>
        <span className="badge">Updated {item.updated_at}</span>
      </div>
      <section>
        <h3 style={{ marginBottom: '0.5rem' }}>Summary</h3>
        <div dangerouslySetInnerHTML={{ __html: summaryHtml }} />
      </section>
      {item.sources?.length ? (
        <section>
          <h3>Sources</h3>
          <ul className="source-list">
            {item.sources.map((source) => (
              <li key={`${item.id}-${source.url}`}>
                {source.url ? (
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.label || source.url}
                  </a>
                ) : (
                  source.label
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section>
        <h3>Confidence</h3>
        <div className="progress-bar" aria-hidden={item.confidence == null}>
          <div className="progress-fill" style={{ width: `${(item.confidence ?? 0) * 20}%` }} />
        </div>
        <h3>Impact</h3>
        <div className="progress-bar" aria-hidden={item.impact == null}>
          <div className="progress-fill" style={{ width: `${(item.impact ?? 0) * 20}%` }} />
        </div>
      </section>
      {item.notes ? (
        <section>
          <h3>Notes</h3>
          <p>{item.notes}</p>
        </section>
      ) : null}
    </aside>
  );
}
