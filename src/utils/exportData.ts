import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import XLSX from 'xlsx';
import { useTransactionStore } from '../stores/transactionStore';
import { useBudgetStore } from '../stores/budgetStore';
import { useDebtStore } from '../stores/debtStore';
import { useGoalStore } from '../stores/goalStore';

export type ExportFormat = 'csv' | 'xlsx' | 'json';

export async function exportData(format: ExportFormat): Promise<void> {
  const { transactions } = useTransactionStore.getState();
  const { months, categories } = useBudgetStore.getState();
  const { debts, payments } = useDebtStore.getState();
  const { goals, contributions } = useGoalStore.getState();

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `pesa-export-${timestamp}`;

  if (format === 'json') {
    const content = JSON.stringify(
      { transactions, months, categories, debts, debtPayments: payments, goals, goalContributions: contributions },
      null,
      2
    );
    const uri = `${FileSystem.cacheDirectory}${filename}.json`;
    await FileSystem.writeAsStringAsync(uri, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Export Pesa Data' });
    return;
  }

  if (format === 'csv') {
    const sections: { name: string; data: object[] }[] = [
      { name: 'TRANSACTIONS', data: transactions },
      { name: 'MONTHS', data: months },
      { name: 'CATEGORIES', data: categories },
      { name: 'DEBTS', data: debts },
      { name: 'DEBT_PAYMENTS', data: payments },
      { name: 'GOALS', data: goals },
      { name: 'GOAL_CONTRIBUTIONS', data: contributions },
    ];

    const csv = sections
      .filter((s) => s.data.length > 0)
      .map((s) => `# ${s.name}\n${XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(s.data))}`)
      .join('\n');

    const uri = `${FileSystem.cacheDirectory}${filename}.csv`;
    await FileSystem.writeAsStringAsync(uri, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Export Pesa Data' });
    return;
  }

  // XLSX — one sheet per data type
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(transactions.length ? transactions : [{}]), 'Transactions');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(categories.length ? categories : [{}]), 'Categories');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(months.length ? months : [{}]), 'Months');
  if (debts.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(debts), 'Debts');
  if (payments.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payments), 'Debt Payments');
  if (goals.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(goals), 'Goals');
  if (contributions.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(contributions), 'Goal Contributions');

  const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const uri = `${FileSystem.cacheDirectory}${filename}.xlsx`;
  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: 'Export Pesa Data',
  });
}
