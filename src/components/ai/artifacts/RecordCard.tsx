// The "Record" (cartridge refill) artifact card. One bespoke card per outcome of
// the cartridge_* executors, all emitted as a `refill` artifact whose data
// carries a discriminated `state` (see src/ai/actions/cartridge.ts):
//   created    a new refill logged, as a tear-off order slip
//   status     a status change, before to after
//   view       an existing record looked up
//   list       the open/all refill records, with an empty state
//   not_found  the id did not match anything
//
// The tool hue is violet (DESIGN-SPEC tool signature colours). Money and ids are
// mono/tabular like a real slip. A 4x6 label download is ALWAYS offered on any
// state that has an order, price or not: the label carries the order id, the
// customer, and the cartridge so it can go on the physical item. The label uses
// the shared simpleReceipt 4x6 path (via receiptOutput) - no second PDF path.
//
// Registered via `export function register(reg)` per PHASE-2-ARCH section 3.2;
// the integrator adds the one import + call in artifactRegistry.tsx.
import React from 'react';
import {
  ArrowRight,
  Check,
  Download,
  Droplets,
  Inbox,
  Printer,
  SearchX,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { describeCartridge, isFilledNumber } from '@/lib/cartridges';
import { formatReceiptDate, type SimpleReceiptOptions } from '@/lib/simpleReceipt';
import { downloadReceipt, printReceipt } from '@/ai/receiptOutput';
import type { ArtifactRegistry } from '@/components/shell/artifactRegistry';
import type {
  OrderStatus,
  RefillArtifactData,
  RefillOrderView,
} from '@/ai/actions/cartridge';

const money = (n: number) => `$${n.toFixed(2)}`;

// Edge/divider colours matching the DESIGN-SPEC `edge` token, chosen by theme the
// way the surrounding files do (isDarkMode from useTheme).
const useEdges = () => {
  const { isDarkMode } = useTheme();
  return {
    divide: isDarkMode ? 'divide-[#2a2f3a]' : 'divide-[#e4e1d9]',
    edge: isDarkMode ? 'border-[#2a2f3a]' : 'border-[#e4e1d9]',
  };
};

// A 4x6 label for the physical cartridge. Always buildable, price or not.
function labelOpts(order: RefillOrderView): SimpleReceiptOptions {
  const items = order.cartridges.map((c) => ({
    description: describeCartridge(c) || 'Cartridge',
    price: isFilledNumber(c.price) ? c.price : 0,
  }));
  return {
    title: 'Refill Label',
    identifierLabel: 'Order ID',
    identifierValue: order.id,
    date: formatReceiptDate(order.dateReceived) || order.dateReceived,
    rows: [
      { label: 'Customer', value: order.customerName },
      { label: 'Phone', value: order.customerPhone },
      { label: 'Status', value: order.statusLabel },
    ],
    items,
    price: order.subtotal,
    fileNameBase: `refill-label-${order.id}`,
  };
}

// --- shared pieces ----------------------------------------------------------

// Status chip. Never colour-only: it always carries the status text too.
const StatusPill: React.FC<{ status: OrderStatus; label: string }> = ({ status, label }) => {
  const { themeClasses } = useTheme();
  const tone =
    status === 'picked_up'
      ? themeClasses.status.success
      : status === 'ready'
        ? themeClasses.status.info
        : themeClasses.status.warning;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[13px] font-medium ${tone}`}
    >
      {label}
    </span>
  );
};

// One ledger row: label left, value right. `mono` sets the value in tabular
// figures for ids, money, and phone numbers.
const Row: React.FC<{ label: string; children: React.ReactNode; mono?: boolean }> = ({
  label,
  children,
  mono,
}) => {
  const { themeClasses } = useTheme();
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className={`text-[13px] ${themeClasses.text.secondary}`}>{label}</span>
      <span
        className={`text-right text-sm ${themeClasses.text.primary} ${
          mono ? 'font-mono tabular-nums' : ''
        }`}
      >
        {children}
      </span>
    </div>
  );
};

const CardShell: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}> = ({ icon, title, subtitle, children }) => {
  const { themeClasses, isDarkMode } = useTheme();
  const { edge } = useEdges();
  const badge = isDarkMode
    ? 'bg-violet-500/15 text-violet-300'
    : 'bg-violet-100 text-violet-700';
  return (
    <div className={`rounded-xl border ${themeClasses.card.primary}`}>
      <div className={`flex items-center gap-3 border-b px-4 py-3 ${edge}`}>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${badge}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <div className={`text-sm font-semibold ${themeClasses.text.primary}`}>{title}</div>
          {subtitle && (
            <div className={`text-[13px] ${themeClasses.text.secondary}`}>{subtitle}</div>
          )}
        </div>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
};

// The cartridge lines with a subtotal rule. Handles the no-price case.
const CartridgeLines: React.FC<{ order: RefillOrderView }> = ({ order }) => {
  const { themeClasses } = useTheme();
  const { divide, edge } = useEdges();
  return (
    <div className="mt-3">
      <div className={`mb-1 text-[13px] font-medium ${themeClasses.text.secondary}`}>
        {order.cartridges.length === 1 ? 'Cartridge' : 'Cartridges'}
      </div>
      <div className={`divide-y ${divide}`}>
        {order.cartridges.map((c, i) => (
          <div key={i} className="flex items-start justify-between gap-3 py-2">
            <span className={`text-sm ${themeClasses.text.primary}`}>
              {describeCartridge(c) || 'Cartridge'}
            </span>
            <span className={`text-sm font-mono tabular-nums ${themeClasses.text.primary}`}>
              {isFilledNumber(c.price) ? money(c.price) : '--'}
            </span>
          </div>
        ))}
      </div>
      {order.hasPrice ? (
        <div className={`mt-1 flex items-center justify-between border-t pt-2 ${edge}`}>
          <span className={`text-sm font-semibold ${themeClasses.text.primary}`}>Total</span>
          <span className={`text-base font-mono font-semibold tabular-nums ${themeClasses.text.primary}`}>
            {money(order.subtotal)}
          </span>
        </div>
      ) : (
        <p className={`mt-2 text-[13px] ${themeClasses.text.muted}`}>
          No price on this record. The 4x6 label is still available.
        </p>
      )}
    </div>
  );
};

// The order slip body, shared by created and view states.
const OrderSlip: React.FC<{ order: RefillOrderView; banner?: React.ReactNode }> = ({
  order,
  banner,
}) => {
  const { themeClasses } = useTheme();
  const { divide } = useEdges();
  return (
    <>
      {banner}
      <div className={`divide-y ${divide}`}>
        <Row label="Order ID" mono>
          {order.id}
        </Row>
        <Row label="Customer">{order.customerName || '--'}</Row>
        <Row label="Phone" mono>
          {order.customerPhone || '--'}
        </Row>
        <Row label="Received">
          {formatReceiptDate(order.dateReceived) || order.dateReceived || '--'}
        </Row>
        {order.dateCompleted && (
          <Row label="Picked up">
            {formatReceiptDate(order.dateCompleted) || order.dateCompleted}
          </Row>
        )}
        <Row label="Status">
          <StatusPill status={order.status} label={order.statusLabel} />
        </Row>
        {order.notes && <Row label="Notes">{order.notes}</Row>}
      </div>
      <CartridgeLines order={order} />
      <p className={`mt-3 text-[13px] ${themeClasses.text.muted}`}>
        Tear off the 4x6 label and stick it on the cartridge.
      </p>
    </>
  );
};

// --- per-state bodies -------------------------------------------------------

const CreatedBody: React.FC<{ order: RefillOrderView }> = ({ order }) => {
  const { themeClasses } = useTheme();
  const banner = (
    <div
      className={`mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${themeClasses.status.success}`}
    >
      <Check className="h-4 w-4" />
      Logged and marked in progress.
    </div>
  );
  return (
    <CardShell
      icon={<Droplets className="h-5 w-5" />}
      title="New refill record"
      subtitle={`For ${order.customerName || 'the customer'}`}
    >
      <OrderSlip order={order} banner={banner} />
    </CardShell>
  );
};

const ViewBody: React.FC<{ order: RefillOrderView }> = ({ order }) => (
  <CardShell
    icon={<Droplets className="h-5 w-5" />}
    title="Refill record"
    subtitle={order.id}
  >
    <OrderSlip order={order} />
  </CardShell>
);

const StatusBody: React.FC<{ d: Extract<RefillArtifactData, { state: 'status' }> }> = ({ d }) => {
  const { themeClasses } = useTheme();
  const { divide } = useEdges();
  return (
    <CardShell
      icon={<Droplets className="h-5 w-5" />}
      title="Status changed"
      subtitle={d.order.id}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatusPill
          status={d.before}
          label={d.beforeLabel}
        />
        <ArrowRight className={`h-4 w-4 ${themeClasses.text.muted}`} />
        <StatusPill status={d.after} label={d.afterLabel} />
      </div>
      <div className={`divide-y ${divide}`}>
        <Row label="Order ID" mono>
          {d.order.id}
        </Row>
        <Row label="Customer">{d.order.customerName || '--'}</Row>
        <Row label="Phone" mono>
          {d.order.customerPhone || '--'}
        </Row>
        {d.order.dateCompleted && (
          <Row label="Picked up">
            {formatReceiptDate(d.order.dateCompleted) || d.order.dateCompleted}
          </Row>
        )}
      </div>
      <CartridgeLines order={d.order} />
    </CardShell>
  );
};

const ListBody: React.FC<{ d: Extract<RefillArtifactData, { state: 'list' }> }> = ({ d }) => {
  const { themeClasses } = useTheme();
  const { divide } = useEdges();
  if (d.orders.length === 0) {
    return (
      <CardShell icon={<Droplets className="h-5 w-5" />} title="Refill records">
        <div className="flex flex-col items-center py-8 text-center">
          <span
            className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${themeClasses.card.secondary}`}
          >
            <Inbox className={`h-6 w-6 ${themeClasses.text.muted}`} />
          </span>
          <p className={`text-sm font-medium ${themeClasses.text.secondary}`}>No refill records yet</p>
          <p className={`mt-1 text-[13px] ${themeClasses.text.muted}`}>
            Log one from AI Mode or the Cartridges page.
          </p>
        </div>
      </CardShell>
    );
  }
  return (
    <CardShell
      icon={<Droplets className="h-5 w-5" />}
      title="Refill records"
      subtitle={`${d.openCount} open of ${d.orders.length}`}
    >
      <div className={`divide-y ${divide}`}>
        {d.orders.map((o) => (
          <div key={o.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <div className={`truncate text-sm ${themeClasses.text.primary}`}>
                {o.customerName || 'Unknown customer'}
              </div>
              <div className={`truncate text-[13px] ${themeClasses.text.secondary}`}>
                <span className="font-mono tabular-nums">{o.id}</span>
                {o.cartridges[0] ? ` - ${describeCartridge(o.cartridges[0])}` : ''}
              </div>
            </div>
            <StatusPill status={o.status} label={o.statusLabel} />
          </div>
        ))}
      </div>
    </CardShell>
  );
};

const NotFoundBody: React.FC<{ orderId: string }> = ({ orderId }) => {
  const { themeClasses } = useTheme();
  return (
    <CardShell icon={<SearchX className="h-5 w-5" />} title="Refill not found">
      <div className="flex flex-col items-center py-8 text-center">
        <span
          className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${themeClasses.card.secondary}`}
        >
          <SearchX className={`h-6 w-6 ${themeClasses.text.muted}`} />
        </span>
        <p className={`text-sm font-medium ${themeClasses.text.secondary}`}>
          No record for{' '}
          <span className={`font-mono tabular-nums ${themeClasses.text.primary}`}>
            {orderId || 'that id'}
          </span>
        </p>
        <p className={`mt-1 text-[13px] ${themeClasses.text.muted}`}>
          Check the order ID and try again, like ORD-AB12CD.
        </p>
      </div>
    </CardShell>
  );
};

// --- Body + Foot ------------------------------------------------------------

const RecordBody: React.FC<{ data: unknown }> = ({ data }) => {
  const d = data as RefillArtifactData;
  switch (d?.state) {
    case 'created':
      return <CreatedBody order={d.order} />;
    case 'view':
      return <ViewBody order={d.order} />;
    case 'status':
      return <StatusBody d={d} />;
    case 'list':
      return <ListBody d={d} />;
    case 'not_found':
      return <NotFoundBody orderId={d.orderId} />;
    default:
      return null;
  }
};

// The order carried by a state, if any. list and not_found have none.
const orderOf = (d: RefillArtifactData): RefillOrderView | null => {
  if (d?.state === 'created' || d?.state === 'view' || d?.state === 'status') return d.order;
  return null;
};

const RecordFoot: React.FC<{ data: unknown }> = ({ data }) => {
  const { themeClasses } = useTheme();
  const order = orderOf(data as RefillArtifactData);
  if (!order) return null;
  const opts = labelOpts(order);
  return (
    <div className={`flex flex-wrap items-center gap-2 border-t px-4 py-3 ${themeClasses.header}`}>
      <button
        type="button"
        onClick={() => downloadReceipt(opts, '4x6')}
        className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${themeClasses.button.secondary}`}
      >
        <Download className="h-4 w-4" />
        4x6 label
      </button>
      <button
        type="button"
        onClick={() => printReceipt(opts, '4x6')}
        className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${themeClasses.button.primary}`}
      >
        <Printer className="h-4 w-4" />
        Print label
      </button>
    </div>
  );
};

export function register(reg: ArtifactRegistry) {
  reg.refill = { Body: RecordBody, Foot: RecordFoot };
}
