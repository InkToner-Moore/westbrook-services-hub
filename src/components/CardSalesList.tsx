import { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { getCollection } from '@/lib/firestore';
import type { StoredTransactionRecord } from '@/ai/actions/purchaseRecorder';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { FormSection, useFormClasses } from '@/components/shell/FormKit';
import { downloadCsv } from '@/utils/dataExport';

const money = (value?: number) => value == null ? 'Not saved' : `$${value.toFixed(2)}`;
const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
const itemsLabel = (tx: StoredTransactionRecord) => tx.items?.map((item) => item.description).join('; ') || 'Items not saved';

export default function CardSalesList() {
  const { themeClasses } = useTheme();
  const kit = useFormClasses();
  const [transactions, setTransactions] = useState<StoredTransactionRecord[]>([]);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    getCollection<StoredTransactionRecord>('transactions').then((rows) => {
      if (active) setTransactions(rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    }).catch(() => {
      if (active) setError(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [reload]);

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - days + 1);
  const shown = transactions.filter((tx) => new Date(tx.createdAt) >= start);
  const groups = new Map<string, StoredTransactionRecord[]>();
  for (const tx of shown) {
    const key = dateKey(new Date(tx.createdAt));
    groups.set(key, [...(groups.get(key) ?? []), tx]);
  }

  const exportShown = () => downloadCsv('card-sales.csv', [
    ['date', 'time', 'id', 'customer', 'items', 'subtotal', 'gst', 'total', 'status'],
    ...shown.map((tx) => [
      dateKey(new Date(tx.createdAt)), timeLabel(tx.createdAt), tx.id, tx.customerName,
      itemsLabel(tx), tx.subtotal?.toFixed(2) ?? '', tx.tax?.toFixed(2) ?? '',
      tx.amount.toFixed(2), tx.status,
    ]),
  ]);

  if (loading) return (
    <div className="rounded-xl border border-pub-edge bg-pub-paper p-12 text-center" role="status">
      <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-pub-muted" />
      <p className="text-pub-muted">Loading card sales...</p>
    </div>
  );
  if (error) return (
    <FormSection>
      <p role="alert" className="text-pub-muted">Could not load card sales. Try again.</p>
      <Button className={kit.secondary} onClick={() => setReload((value) => value + 1)}>Try again</Button>
    </FormSection>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-pub-muted">Last {days} days</p>
        <Button className={kit.secondary} disabled={shown.length === 0} onClick={exportShown}>
          <Download className="mr-2 h-4 w-4" />Download CSV
        </Button>
      </div>
      {shown.length === 0 && <p className="py-8 text-center text-pub-muted">No card sales recorded yet.</p>}
      {[...groups].map(([day, rows]) => (
        <FormSection key={day} title={new Date(rows[0].createdAt).toLocaleDateString(undefined, {
          weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
        })}>
          <p className="mb-3 font-semibold text-pub-ink">
            Day total, not counting declined: {money(rows.filter((tx) => tx.status !== 'declined').reduce((sum, tx) => sum + tx.amount, 0))}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-pub-ink">
              <thead className="text-pub-muted">
                <tr>{['Time', 'Items', 'Pre-tax', 'GST', 'Total', 'Status'].map((label) => (
                  <th key={label} scope="col" className="px-2 py-3 font-medium">{label}</th>
                ))}</tr>
              </thead>
              <tbody>
                {rows.map((tx) => (
                  <tr key={tx.id} className="border-t border-pub-edge">
                    <td className="whitespace-nowrap px-2 py-3">{timeLabel(tx.createdAt)}</td>
                    <td className="min-w-40 px-2 py-3">{itemsLabel(tx)}</td>
                    {[tx.subtotal, tx.tax, tx.amount].map((value, index) => (
                      <td key={index} className="whitespace-nowrap px-2 py-3 font-mono tabular-nums">{money(value)}</td>
                    ))}
                    <td className="px-2 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${
                        tx.status === 'approved' ? themeClasses.status.success
                          : tx.status === 'declined' ? themeClasses.status.error
                            : `${themeClasses.accent.soft} ${themeClasses.accent.border} text-pub-accent`
                      }`}>{tx.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FormSection>
      ))}
      <Button className={kit.secondary} onClick={() => setDays((value) => value + 7)}>Show older</Button>
    </div>
  );
}
