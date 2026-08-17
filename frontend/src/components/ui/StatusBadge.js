const LABELS = {
  awaiting:   'Awaiting',
  pending:    'Pending',
  active:     'Active',
  inprogress: 'In Progress',
  processing: 'Processing',
  completed:  'Completed',
  partial:    'Partial',
  canceled:   'Canceled',
  refunded:   'Refunded',
  error:      'Error',
  fail:       'Failed',
  paused:     'Paused',
  open:       'Open',
  answered:   'Answered',
  closed:     'Closed',
  deposit:    'Deposit',
  order:      'Order',
  refund:     'Refund',
  adjustment: 'Adjustment',
};

export default function StatusBadge({ status }) {
  if (!status) return null;
  return (
    <span className={`badge badge-${status}`}>
      {LABELS[status] || status}
    </span>
  );
}
