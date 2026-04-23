export default function ConfirmModal({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel, loading }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{title}</div>
        <div className="modal-sub">{message}</div>
        <div className="modal-actions">
          <button className="btn" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className={`btn ${danger ? 'danger' : 'primary'} ${loading ? 'loading' : ''}`} onClick={onConfirm} disabled={loading}>
            {loading ? <span className="spinner" style={{width:14,height:14}} /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
