import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SectionList,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '../hooks/useTheme';
import { ThemeColors } from '../theme/colors';
import { spacing, radii } from '../theme/spacing';
import { useReminderStore, Reminder } from '../stores/reminderStore';
import { useTransactionStore } from '../stores/transactionStore';
import { formatDateRelative, formatKes } from '../utils/formatters';
import { TabIcon } from '../components/TabIcon';
import { differenceInDays } from 'date-fns';

function getTypeColors(colors: ThemeColors): Record<string, string> {
  return {
    CATEGORY: colors.purple,
    DEBT: colors.debtRed,
    GOAL: colors.green,
    REVIEW: colors.coral,
    STANDALONE: colors.amber,
    TRANSACTION: colors.amber,
  };
}

function ReminderItem({
  reminder,
}: {
  reminder: Reminder;
}) {
  const router = useRouter();
  const colors = useColors();
  const s = mkStyles(colors);
  const deleteReminder = useReminderStore((st) => st.deleteReminder);
  const transactions = useTransactionStore((st) => st.transactions);
  const updateTransaction = useTransactionStore((st) => st.updateTransaction);
  const TYPE_COLORS = getTypeColors(colors);
  const dotColor = TYPE_COLORS[reminder.linkedType] ?? colors.t3;
  const daysUntil = differenceInDays(new Date(reminder.nextFireDate), new Date());

  let timeText = '';
  if (reminder.status === 'SNOOZED') {
    timeText = 'SNOOZED';
  } else if (reminder.recurrencePattern === 'WEEKLY') {
    timeText = 'Weekly';
  } else if (reminder.recurrencePattern === 'MONTHLY_DATE') {
    const day = new Date(reminder.nextFireDate).getDate();
    const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th';
    timeText = `${day}${suffix} monthly`;
  } else if (reminder.recurrencePattern === 'ANNUAL') {
    timeText = 'Annual';
  } else if (daysUntil === 0) {
    timeText = 'Today';
  } else if (daysUntil === 1) {
    timeText = 'Tomorrow';
  } else if (daysUntil > 0) {
    timeText = `In ${daysUntil} days`;
  } else {
    timeText = formatDateRelative(reminder.nextFireDate);
  }

  const isUrgent = daysUntil <= 2 && daysUntil >= 0 && reminder.status !== 'SNOOZED';

  const typeLabel = reminder.type === 'RECURRING'
    ? `Recurring \u00B7 ${(reminder.recurrencePattern ?? '').replace(/_/g, ' ').toLowerCase()}`
    : 'One-time';

  function handleDelete() {
    Alert.alert('Delete Reminder', 'Remove this reminder permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteReminder(reminder.id);
          // Clear reminderId on any linked transaction
          const linked = transactions.find((t) => t.reminderId === reminder.id);
          if (linked) updateTransaction(linked.id, { reminderId: undefined });
        },
      },
    ]);
  }

  function handlePress() {
    if (reminder.categoryId) {
      router.push({ pathname: '/category-detail', params: { categoryId: reminder.categoryId } });
    }
  }

  return (
    <Pressable style={s.txRow} onPress={handlePress} onLongPress={handleDelete}>
      <View style={[s.txDot, { backgroundColor: dotColor }]} />
      <View style={s.txCenter}>
        <Text style={s.txDescription} numberOfLines={1}>
          {reminder.name}
        </Text>
        <Text style={s.txCategory} numberOfLines={1}>
          {reminder.linkedType !== 'STANDALONE' ? `${reminder.linkedType.toLowerCase()} \u00B7 ` : ''}
          {typeLabel}
        </Text>
      </View>
      <View style={s.txRight}>
        {reminder.amount != null && reminder.amount > 0 ? (
          <Text style={s.txAmount}>{formatKes(reminder.amount)}</Text>
        ) : null}
        {isUrgent ? (
          <View style={[s.txBadge, { backgroundColor: colors.coralDim }]}>
            <Text style={[s.txBadgeText, { color: colors.coral }]}>{timeText}</Text>
          </View>
        ) : reminder.status === 'SNOOZED' ? (
          <View style={[s.txBadge, { backgroundColor: colors.subtleMed }]}>
            <Text style={[s.txBadgeText, { color: colors.t2 }]}>SNOOZED</Text>
          </View>
        ) : (
          <Text style={s.txTime}>{timeText}</Text>
        )}
      </View>
      <TabIcon name="chevron-right" color={colors.t3} size={16} />
    </Pressable>
  );
}

export function Reminders() {
  const colors = useColors();
  const s = mkStyles(colors);
  const router = useRouter();
  const allReminders = useReminderStore((st) => st.reminders);

  const sections = useMemo(() => {
    const now = new Date();
    const weekCutoff = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const monthCutoff = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const dueThisWeek = allReminders.filter(
      (r) =>
        r.status === 'ACTIVE' &&
        new Date(r.nextFireDate) <= weekCutoff &&
        new Date(r.nextFireDate) >= now
    );

    const dueThisMonth = allReminders.filter(
      (r) =>
        r.status === 'ACTIVE' &&
        new Date(r.nextFireDate) > weekCutoff &&
        new Date(r.nextFireDate) <= monthCutoff
    );

    const recurring = allReminders.filter(
      (r) => r.status === 'ACTIVE' && r.type === 'RECURRING' && new Date(r.nextFireDate) > weekCutoff
    );

    const snoozed = allReminders.filter((r) => r.status === 'SNOOZED');

    const paused = allReminders.filter((r) => r.status === 'PAUSED');

    const result: { title: string; count?: number; data: Reminder[] }[] = [];
    if (dueThisWeek.length > 0)
      result.push({ title: 'DUE THIS WEEK', count: dueThisWeek.length, data: dueThisWeek });
    if (dueThisMonth.length > 0)
      result.push({ title: 'DUE THIS MONTH', data: dueThisMonth });
    if (recurring.length > 0)
      result.push({ title: 'RECURRING', data: recurring });
    if (snoozed.length > 0)
      result.push({ title: 'SNOOZED', data: snoozed });
    if (paused.length > 0)
      result.push({ title: 'PAUSED', data: paused });

    // If empty, show all active
    if (result.length === 0 && allReminders.length > 0) {
      result.push({ title: 'ALL REMINDERS', data: allReminders });
    }

    return result;
  }, [allReminders]);

  return (
    <View style={s.screen}>
      {sections.length === 0 ? (
        <View style={s.emptyWrap}>
          <Text style={s.emptyText}>No reminders yet</Text>
          <Text style={s.emptySubtext}>
            Reminders will appear here when you set them up
          </Text>
        </View>
      ) : (
        <SectionList
          contentInsetAdjustmentBehavior="automatic"
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{section.title}</Text>
              {section.count != null && (
                <View style={s.countBadge}>
                  <Text style={s.countText}>{section.count}</Text>
                </View>
              )}
            </View>
          )}
          renderItem={({ item }) => (
            <ReminderItem reminder={item} />
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const mkStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },

  /* Section headers */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: c.t3,
    letterSpacing: 0.8,
  },
  countBadge: {
    backgroundColor: c.coralDim,
    borderRadius: radii.pill,
    borderCurve: 'continuous',
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 8,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.coral,
  },

  /* Transaction-style row */
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    backgroundColor: c.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  txDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  txCenter: { flex: 1 },
  txDescription: {
    fontSize: 15,
    fontWeight: '600',
    color: c.t1,
  },
  txCategory: {
    fontSize: 12,
    color: c.t3,
    marginTop: 2,
  },
  txRight: { alignItems: 'flex-end' },
  txAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: c.t1,
    fontVariant: ['tabular-nums'],
  },
  txBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderCurve: 'continuous',
    marginTop: 4,
  },
  txBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  txTime: {
    fontSize: 12,
    fontWeight: '500',
    color: c.t2,
    marginTop: 2,
  },

  /* Empty */
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: c.t1,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: c.t2,
    textAlign: 'center',
  },
});
