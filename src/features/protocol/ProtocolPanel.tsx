import { clientEventMeta, serverEventMeta } from '../../ws/protocol/events'

export function ProtocolPanel() {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Protocol</p>
          <h2>Client and server event anchors</h2>
        </div>
      </div>

      <div className="protocol-grid">
        <div>
          <p className="panel-label">Client requests</p>
          <ul className="code-list">
            {clientEventMeta.map((event) => (
              <li key={event.code}>
                <span>{event.code}</span>
                <code>{event.name}</code>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="panel-label">Server events</p>
          <ul className="code-list">
            {serverEventMeta.map((event) => (
              <li key={event.code}>
                <span>{event.code}</span>
                <code>{event.name}</code>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
