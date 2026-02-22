import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SectionList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '../hooks/useTheme';
import { ThemeColors } from '../theme/colors';
import { spacing, radii } from '../theme/spacing';
import { useReminderStore, Reminder } from '../stores/reminderStore';
import { formatDateRelative } from '../utils/formatters';
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

function ReminderItem({ reminder }: { reminder: Reminder }) {
  const colors = useColors();
  const s = mkStyles(colors);
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

  return (
    <View style={s.reminderRow}>
      <View style={[s.reminderDot, { backgroundColor: dotColor }]} />
      <View style={s.reminderInfo}>
        <Text style={s.reminderName} numberOfLines={1}>
          {reminder.name}
        </Text>
        <Text style={s.reminderSub} numberOfLines={1}>
          {reminder.linkedType !== 'STANDALONE' ? `${reminder.linkedType.toLowerCase()} \u00B7 ` : ''}
          {reminder.amount ? `KES ${reminder.amount.toLocaleString('en-US')} \u00B7 ` : ''}
          {reminder.type === 'RECURRING' ? (reminder.recurrencePattern?.replace(/_/g, ' ').toLowerCase() ?? 'recurring') : 'One-time'}
        </Text>
      </View>
      <View style={s.reminderTimeWrap}>
        {isUrgent ? (
          <View style={s.urgentBadge}>
            <Text style={s.urgentText}>{timeText}</Text>
          </View>
        ) : reminder.status === 'SNOOZED' ? (
          <View style={s.snoozedBadge}>
            <Text style={s.snoozedText}>SNOOZED</Text>
          </View>
        ) : (
          <Text style={s.reminderTime}>{timeText}</Text>
        )}
      </View>
    </View>
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
      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <TabIcon name="arrow-left" color={colors.t2} size={18} />
        </Pressable>
        <Text style={s.title}>Reminders</Text>
        <Pressable style={s.addBtn}>
          <TabIcon name="plus" color="#FFFFFF" size={20} />
        </Pressable>
      </View>

      {sections.length === 0 ? (
        <View style={s.emptyWrap}>
          <Text style={s.emptyText}>No reminders yet</Text>
          <Text style={s.emptySubtext}>
            Reminders will appear here when you set them up
          </Text>
        </View>
      ) : (
        <SectionList
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
          renderItem={({ item }) => <ReminderItem reminder={item} />}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const mkStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 22,
    paddingBottom: 16,
  },
  backBtn: {
    width: 30,
    height: 30,
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radii.xs,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backText: { fontSize: 16, color: c.t2 },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: c.t1,
    letterSpacing: -0.6,
  },
  addBtn: {
    width: 36,
    height: 36,
    backgroundColor: c.coral,
    borderRadius: radii.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { fontSize: 22, fontWeight: '300', color: '#FFFFFF' },

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
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 8,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.coral,
  },

  /* Reminder item */
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 22,
    backgroundColor: c.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  reminderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 14,
  },
  reminderInfo: { flex: 1 },
  reminderName: {
    fontSize: 15,
    fontWeight: '600',
    color: c.t1,
    marginBottom: 3,
  },
  reminderSub: {
    fontSize: 12,
    fontWeight: '400',
    color: c.t3,
  },
  reminderTimeWrap: {
    marginLeft: 12,
    alignItems: 'flex-end',
  },
  reminderTime: {
    fontSize: 12,
    fontWeight: '500',
    color: c.t2,
  },
  urgentBadge: {
    backgroundColor: c.coralDim,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },
  urgentText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.coral,
  },
  snoozedBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },
  snoozedText: {
    fontSize: 10,
    fontWeight: '700',
    color: c.t2,
    letterSpacing: 0.4,
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
