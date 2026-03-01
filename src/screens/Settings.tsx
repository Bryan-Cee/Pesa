import React, { useState } from 'react';
import Constants from 'expo-constants';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { spacing, radii } from '../theme/spacing';
import { useSettingsStore, Settings } from '../stores/settingsStore';
import { useBudgetStore } from '../stores/budgetStore';
import { useTransactionStore } from '../stores/transactionStore';
import { useDebtStore } from '../stores/debtStore';
import { useGoalStore } from '../stores/goalStore';
import { useReminderStore } from '../stores/reminderStore';
import { TabIcon } from '../components/TabIcon';
import { useColors } from '../hooks/useTheme';
import { formatKes } from '../utils/formatters';
import { exportData, ExportFormat } from '../utils/exportData';

type ReviewCadence = Settings['reviewCadence'];

export function SettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  const resetBudget = useBudgetStore((s) => s.reset);
  const resetTransactions = useTransactionStore((s) => s.reset);
  const resetDebts = useDebtStore((s) => s.reset);
  const resetGoals = useGoalStore((s) => s.reset);
  const resetReminders = useReminderStore((s) => s.reset);

  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeText, setIncomeText] = useState(String(settings.incomeAssumption));
  const [resetConfirm, setResetConfirm] = useState('');
  const [showCadencePicker, setShowCadencePicker] = useState(false);
  const [showPayoffPicker, setShowPayoffPicker] = useState(false);
  const [showEmergencyPicker, setShowEmergencyPicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showExportPicker, setShowExportPicker] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [exporting, setExporting] = useState(false);

  function saveIncome() {
    const val = parseInt(incomeText, 10);
    if (val > 0) updateSettings({ incomeAssumption: val });
    setEditingIncome(false);
  }

  function handleReset() {
    if (resetConfirm !== 'RESET') {
      Alert.alert('Error', 'Type RESET to confirm');
      return;
    }
    Alert.alert(
      'Reset All Data',
      'This will erase all your data and return to onboarding.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetBudget();
            resetTransactions();
            resetDebts();
            resetGoals();
            resetReminders();
            resetSettings();
            router.replace('/');
          },
        },
      ]
    );
  }

  async function runExport() {
    setExporting(true);
    try {
      await exportData(exportFormat);
      updateSettings({ lastExportedAt: new Date().toISOString() });
      setShowExportPicker(false);
    } catch {
      Alert.alert('Export Failed', 'Could not export data. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  const cadenceLabels: Record<ReviewCadence, string> = {
    DAILY: 'Daily',
    EVERY_2_DAYS: 'Every 2 days',
    WEEKLY: 'Weekly',
    BI_WEEKLY: 'Bi-weekly',
    CUSTOM: 'Custom',
  };

  const themeLabels: Record<string, string> = {
    LIGHT: 'Light',
    DARK: 'Dark',
    SYSTEM: 'System',
  };

  function OptionPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return (
      <Pressable
        style={[
          s.pill,
          { backgroundColor: active ? colors.coralDim : colors.bgRaised, borderColor: active ? colors.coralBorder : colors.border },
        ]}
        onPress={onPress}
      >
        <Text style={[s.pillText, { color: active ? colors.coral : colors.t2 }]}>{label}</Text>
      </Pressable>
    );
  }

  const s = styles(colors);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled">
      {/* Profile */}
      <View style={s.profileCard}>
        <View style={[s.profileAvatar, { backgroundColor: colors.coralDim }]}>
          <TabIcon name="user" color={colors.coral} size={22} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.profileName}>Pesa</Text>
          <Text style={s.profileSub}>Income: {formatKes(settings.incomeAssumption)}/mo</Text>
        </View>
        <Pressable style={s.editBtn} onPress={() => setEditingIncome(!editingIncome)}>
          <Text style={s.editBtnText}>Edit</Text>
        </Pressable>
      </View>

      {/* Income editor */}
      {editingIncome && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={s.inlineEditor}>
          <Text style={s.editorLabel}>MONTHLY INCOME</Text>
          <View style={s.editorInputRow}>
            <Text style={[s.editorKes, { color: colors.t3 }]}>KES</Text>
            <TextInput
              style={[s.editorInput, { color: colors.t1, borderBottomColor: colors.coral }]}
              value={incomeText}
              onChangeText={setIncomeText}
              keyboardType="number-pad"
              autoFocus
              selectionColor={colors.coral}
            />
          </View>
          <Pressable style={[s.saveBtn, { backgroundColor: colors.coral }]} onPress={saveIncome}>
            <Text style={s.saveBtnText}>Save</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Notifications */}
      <Text style={s.sectionTitle}>NOTIFICATIONS</Text>
      <View style={s.sectionCard}>
        <View style={s.row}>
          <View style={[s.rowIcon, { backgroundColor: colors.purpleDim }]}>
            <TabIcon name="bell" color={colors.purple} size={16} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.rowLabel}>Enable Notifications</Text>
            <Text style={s.rowDesc}>Push reminders and alerts</Text>
          </View>
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={(v) => updateSettings({ notificationsEnabled: v })}
            trackColor={{ true: colors.coral, false: colors.border }}
            thumbColor={colors.white}
          />
        </View>
        <View style={s.divider} />
        <Pressable style={s.row} onPress={() => setShowCadencePicker(!showCadencePicker)}>
          <View style={[s.rowIcon, { backgroundColor: colors.purpleDim }]}>
            <TabIcon name="clock" color={colors.purple} size={16} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.rowLabel}>Review Cadence</Text>
            <Text style={s.rowDesc}>{cadenceLabels[settings.reviewCadence]}</Text>
          </View>
          <TabIcon name="chevron-right" color={colors.t3} size={18} />
        </Pressable>
        {showCadencePicker && (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={s.pickerRow}>
            {(Object.keys(cadenceLabels) as ReviewCadence[]).map((key) => (
              <OptionPill
                key={key}
                label={cadenceLabels[key]}
                active={settings.reviewCadence === key}
                onPress={() => { updateSettings({ reviewCadence: key }); setShowCadencePicker(false); }}
              />
            ))}
          </Animated.View>
        )}
        <View style={s.divider} />
        <View style={s.row}>
          <View style={[s.rowIcon, { backgroundColor: colors.amberDim }]}>
            <TabIcon name="alert-triangle" color={colors.amber} size={16} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.rowLabel}>Overspend Alerts</Text>
            <Text style={s.rowDesc}>Alert at {settings.overspendThresholdPercent}% of budget</Text>
          </View>
          <Switch
            value={settings.overspendAlertsEnabled}
            onValueChange={(v) => updateSettings({ overspendAlertsEnabled: v })}
            trackColor={{ true: colors.coral, false: colors.border }}
            thumbColor={colors.white}
          />
        </View>
      </View>

      {/* Debt & Goals */}
      <Text style={s.sectionTitle}>DEBT & GOALS</Text>
      <View style={s.sectionCard}>
        <Pressable style={s.row} onPress={() => setShowPayoffPicker(!showPayoffPicker)}>
          <View style={[s.rowIcon, { backgroundColor: colors.greenDim }]}>
            <TabIcon name="trending-down" color={colors.green} size={16} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.rowLabel}>Payoff Method</Text>
            <Text style={s.rowDesc}>
              {settings.debtPayoffMethod === 'AVALANCHE' ? 'Highest rate first' : 'Lowest balance first'}
            </Text>
          </View>
          <TabIcon name="chevron-right" color={colors.t3} size={18} />
        </Pressable>
        {showPayoffPicker && (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={s.pickerRow}>
            <OptionPill
              label="Avalanche"
              active={settings.debtPayoffMethod === 'AVALANCHE'}
              onPress={() => { updateSettings({ debtPayoffMethod: 'AVALANCHE' }); setShowPayoffPicker(false); }}
            />
            <OptionPill
              label="Snowball"
              active={settings.debtPayoffMethod === 'SNOWBALL'}
              onPress={() => { updateSettings({ debtPayoffMethod: 'SNOWBALL' }); setShowPayoffPicker(false); }}
            />
          </Animated.View>
        )}
        <View style={s.divider} />
        <Pressable style={s.row} onPress={() => setShowEmergencyPicker(!showEmergencyPicker)}>
          <View style={[s.rowIcon, { backgroundColor: colors.debtRedDim }]}>
            <TabIcon name="shield" color={colors.debtRed} size={16} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.rowLabel}>Emergency Fund Target</Text>
            <Text style={s.rowDesc}>{settings.emergencyFundMultiplier}x monthly expenses</Text>
          </View>
          <TabIcon name="chevron-right" color={colors.t3} size={18} />
        </Pressable>
        {showEmergencyPicker && (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={s.pickerRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <OptionPill
                key={n}
                label={`${n}x`}
                active={settings.emergencyFundMultiplier === n}
                onPress={() => { updateSettings({ emergencyFundMultiplier: n }); setShowEmergencyPicker(false); }}
              />
            ))}
          </Animated.View>
        )}
      </View>

      {/* Data & Appearance */}
      <Text style={s.sectionTitle}>DATA</Text>
      <View style={s.sectionCard}>
        <Pressable style={s.row} onPress={() => setShowExportPicker(!showExportPicker)}>
          <View style={[s.rowIcon, { backgroundColor: colors.investBlueDim }]}>
            <TabIcon name="download" color={colors.investBlue} size={16} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.rowLabel}>Export Data</Text>
            <Text style={s.rowDesc}>
              {settings.lastExportedAt
                ? `Last: ${settings.lastExportedAt.substring(0, 10)}`
                : 'CSV, XLSX, or JSON'}
            </Text>
          </View>
          <TabIcon name="chevron-right" color={colors.t3} size={18} />
        </Pressable>
        {showExportPicker && (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={s.exportPicker}>
            <View style={s.pickerRow}>
              {(['csv', 'xlsx', 'json'] as ExportFormat[]).map((fmt) => (
                <OptionPill
                  key={fmt}
                  label={fmt.toUpperCase()}
                  active={exportFormat === fmt}
                  onPress={() => setExportFormat(fmt)}
                />
              ))}
            </View>
            <Pressable
              style={[s.exportBtn, { backgroundColor: colors.investBlue, opacity: exporting ? 0.6 : 1 }]}
              onPress={runExport}
              disabled={exporting}
            >
              <TabIcon name="download" color="#fff" size={14} />
              <Text style={s.exportBtnText}>{exporting ? 'Exporting…' : `Export as ${exportFormat.toUpperCase()}`}</Text>
            </Pressable>
          </Animated.View>
        )}
        <View style={s.divider} />
        <Pressable style={s.row} onPress={() => setShowThemePicker(!showThemePicker)}>
          <View style={[s.rowIcon, { backgroundColor: colors.coralDim }]}>
            <TabIcon name="sun" color={colors.coral} size={16} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.rowLabel}>Appearance</Text>
            <Text style={s.rowDesc}>{themeLabels[settings.theme]}</Text>
          </View>
          <TabIcon name="chevron-right" color={colors.t3} size={18} />
        </Pressable>
        {showThemePicker && (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={s.pickerRow}>
            {(['LIGHT', 'DARK', 'SYSTEM'] as const).map((t) => (
              <OptionPill
                key={t}
                label={themeLabels[t]}
                active={settings.theme === t}
                onPress={() => { updateSettings({ theme: t }); setShowThemePicker(false); }}
              />
            ))}
          </Animated.View>
        )}
      </View>

      {/* Danger Zone */}
      <Text style={[s.sectionTitle, { color: colors.red }]}>DANGER ZONE</Text>
      <View style={[s.sectionCard, { borderColor: colors.redDim }]}>
        <View style={s.row}>
          <View style={[s.rowIcon, { backgroundColor: colors.redDim }]}>
            <TabIcon name="trash-2" color={colors.red} size={16} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.rowLabel}>Reset All Data</Text>
            <Text style={s.rowDesc}>Permanently delete everything</Text>
          </View>
        </View>
        <View style={s.dangerInput}>
          <TextInput
            style={[s.resetInput, { color: colors.red, borderColor: colors.redDim }]}
            value={resetConfirm}
            onChangeText={setResetConfirm}
            placeholder="Type RESET to confirm"
            placeholderTextColor={colors.t3}
          />
          <Pressable
            style={[s.resetBtn, { backgroundColor: colors.red, opacity: resetConfirm === 'RESET' ? 1 : 0.3 }]}
            onPress={handleReset}
            disabled={resetConfirm !== 'RESET'}
          >
            <Text style={s.resetBtnText}>Reset</Text>
          </Pressable>
        </View>
      </View>

      {/* Version */}
      <View style={s.versionBlock}>
        <Text style={s.versionApp}>Pesa</Text>
        <Text style={s.versionText}>Version {Constants.expoConfig?.version ?? '—'}</Text>
        <Text style={s.versionText}>Build {Constants.easConfig?.projectId ? Constants.expoConfig?.version : '—'}</Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Dynamic styles using current theme colors
const styles = (c: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginHorizontal: spacing.md,
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.lg,
      padding: 16,
      marginTop: 20,
      marginBottom: 24,
      borderCurve: 'continuous',
    },
    profileAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      borderCurve: 'continuous',
    },
    profileName: { fontSize: 17, fontWeight: '700', color: c.t1 },
    profileSub: { fontSize: 12, color: c.t3, marginTop: 2, fontVariant: ['tabular-nums'] },
    editBtn: {
      backgroundColor: c.coralDim,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radii.button,
      borderCurve: 'continuous',
    },
    editBtnText: { fontSize: 13, fontWeight: '600', color: c.coral },

    inlineEditor: {
      marginHorizontal: spacing.md,
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.borderMed,
      borderRadius: radii.md,
      padding: 16,
      marginBottom: 20,
      borderCurve: 'continuous',
    },
    editorLabel: { fontSize: 11, fontWeight: '600', color: c.t3, letterSpacing: 0.6, marginBottom: 8 },
    editorInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    editorKes: { fontSize: 15, marginRight: 6 },
    editorInput: { flex: 1, fontSize: 22, fontWeight: '700', borderBottomWidth: 2, paddingVertical: 4 },
    saveBtn: { paddingVertical: 10, borderRadius: radii.button, alignItems: 'center', borderCurve: 'continuous' },
    saveBtnText: { color: c.buttonText, fontWeight: '700', fontSize: 15 },

    sectionTitle: { fontSize: 11, fontWeight: '600', color: c.t3, letterSpacing: 0.8, paddingHorizontal: 22, marginBottom: 8 },
    sectionCard: {
      marginHorizontal: spacing.md,
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.md,
      marginBottom: 20,
      overflow: 'hidden',
      borderCurve: 'continuous',
    },
    divider: { height: 1, backgroundColor: c.border, marginLeft: 60 },

    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14 },
    rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    rowLabel: { fontSize: 15, fontWeight: '600', color: c.t1 },
    rowDesc: { fontSize: 12, color: c.t3, marginTop: 2 },

    pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, paddingBottom: 14 },
    exportPicker: { paddingBottom: 14 },
    exportBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radii.button,
      borderCurve: 'continuous',
    },
    exportBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radii.button, borderWidth: 1, borderCurve: 'continuous' },
    pillText: { fontSize: 13, fontWeight: '600' },

    dangerInput: { paddingHorizontal: 14, paddingBottom: 14 },
    resetInput: { borderWidth: 1, borderRadius: radii.xs, padding: 10, fontSize: 15, fontWeight: '700', marginBottom: 10, borderCurve: 'continuous' },
    resetBtn: { paddingVertical: 10, borderRadius: radii.button, alignItems: 'center', borderCurve: 'continuous' },
    resetBtnText: { color: c.buttonText, fontWeight: '700', fontSize: 15 },

    versionBlock: { alignItems: 'center', paddingVertical: 24, gap: 4 },
    versionApp: { fontSize: 13, fontWeight: '700', color: c.t2 },
    versionText: { fontSize: 12, color: c.t3 },
  });
