import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '../hooks/useTheme';
import { ThemeColors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { radii } from '../theme/spacing';
import { useBudgetStore } from '../stores/budgetStore';
import { useTransactionStore, TransactionType } from '../stores/transactionStore';
import { parseSms } from '../utils/smsParser';
import { formatKes } from '../utils/formatters';
import { CATEGORY_GROUP_META, CATEGORY_GROUP_ORDER } from '../utils/constants';

type Tab = 'sms' | 'manual' | 'future';

export function TransactionLogger() {
  const router = useRouter();
  const colors = useColors();
  const s = mkStyles(colors);
  const [tab, setTab] = useState<Tab>('sms');
  const [toast, setToast] = useState('');

  // SMS tab state
  const [smsText, setSmsText] = useState('');
  const [parsed, setParsed] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [rawSms, setRawSms] = useState('');
  const [parsedReference, setParsedReference] = useState('');
  const [parsedDate, setParsedDate] = useState('');
  const [parsedMerchant, setParsedMerchant] = useState('');

  // Future tab state
  const [futureStatus, setFutureStatus] = useState<'paid' | 'unpaid'>('unpaid');
  const [paymentDate, setPaymentDate] = useState('');
  const [eventDate, setEventDate] = useState('');

  // Reminder toggle
  const [reminderOn, setReminderOn] = useState(false);

  // Focus tracking
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Category chips: show first 5 groups, then "+ More"
  const [showAllGroups, setShowAllGroups] = useState(false);

  const months = useBudgetStore((s) => s.months);
  const allCategories = useBudgetStore((s) => s.categories);
  const addTransaction = useTransactionStore((s) => s.addTransaction);

  const currentMonth = useMemo(() => {
    const now = new Date();
    const current = months.find(
      (m) => m.year === now.getFullYear() && m.month === now.getMonth() + 1
    );
    if (current) return current;
    const sorted = [...months].sort(
      (a, b) => b.year * 12 + b.month - (a.year * 12 + a.month)
    );
    return sorted[0] ?? null;
  }, [months]);

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

  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

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

    addTransaction({
      monthId: currentMonth.id,
      categoryId: selectedCategoryId,
      amount: amountNum,
      description: description || 'Transaction',
      date: new Date().toISOString(),
      type,
      note: note || undefined,
      rawSms: rawSms || undefined,
      isPaid: type === 'FUTURE_PAID' ? true : undefined,
    });

    const catName =
      categories.find((c) => c.id === selectedCategoryId)?.name ?? 'Budget';

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setToast(`Logged to ${catName}`);
    setTimeout(() => setToast(''), 3000);

    // Reset form
    setAmount('');
    setDescription('');
    setNote('');
    setSelectedCategoryId('');
    setSmsText('');
    setParsed(false);
    setRawSms('');
    setParsedReference('');
    setParsedDate('');
    setParsedMerchant('');
    setSelectedGroup(null);
  }

  function renderCategoryPicker() {
    if (!showCategoryPicker) return null;
    return (
      <View style={s.pickerOverlay}>
        <ScrollView style={s.pickerList}>
          {categories.map((cat) => (
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
      </View>
    );
  }

  const selectedCat = categories.find((c) => c.id === selectedCategoryId);
  const amountNum = parseInt(amount, 10) || 0;

  const selectedCatGroup = selectedCat
    ? CATEGORY_GROUP_META[selectedCat.group]
    : null;

  // Button label logic
  function getButtonLabel(): string {
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

  const tabs: { key: Tab; emoji: string; label: string }[] = [
    { key: 'sms', emoji: '\uD83D\uDCAC', label: 'SMS Paste' },
    { key: 'manual', emoji: '\u270F\uFE0F', label: 'Manual' },
    { key: 'future', emoji: '\uD83D\uDCC5', label: 'Future' },
  ];

  return (
    <View style={s.overlay}>
      {/* Backdrop — tap to dismiss */}
      <Pressable style={s.backdrop} onPress={() => router.back()} />

      {/* Sheet */}
      <View style={s.sheet}>
        {/* Drag handle */}
        <View style={s.dragHandleRow}>
          <View style={s.dragHandle} />
        </View>

        {/* Header */}
        <View style={s.header}>
        <Text style={s.headerTitle}>Log Transaction</Text>
        <Pressable style={s.doneButton} onPress={() => router.back()}>
          <Text style={s.doneText}>Done</Text>
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

            {/* Category group chips */}
            <Text style={s.fieldLabel}>CATEGORY</Text>
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
                {'\u2713'} Log Transaction
              </Text>
            </Pressable>
          </View>
        )}

        {/* ============ SMS Tab: parsed ============ */}
        {tab === 'sms' && parsed && (
          <View>
            {/* Parsed success tag */}
            <View style={s.parsedTag}>
              <Text style={s.parsedTagText}>
                {'\u2713'} PARSED SUCCESSFULLY
              </Text>
            </View>

            {/* Parsed card */}
            <View style={s.parsedCard}>
              {/* Amount + Reference row */}
              <View style={s.parsedAmountRow}>
                <View style={s.parsedAmountLeft}>
                  <Text style={s.parsedKes}>KES</Text>
                  <Text style={s.parsedAmount}>
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
            </View>

            {/* Category group chips */}
            <Text style={s.fieldLabel}>CATEGORY</Text>
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
                <TextInput
                  style={[
                    s.textInput,
                    focusedField === 'paydate' && s.fieldFocused,
                  ]}
                  value={paymentDate}
                  onChangeText={setPaymentDate}
                  placeholder="DD Mon YYYY"
                  placeholderTextColor={colors.t3}
                  onFocus={() => setFocusedField('paydate')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              <View style={s.dateFieldSpacer} />
              <View style={s.dateField}>
                <Text style={s.fieldLabel}>EVENT DATE</Text>
                <TextInput
                  style={[
                    s.textInput,
                    focusedField === 'evtdate' && s.fieldFocused,
                  ]}
                  value={eventDate}
                  onChangeText={setEventDate}
                  placeholder="DD Mon YYYY"
                  placeholderTextColor={colors.t3}
                  onFocus={() => setFocusedField('evtdate')}
                  onBlur={() => setFocusedField(null)}
                />
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
          <View style={s.toast}>
            <Text style={s.toastText}>{'\u2713'} {toast}</Text>
          </View>
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    maxHeight: '85%',
    backgroundColor: c.bgSheet,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: c.borderMed,
    paddingBottom: 34,
  },
  dragHandleRow: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md + 4,
    paddingTop: 8,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: c.t1,
  },
  doneButton: {
    backgroundColor: c.coralDim,
    borderRadius: radii.button,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  doneText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.coral,
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
    shadowColor: c.coral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
    maxHeight: 200,
    marginTop: 6,
    marginBottom: spacing.sm,
  },
  pickerList: {
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
  },
  toastText: {
    color: c.green,
    fontSize: 13,
    fontWeight: '600',
  },
});
