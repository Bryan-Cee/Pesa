import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  Switch,
} from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors, useIsDark } from '../hooks/useTheme';
import { ThemeColors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { radii } from '../theme/spacing';
import { useBudgetStore } from '../stores/budgetStore';
import { useTransactionStore, TransactionType } from '../stores/transactionStore';
import { useReminderStore } from '../stores/reminderStore';
import { parseSms } from '../utils/smsParser';
import { formatKes, getMonthLabel } from '../utils/formatters';
import { CATEGORY_GROUP_META, CATEGORY_GROUP_ORDER } from '../utils/constants';
import { TabIcon } from '../components/TabIcon';

type Tab = 'sms' | 'manual' | 'future';

export function TransactionLogger() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    categoryId?: string;
    description?: string;
    tab?: Tab;
    monthId?: string;
    transactionId?: string;
  }>();
  const colors = useColors();
  const isDark = useIsDark();
  const s = mkStyles(colors);

  // Store selectors — must come before useState so edit-mode derivations are available
  const months = useBudgetStore((s) => s.months);
  const addMonth = useBudgetStore((s) => s.addMonth);
  const allCategories = useBudgetStore((s) => s.categories);
  const transactions = useTransactionStore((s) => s.transactions);
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const updateTransaction = useTransactionStore((s) => s.updateTransaction);
  const reminders = useReminderStore((s) => s.reminders);
  const addReminder = useReminderStore((s) => s.addReminder);
  const updateReminder = useReminderStore((s) => s.updateReminder);
  const deleteReminder = useReminderStore((s) => s.deleteReminder);

  // Edit mode: look up existing transaction and its linked reminder
  const existingTx = params.transactionId
    ? transactions.find((t) => t.id === params.transactionId) ?? null
    : null;
  const isEditing = !!existingTx;
  const existingReminder = existingTx
    ? reminders.find((r) => r.linkedType === 'TRANSACTION' && r.linkedId === existingTx.id)
      ?? (existingTx.reminderId ? reminders.find((r) => r.id === existingTx.reminderId) : null)
      ?? null
    : null;

  const [tab, setTab] = useState<Tab>(
    existingTx
      ? (existingTx.type === 'ACTUAL' ? 'manual' : 'future')
      : params.tab ?? (params.categoryId ? 'manual' : 'sms')
  );
  const [toast, setToast] = useState('');

  // SMS tab state
  const [smsText, setSmsText] = useState('');
  const [parsed, setParsed] = useState(false);
  const [amount, setAmount] = useState(existingTx ? String(existingTx.amount) : '');
  const [description, setDescription] = useState(existingTx?.description ?? params.description ?? '');
  const [note, setNote] = useState(existingTx?.note ?? '');
  const [selectedCategoryId, setSelectedCategoryId] = useState(existingTx?.categoryId ?? params.categoryId ?? '');
  const [rawSms, setRawSms] = useState('');
  const [parsedReference, setParsedReference] = useState('');
  const [parsedDate, setParsedDate] = useState('');
  const [parsedMerchant, setParsedMerchant] = useState('');

  // Future tab state
  const [futureStatus, setFutureStatus] = useState<'paid' | 'unpaid'>(
    existingTx?.type === 'FUTURE_PAID' ? 'paid' : 'unpaid'
  );
  const [paymentDate, setPaymentDate] = useState<Date | null>(null);
  const [showPaymentPicker, setShowPaymentPicker] = useState(false);
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [showEventPicker, setShowEventPicker] = useState(false);

  // Reminder toggle
  const [reminderOn, setReminderOn] = useState(!!existingReminder);

  // Focus tracking
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Category chips: show first 5 groups, then "+ More"
  const [showAllGroups, setShowAllGroups] = useState(false);

  // Transaction date — defaults to today, drives which budget month is used
  const [txDate, setTxDate] = useState<Date>(existingTx ? new Date(existingTx.date) : new Date());
  const [showTxDatePicker, setShowTxDatePicker] = useState(false);

  /** Find or auto-create the budget month for a given date */
  function resolveMonthForDate(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const existing = months.find((m) => m.year === year && m.month === month);
    if (existing) return existing.id;
    return addMonth({
      year,
      month,
      label: getMonthLabel(year, month),
      incomeAssumption: 0,
      isSetupComplete: false,
    });
  }

  const currentMonth = useMemo(() => {
    // Use the month passed from the Budget/CategoryDetail screen if available
    if (params.monthId) {
      const passed = months.find((m) => m.id === params.monthId);
      if (passed) return passed;
    }
    // Resolve month from the selected transaction date
    const year = txDate.getFullYear();
    const month = txDate.getMonth() + 1;
    const dateMatch = months.find((m) => m.year === year && m.month === month);
    if (dateMatch) return dateMatch;
    // Fallback to latest month
    const sorted = [...months].sort(
      (a, b) => b.year * 12 + b.month - (a.year * 12 + a.month)
    );
    return sorted[0] ?? null;
  }, [months, params.monthId, txDate]);

  const categories = useMemo(
    () => currentMonth ? allCategories.filter((c) => c.monthId === currentMonth.id) : [],
    [allCategories, currentMonth]
  );

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Unique groups that have categories this month
  const availableGroups = useMemo(() => {
    const groupSet = new Set(categories.map((c) => c.group));
    return CATEGORY_GROUP_ORDER.filter((g) => groupSet.has(g));
  }, [categories]);

  // Auto-select group if category was prefilled or editing
  const initialGroup = useMemo(() => {
    const catId = existingTx?.categoryId ?? params.categoryId;
    if (catId) {
      const cat = allCategories.find((c) => c.id === catId);
      return cat?.group ?? null;
    }
    return null;
  }, []);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(initialGroup);

  function handleParse() {
    const result = parseSms(smsText);
    setAmount(result.amount ? String(result.amount) : '');
    setDescription(result.description ?? '');
    setParsedReference(result.reference ?? '');
    setParsedDate(result.date ?? '');
    setParsedMerchant(result.description ?? '');
    setRawSms(smsText);
    setParsed(true);
  }

  function handleLog() {
    if (!currentMonth) {
      Alert.alert('No Budget', 'Please set up a budget first.');
      return;
    }
    const amountNum = parseInt(amount, 10);
    if (!amountNum || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    if (!selectedCategoryId) {
      Alert.alert('Select Category', 'Please select a category.');
      return;
    }

    let type: TransactionType = 'ACTUAL';
    if (tab === 'future') {
      type = futureStatus === 'paid' ? 'FUTURE_PAID' : 'FUTURE_PENDING';
    }

    // Resolve monthId from the selected date (auto-creates month if needed)
    const resolvedMonthId = resolveMonthForDate(txDate);
    const txDateIso = txDate.toISOString();

    const catName =
      categories.find((c) => c.id === selectedCategoryId)?.name ?? 'Budget';

    if (isEditing && existingTx) {
      // ---- EDIT PATH ----
      updateTransaction(existingTx.id, {
        monthId: resolvedMonthId,
        categoryId: selectedCategoryId,
        amount: amountNum,
        description: description || 'Transaction',
        date: txDateIso,
        type,
        note: note || undefined,
        isPaid: type === 'FUTURE_PAID' ? true : undefined,
      });

      // Reminder handling
      const fireDate = new Date(txDate);
      fireDate.setDate(fireDate.getDate() - 1);
      if (fireDate <= new Date()) {
        fireDate.setDate(new Date().getDate() + 1);
      }

      if (!existingReminder && reminderOn) {
        // Was OFF → now ON: create new reminder
        const remId = addReminder({
          name: description || catName,
          type: tab === 'future' ? 'RECURRING' : 'ONE_TIME',
          linkedType: 'TRANSACTION',
          linkedId: existingTx.id,
          amount: amountNum,
          categoryId: selectedCategoryId,
          recurrencePattern: tab === 'future' ? 'MONTHLY_DATE' : undefined,
          leadTimeDays: 1,
          nextFireDate: fireDate.toISOString(),
          dueDate: txDateIso,
          message: `Reminder: ${description || catName} - KES ${amountNum.toLocaleString('en-US')}`,
          status: 'ACTIVE',
        });
        updateTransaction(existingTx.id, { reminderId: remId });
      } else if (existingReminder && !reminderOn) {
        // Was ON → now OFF: delete reminder
        deleteReminder(existingReminder.id);
        updateTransaction(existingTx.id, { reminderId: undefined });
      } else if (existingReminder && reminderOn) {
        // Was ON → stays ON: update reminder
        updateReminder(existingReminder.id, {
          amount: amountNum,
          name: description || catName,
          nextFireDate: fireDate.toISOString(),
          dueDate: txDateIso,
          message: `Reminder: ${description || catName} - KES ${amountNum.toLocaleString('en-US')}`,
          categoryId: selectedCategoryId,
        });
      }

      if (process.env.EXPO_OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setToast(`Updated ${catName}`);
      setTimeout(() => {
        setToast('');
        router.back();
      }, 800);
    } else {
      // ---- CREATE PATH ----
      const txId = addTransaction({
        monthId: resolvedMonthId,
        categoryId: selectedCategoryId,
        amount: amountNum,
        description: description || 'Transaction',
        date: txDateIso,
        type,
        note: note || undefined,
        rawSms: rawSms || undefined,
        isPaid: type === 'FUTURE_PAID' ? true : undefined,
      });

      // Create reminder if toggle is on, and cross-link with the transaction
      if (reminderOn) {
        // Set reminder 1 day before the selected date
        const fireDate = new Date(txDate);
        fireDate.setDate(fireDate.getDate() - 1);
        // If fire date is in the past, set to tomorrow
        if (fireDate <= new Date()) {
          fireDate.setDate(new Date().getDate() + 1);
        }

        const remId = addReminder({
          name: description || catName,
          type: tab === 'future' ? 'RECURRING' : 'ONE_TIME',
          linkedType: 'TRANSACTION',
          linkedId: txId,
          amount: amountNum,
          categoryId: selectedCategoryId,
          recurrencePattern: tab === 'future' ? 'MONTHLY_DATE' : undefined,
          leadTimeDays: 1,
          nextFireDate: fireDate.toISOString(),
          dueDate: txDateIso,
          message: `Reminder: ${description || catName} - KES ${amountNum.toLocaleString('en-US')}`,
          status: 'ACTIVE',
        });
        updateTransaction(txId, { reminderId: remId });
      }

      if (process.env.EXPO_OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setToast(`Logged to ${catName}`);
      setTimeout(() => {
        setToast('');
        router.dismiss();
        router.push({
          pathname: '/category-detail',
          params: { categoryId: selectedCategoryId, monthId: resolvedMonthId },
        });
      }, 800);
    }
  }

  function renderCategoryPicker() {
    if (!showCategoryPicker) return null;
    const filtered = selectedGroup
      ? categories.filter((c) => c.group === selectedGroup)
      : categories;
    return (
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={s.pickerOverlay}>
        <ScrollView style={s.pickerList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
          {filtered.map((cat) => (
            <Pressable
              key={cat.id}
              style={s.pickerItem}
              onPress={() => {
                setSelectedCategoryId(cat.id);
                setShowCategoryPicker(false);
              }}
            >
              <View
                style={[
                  s.pickerDot,
                  {
                    backgroundColor:
                      CATEGORY_GROUP_META[cat.group]?.color ?? colors.t3,
                  },
                ]}
              />
              <Text style={s.pickerItemText}>{cat.name}</Text>
              <Text style={s.pickerGroupText}>
                {CATEGORY_GROUP_META[cat.group]?.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>
    );
  }

  const selectedCat = categories.find((c) => c.id === selectedCategoryId);
  const amountNum = parseInt(amount, 10) || 0;

  const selectedCatGroup = selectedCat
    ? CATEGORY_GROUP_META[selectedCat.group]
    : null;

  // Button label logic
  function getButtonLabel(): string {
    if (isEditing) return 'Save Changes';
    const prefix = tab === 'future' ? 'Commit' : 'Log';
    const amtStr = amountNum > 0 ? ` ${formatKes(amountNum)}` : ' Transaction';
    const groupLabel = selectedCatGroup?.label;
    const arrow = groupLabel ? ` \u2192 ${groupLabel}` : '';
    return `\u2713 ${prefix}${amtStr}${arrow}`;
  }

  // Category group chips
  const visibleGroups = showAllGroups
    ? availableGroups
    : availableGroups.slice(0, 5);

  const allTabs: { key: Tab; emoji: string; label: string }[] = [
    { key: 'sms', emoji: '\uD83D\uDCAC', label: 'SMS Paste' },
    { key: 'manual', emoji: '\u270F\uFE0F', label: 'Manual' },
    { key: 'future', emoji: '\uD83D\uDCC5', label: 'Future' },
  ];
  const tabs = isEditing ? allTabs.filter((t) => t.key !== 'sms') : allTabs;

  return (
    <View style={s.overlay}>
      {/* Blur backdrop — tap to dismiss */}
      <Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()}>
        <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      </Pressable>

      {/* Sheet */}
      <View style={s.sheet}>
        {/* Drag handle */}
        <View style={s.handleRow}>
          <View style={s.handle} />
        </View>

        {/* Header */}
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>{isEditing ? 'Edit Transaction' : 'Log Transaction'}</Text>
          <Pressable style={s.closeBtn} onPress={() => router.back()}>
            <TabIcon name="x" color={colors.t2} size={20} />
          </Pressable>
        </View>

        {/* Tabs */}
      <View style={s.tabRow}>
        {tabs.map((t) => (
          <Pressable
            key={t.key}
            style={[s.tab, tab === t.key && s.tabActive]}
            onPress={() => {
              setTab(t.key);
              setParsed(false);
            }}
          >
            <Text
              style={[s.tabText, tab === t.key && s.tabTextActive]}
            >
              {t.emoji} {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ============ SMS Tab: unparsed ============ */}
        {tab === 'sms' && !parsed && (
          <View>
            {/* Paste area */}
            <View
              style={[
                s.pasteArea,
                focusedField === 'sms' && s.pasteAreaFocused,
              ]}
            >
              <TextInput
                style={s.smsInput}
                placeholder="Paste your M-Pesa or SC Bank message here..."
                value={smsText}
                onChangeText={setSmsText}
                multiline
                numberOfLines={5}
                placeholderTextColor={colors.t3}
                onFocus={() => setFocusedField('sms')}
                onBlur={() => setFocusedField(null)}
              />
              <Pressable
                style={[
                  s.parseButton,
                  !smsText && s.buttonDisabled,
                ]}
                onPress={handleParse}
                disabled={!smsText}
              >
                <Text style={s.parseButtonText}>Parse {'\u2192'}</Text>
              </Pressable>
            </View>

            {/* Transaction date */}
            <Text style={s.fieldLabel}>DATE</Text>
            <Pressable
              style={s.datePickerBtn}
              onPress={() => setShowTxDatePicker(true)}
            >
              <Text style={s.datePickerValue}>
                {txDate.toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </Pressable>
            {showTxDatePicker && (
              <DateTimePicker
                value={txDate}
                mode="date"
                display="inline"
                themeVariant={isDark ? 'dark' : 'light'}
                accentColor={colors.coral}
                onChange={(_, date) => {
                  setShowTxDatePicker(false);
                  if (date) setTxDate(date);
                }}
              />
            )}

            {/* Category group chips */}
            <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>CATEGORY</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.chipScrollRow}
            >
              <View style={s.chipRow}>
                {visibleGroups.map((group) => {
                  const meta = CATEGORY_GROUP_META[group];
                  const isActive = selectedGroup === group;
                  return (
                    <Pressable
                      key={group}
                      style={[
                        s.chip,
                        isActive && s.chipActive,
                      ]}
                      onPress={() => {
                        setSelectedGroup(group);
                        // Auto-select first category in group
                        const first = categories.find(
                          (c) => c.group === group
                        );
                        if (first) setSelectedCategoryId(first.id);
                      }}
                    >
                      <View
                        style={[
                          s.chipDot,
                          { backgroundColor: meta.color },
                        ]}
                      />
                      <Text
                        style={[
                          s.chipText,
                          isActive && s.chipTextActive,
                        ]}
                      >
                        {meta.label}
                      </Text>
                    </Pressable>
                  );
                })}
                {!showAllGroups && availableGroups.length > 5 && (
                  <Pressable
                    style={s.chip}
                    onPress={() => setShowAllGroups(true)}
                  >
                    <Text style={s.chipText}>+ More</Text>
                  </Pressable>
                )}
              </View>
            </ScrollView>

            {/* Note */}
            <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>
              NOTE (OPTIONAL)
            </Text>
            <TextInput
              style={[
                s.textInput,
                focusedField === 'note-sms' && s.fieldFocused,
              ]}
              value={note}
              onChangeText={setNote}
              placeholder="Add a memo..."
              placeholderTextColor={colors.t3}
              onFocus={() => setFocusedField('note-sms')}
              onBlur={() => setFocusedField(null)}
            />

            {/* Reminder toggle */}
            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>Set a reminder for this</Text>
              <Switch
                value={reminderOn}
                onValueChange={setReminderOn}
                trackColor={{
                  false: 'rgba(255,255,255,0.08)',
                  true: colors.coral,
                }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Submit button */}
            <Pressable style={s.logButton} onPress={handleLog}>
              <Text style={s.logButtonText}>
                {isEditing ? 'Save Changes' : '\u2713 Log Transaction'}
              </Text>
            </Pressable>
          </View>
        )}

        {/* ============ SMS Tab: parsed ============ */}
        {tab === 'sms' && parsed && (
          <View>
            {/* Parsed success tag */}
            <Animated.View entering={FadeIn.duration(300)} style={s.parsedTag}>
              <Text style={s.parsedTagText}>
                {'\u2713'} PARSED SUCCESSFULLY
              </Text>
            </Animated.View>

            {/* Parsed card */}
            <Animated.View entering={FadeIn.duration(300)} style={s.parsedCard}>
              {/* Amount + Reference row */}
              <View style={s.parsedAmountRow}>
                <View style={s.parsedAmountLeft}>
                  <Text style={s.parsedKes}>KES</Text>
                  <Text selectable style={s.parsedAmount}>
                    {amountNum > 0 ? amountNum.toLocaleString('en-US') : '0'}
                  </Text>
                </View>
                {parsedReference ? (
                  <Text style={s.parsedRef}>{parsedReference}</Text>
                ) : null}
              </View>

              {/* Merchant + Date grid */}
              <View style={s.parsedGrid}>
                <View style={s.parsedGridItem}>
                  <Text style={s.parsedGridLabel}>MERCHANT</Text>
                  <Text style={s.parsedGridValue} numberOfLines={1}>
                    {parsedMerchant || description || '-'}
                  </Text>
                </View>
                <View style={s.parsedGridItem}>
                  <Text style={s.parsedGridLabel}>DATE</Text>
                  <Text style={s.parsedGridValue}>
                    {parsedDate || new Date().toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              </View>
            </Animated.View>

            {/* Transaction date */}
            <Text style={s.fieldLabel}>DATE</Text>
            <Pressable
              style={s.datePickerBtn}
              onPress={() => setShowTxDatePicker(true)}
            >
              <Text style={s.datePickerValue}>
                {txDate.toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </Pressable>
            {showTxDatePicker && (
              <DateTimePicker
                value={txDate}
                mode="date"
                display="inline"
                themeVariant={isDark ? 'dark' : 'light'}
                accentColor={colors.coral}
                onChange={(_, date) => {
                  setShowTxDatePicker(false);
                  if (date) setTxDate(date);
                }}
              />
            )}

            {/* Category group chips */}
            <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>CATEGORY</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.chipScrollRow}
            >
              <View style={s.chipRow}>
                {visibleGroups.map((group) => {
                  const meta = CATEGORY_GROUP_META[group];
                  const isActive = selectedGroup === group;
                  return (
                    <Pressable
                      key={group}
                      style={[
                        s.chip,
                        isActive && s.chipActive,
                      ]}
                      onPress={() => {
                        setSelectedGroup(group);
                        const first = categories.find(
                          (c) => c.group === group
                        );
                        if (first) setSelectedCategoryId(first.id);
                      }}
                    >
                      <View
                        style={[
                          s.chipDot,
                          { backgroundColor: meta.color },
                        ]}
                      />
                      <Text
                        style={[
                          s.chipText,
                          isActive && s.chipTextActive,
                        ]}
                      >
                        {meta.label}
                      </Text>
                    </Pressable>
                  );
                })}
                {!showAllGroups && availableGroups.length > 5 && (
                  <Pressable
                    style={s.chip}
                    onPress={() => setShowAllGroups(true)}
                  >
                    <Text style={s.chipText}>+ More</Text>
                  </Pressable>
                )}
              </View>
            </ScrollView>

            {/* Line item dropdown */}
            <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>
              LINE ITEM
            </Text>
            <Pressable
              style={s.lineItemButton}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              <Text
                style={
                  selectedCat
                    ? s.lineItemSelected
                    : s.lineItemPlaceholder
                }
              >
                {selectedCat?.name ?? 'Select line item...'}
              </Text>
              {selectedCat && (
                <View style={s.lineItemBudgetPill}>
                  <Text style={s.lineItemBudgetText}>
                    {formatKes(selectedCat.projected)} budget
                  </Text>
                </View>
              )}
            </Pressable>
            {renderCategoryPicker()}

            {/* Note */}
            <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>
              NOTE
            </Text>
            <TextInput
              style={[
                s.textInput,
                focusedField === 'note' && s.fieldFocused,
              ]}
              value={note}
              onChangeText={setNote}
              placeholder="Add a memo..."
              placeholderTextColor={colors.t3}
              onFocus={() => setFocusedField('note')}
              onBlur={() => setFocusedField(null)}
            />

            {/* Reminder toggle */}
            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>Set a reminder for this</Text>
              <Switch
                value={reminderOn}
                onValueChange={setReminderOn}
                trackColor={{
                  false: 'rgba(255,255,255,0.08)',
                  true: colors.coral,
                }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Submit */}
            <Pressable style={s.logButton} onPress={handleLog}>
              <Text style={s.logButtonText}>{getButtonLabel()}</Text>
            </Pressable>
          </View>
        )}

        {/* ============ Manual Tab ============ */}
        {tab === 'manual' && (
          <View>
            {/* Amount */}
            <Text style={s.fieldLabel}>AMOUNT</Text>
            <View
              style={[
                s.amountRow,
                focusedField === 'amount' && s.fieldFocused,
              ]}
            >
              <Text style={s.kesPrefix}>KES</Text>
              <TextInput
                style={s.amountInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.t3}
                onFocus={() => setFocusedField('amount')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* Description */}
            <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>
              DESCRIPTION
            </Text>
            <TextInput
              style={[
                s.textInput,
                focusedField === 'desc' && s.fieldFocused,
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="Merchant or description"
              placeholderTextColor={colors.t3}
              onFocus={() => setFocusedField('desc')}
              onBlur={() => setFocusedField(null)}
            />

            {/* Transaction date */}
            <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>DATE</Text>
            <Pressable
              style={s.datePickerBtn}
              onPress={() => setShowTxDatePicker(true)}
            >
              <Text style={s.datePickerValue}>
                {txDate.toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </Pressable>
            {showTxDatePicker && (
              <DateTimePicker
                value={txDate}
                mode="date"
                display="inline"
                themeVariant={isDark ? 'dark' : 'light'}
                accentColor={colors.coral}
                onChange={(_, date) => {
                  setShowTxDatePicker(false);
                  if (date) setTxDate(date);
                }}
              />
            )}

            {/* Category group chips */}
            <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>
              CATEGORY
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.chipScrollRow}
            >
              <View style={s.chipRow}>
                {visibleGroups.map((group) => {
                  const meta = CATEGORY_GROUP_META[group];
                  const isActive = selectedGroup === group;
                  return (
                    <Pressable
                      key={group}
                      style={[
                        s.chip,
                        isActive && s.chipActive,
                      ]}
                      onPress={() => {
                        setSelectedGroup(group);
                        const first = categories.find(
                          (c) => c.group === group
                        );
                        if (first) setSelectedCategoryId(first.id);
                      }}
                    >
                      <View
                        style={[
                          s.chipDot,
                          { backgroundColor: meta.color },
                        ]}
                      />
                      <Text
                        style={[
                          s.chipText,
                          isActive && s.chipTextActive,
                        ]}
                      >
                        {meta.label}
                      </Text>
                    </Pressable>
                  );
                })}
                {!showAllGroups && availableGroups.length > 5 && (
                  <Pressable
                    style={s.chip}
                    onPress={() => setShowAllGroups(true)}
                  >
                    <Text style={s.chipText}>+ More</Text>
                  </Pressable>
                )}
              </View>
            </ScrollView>

            {/* Line item */}
            {selectedGroup && (
              <>
                <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>
                  LINE ITEM
                </Text>
                <Pressable
                  style={s.lineItemButton}
                  onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                >
                  <Text
                    style={
                      selectedCat
                        ? s.lineItemSelected
                        : s.lineItemPlaceholder
                    }
                  >
                    {selectedCat?.name ?? 'Select line item...'}
                  </Text>
                  {selectedCat && (
                    <View style={s.lineItemBudgetPill}>
                      <Text style={s.lineItemBudgetText}>
                        {formatKes(selectedCat.projected)} budget
                      </Text>
                    </View>
                  )}
                </Pressable>
                {renderCategoryPicker()}
              </>
            )}

            {/* Note */}
            <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>
              NOTE (OPTIONAL)
            </Text>
            <TextInput
              style={[
                s.textInput,
                focusedField === 'note-manual' && s.fieldFocused,
              ]}
              value={note}
              onChangeText={setNote}
              placeholder="Add a memo..."
              placeholderTextColor={colors.t3}
              onFocus={() => setFocusedField('note-manual')}
              onBlur={() => setFocusedField(null)}
            />

            {/* Reminder toggle */}
            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>Set a reminder for this</Text>
              <Switch
                value={reminderOn}
                onValueChange={setReminderOn}
                trackColor={{
                  false: 'rgba(255,255,255,0.08)',
                  true: colors.coral,
                }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Submit */}
            <Pressable style={s.logButton} onPress={handleLog}>
              <Text style={s.logButtonText}>{getButtonLabel()}</Text>
            </Pressable>
          </View>
        )}

        {/* ============ Future Tab ============ */}
        {tab === 'future' && (
          <View>
            {/* Amount */}
            <Text style={s.fieldLabel}>AMOUNT</Text>
            <View
              style={[
                s.amountRow,
                focusedField === 'amount-future' && s.fieldFocused,
              ]}
            >
              <Text style={s.kesPrefix}>KES</Text>
              <TextInput
                style={s.amountInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.t3}
                onFocus={() => setFocusedField('amount-future')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* Description */}
            <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>
              DESCRIPTION
            </Text>
            <TextInput
              style={[
                s.textInput,
                focusedField === 'desc-future' && s.fieldFocused,
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="Description of future expense"
              placeholderTextColor={colors.t3}
              onFocus={() => setFocusedField('desc-future')}
              onBlur={() => setFocusedField(null)}
            />

            {/* Payment status tiles */}
            <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>
              PAYMENT STATUS
            </Text>
            <View style={s.futureRow}>
              <Pressable
                style={[
                  s.futureTile,
                  futureStatus === 'paid' && s.futureTileActive,
                ]}
                onPress={() => setFutureStatus('paid')}
              >
                <Text
                  style={[
                    s.futureTileTitle,
                    futureStatus === 'paid' && s.futureTileTitleActive,
                  ]}
                >
                  Already Paid
                </Text>
                <Text style={s.futureTileSub}>Counts as spent</Text>
              </Pressable>
              <Pressable
                style={[
                  s.futureTile,
                  futureStatus === 'unpaid' && s.futureTileActive,
                ]}
                onPress={() => setFutureStatus('unpaid')}
              >
                <Text
                  style={[
                    s.futureTileTitle,
                    futureStatus === 'unpaid' && s.futureTileTitleActive,
                  ]}
                >
                  Not Yet Paid
                </Text>
                <Text style={s.futureTileSub}>Committed</Text>
              </Pressable>
            </View>

            {/* Date fields */}
            <View style={s.dateRow}>
              <View style={s.dateField}>
                <Text style={s.fieldLabel}>PAYMENT DATE</Text>
                <Pressable
                  style={s.datePickerBtn}
                  onPress={() => setShowPaymentPicker(true)}
                >
                  <Text style={paymentDate ? s.datePickerValue : s.datePickerPlaceholder}>
                    {paymentDate
                      ? paymentDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'Select date'}
                  </Text>
                </Pressable>
                {showPaymentPicker && (
                  <DateTimePicker
                    value={paymentDate ?? new Date()}
                    mode="date"
                    display="inline"
                    themeVariant={isDark ? 'dark' : 'light'}
                    accentColor={colors.coral}
                    onChange={(_, date) => {
                      setShowPaymentPicker(false);
                      if (date) {
                        setPaymentDate(date);
                        setTxDate(date);
                      }
                    }}
                  />
                )}
              </View>
              <View style={s.dateFieldSpacer} />
              <View style={s.dateField}>
                <Text style={s.fieldLabel}>EVENT DATE</Text>
                <Pressable
                  style={s.datePickerBtn}
                  onPress={() => setShowEventPicker(true)}
                >
                  <Text style={eventDate ? s.datePickerValue : s.datePickerPlaceholder}>
                    {eventDate
                      ? eventDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'Select date'}
                  </Text>
                </Pressable>
                {showEventPicker && (
                  <DateTimePicker
                    value={eventDate ?? new Date()}
                    mode="date"
                    display="inline"
                    themeVariant={isDark ? 'dark' : 'light'}
                    accentColor={colors.coral}
                    onChange={(_, date) => {
                      setShowEventPicker(false);
                      if (date) setEventDate(date);
                    }}
                  />
                )}
              </View>
            </View>

            {/* Category */}
            <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>
              CATEGORY
            </Text>
            <Pressable
              style={s.categoryButton}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              {selectedCat ? (
                <View style={s.categorySelectedRow}>
                  <View
                    style={[
                      s.categorySelectedDot,
                      {
                        backgroundColor:
                          CATEGORY_GROUP_META[selectedCat.group]?.color ??
                          colors.t3,
                      },
                    ]}
                  />
                  <Text style={s.categorySelectedText}>
                    {CATEGORY_GROUP_META[selectedCat.group]?.label} {'\u00B7'}{' '}
                    {selectedCat.name}
                  </Text>
                </View>
              ) : (
                <Text style={s.categoryPlaceholder}>
                  Select category...
                </Text>
              )}
              <Text style={s.categoryChevron}>{'\u25BC'}</Text>
            </Pressable>
            {renderCategoryPicker()}

            {/* Reminder toggle */}
            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>
                Remind me before payment
              </Text>
              <Switch
                value={reminderOn}
                onValueChange={setReminderOn}
                trackColor={{
                  false: 'rgba(255,255,255,0.08)',
                  true: colors.coral,
                }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Submit */}
            <Pressable style={s.logButton} onPress={handleLog}>
              <Text style={s.logButtonText}>{getButtonLabel()}</Text>
            </Pressable>
          </View>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>

        {/* Toast */}
        {toast ? (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={s.toast}>
            <Text style={s.toastText}>{'\u2713'} {toast}</Text>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const mkStyles = (c: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: c.bgSheet,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: c.borderMed,
    paddingBottom: 34,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 2,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 100,
    backgroundColor: c.t3,
    opacity: 0.4,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md + 4,
    paddingTop: 8,
    paddingBottom: spacing.sm,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: c.t1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Tabs */
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: c.coralDim,
    borderColor: 'rgba(46,204,113,0.35)',
  },
  tabText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: c.t3,
  },
  tabTextActive: {
    color: c.coral,
  },

  /* Content */
  content: {
    flexGrow: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },

  /* SMS paste area */
  pasteArea: {
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.borderMed,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: spacing.md,
    borderCurve: 'continuous',
  },
  pasteAreaFocused: {
    borderColor: c.borderFocus,
  },
  smsInput: {
    fontSize: 14,
    color: c.t1,
    minHeight: 80,
    textAlignVertical: 'top',
    padding: 0,
  },
  parseRow: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  parseButton: {
    backgroundColor: c.coral,
    borderRadius: radii.button,
    paddingVertical: 6,
    paddingHorizontal: 14,
    position: 'absolute' as const,
    bottom: 10,
    right: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  parseButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  /* Field labels */
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: c.t3,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  fieldFocused: {
    borderColor: c.borderFocus,
  },

  /* Category chips */
  chipScrollRow: {
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: c.borderMed,
    backgroundColor: c.bgCard,
    borderCurve: 'continuous',
  },
  chipActive: {
    backgroundColor: c.coralDim,
    borderColor: 'rgba(46,204,113,0.35)',
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.t2,
  },
  chipTextActive: {
    color: c.coral,
  },

  /* Text input */
  textInput: {
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.borderMed,
    borderRadius: radii.sm,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '500',
    color: c.t1,
    borderCurve: 'continuous',
  },

  /* Toggle row */
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: c.border,
    marginTop: spacing.md,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: c.t2,
  },

  /* Log / Submit button */
  logButton: {
    backgroundColor: c.coral,
    paddingVertical: 15,
    borderRadius: radii.button,
    alignItems: 'center',
    marginTop: spacing.md,
    boxShadow: '0 4px 8px rgba(46, 204, 113, 0.3)',
    borderCurve: 'continuous',
  },
  logButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  /* Parsed success tag */
  parsedTag: {
    alignSelf: 'flex-start',
    backgroundColor: c.greenDim,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.2)',
    borderRadius: radii.xs,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: spacing.sm,
    borderCurve: 'continuous',
  },
  parsedTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.green,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* Parsed card */
  parsedCard: {
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.2)',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderCurve: 'continuous',
  },
  parsedAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  parsedAmountLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  parsedKes: {
    fontSize: 13,
    fontWeight: '600',
    color: c.t2,
    marginRight: 6,
  },
  parsedAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: c.t1,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  parsedRef: {
    fontSize: 13,
    fontWeight: '600',
    color: c.t2,
  },
  parsedGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingTop: 10,
    gap: spacing.md,
  },
  parsedGridItem: {
    flex: 1,
  },
  parsedGridLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: c.t3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  parsedGridValue: {
    fontSize: 13,
    fontWeight: '600',
    color: c.t1,
  },

  /* Line item button */
  lineItemButton: {
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.borderMed,
    borderRadius: radii.sm,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderCurve: 'continuous',
  },
  lineItemSelected: {
    fontSize: 14,
    fontWeight: '500',
    color: c.t1,
    flex: 1,
  },
  lineItemPlaceholder: {
    fontSize: 14,
    color: c.t3,
    flex: 1,
  },
  lineItemBudgetPill: {
    backgroundColor: c.coralDim,
    borderRadius: radii.pill,
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginLeft: 8,
  },
  lineItemBudgetText: {
    fontSize: 11,
    fontWeight: '600',
    color: c.coral,
  },

  /* Amount row */
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.borderMed,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    borderCurve: 'continuous',
  },
  kesPrefix: {
    fontSize: 13,
    fontWeight: '600',
    color: c.t3,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: c.t1,
    paddingVertical: 12,
    fontVariant: ['tabular-nums'],
  },

  /* Future tiles */
  futureRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.sm,
  },
  futureTile: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgCard,
    alignItems: 'center',
    borderCurve: 'continuous',
  },
  futureTileActive: {
    backgroundColor: c.coralDim,
    borderColor: 'rgba(46,204,113,0.35)',
  },
  futureTileTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: c.t3,
  },
  futureTileTitleActive: {
    color: c.coral,
  },
  futureTileSub: {
    fontSize: 10.5,
    fontWeight: '500',
    color: c.t3,
    marginTop: 2,
  },

  /* Date fields */
  dateRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  dateField: {
    flex: 1,
  },
  dateFieldSpacer: {
    width: 8,
  },
  datePickerBtn: {
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.borderMed,
    borderRadius: radii.sm,
    borderCurve: 'continuous',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  datePickerValue: {
    fontSize: 14,
    fontWeight: '500',
    color: c.t1,
  },
  datePickerPlaceholder: {
    fontSize: 14,
    color: c.t3,
  },

  /* Category button (future tab) */
  categoryButton: {
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.borderMed,
    borderRadius: radii.sm,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderCurve: 'continuous',
  },
  categorySelectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categorySelectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  categorySelectedText: {
    fontSize: 14,
    fontWeight: '500',
    color: c.t1,
  },
  categoryPlaceholder: {
    fontSize: 14,
    color: c.t3,
  },
  categoryChevron: {
    fontSize: 10,
    color: c.t3,
    marginLeft: 8,
  },

  /* Category picker overlay */
  pickerOverlay: {
    backgroundColor: c.bgCard,
    borderWidth: 1,
    borderColor: c.borderMed,
    borderRadius: radii.sm,
    height: 220,
    marginTop: 6,
    marginBottom: spacing.sm,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  pickerList: {
    flex: 1,
    padding: spacing.sm,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  pickerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  pickerItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: c.t1,
    flex: 1,
  },
  pickerGroupText: {
    fontSize: 11,
    color: c.t2,
  },

  /* Toast */
  toast: {
    position: 'absolute',
    bottom: 40,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: c.greenDim,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.2)',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    alignItems: 'center',
    borderCurve: 'continuous',
  },
  toastText: {
    color: c.green,
    fontSize: 13,
    fontWeight: '600',
  },
});
