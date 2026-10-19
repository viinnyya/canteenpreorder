// Shared order status settings: labels, badge colours and which status can follow which.

const LABELS = {
  pending_payment: 'Awaiting payment check',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready: 'Ready for pickup',
  picked_up: 'Picked up',
  rejected: 'Rejected',
  no_show: 'No-show',
  cancelled: 'Cancelled'
};

const BADGES = {
  pending_payment: 'warning',
  accepted: 'info',
  preparing: 'primary',
  ready: 'success',
  picked_up: 'secondary',
  rejected: 'danger',
  no_show: 'dark',
  cancelled: 'secondary'
};

// Statuses an order can still move on from (not finished yet).
const ACTIVE = ['pending_payment', 'accepted', 'preparing', 'ready'];

// The only allowed status changes. Anything else is rejected by the server.
const TRANSITIONS = {
  pending_payment: ['accepted', 'rejected'], // the student can also cancel while here
  accepted: ['preparing'],
  preparing: ['ready'],
  ready: ['picked_up', 'no_show']
};

// Button text the stall sees for each target status.
const ACTIONS = {
  accepted: 'Accept payment',
  rejected: 'Reject order',
  preparing: 'Start preparing',
  ready: 'Mark ready for pickup',
  picked_up: 'Mark picked up',
  no_show: 'Mark no-show'
};

module.exports = { LABELS, BADGES, ACTIVE, TRANSITIONS, ACTIONS };
