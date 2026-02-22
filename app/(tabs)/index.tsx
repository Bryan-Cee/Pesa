import { useSettingsStore } from '../../src/stores/settingsStore';
import { Onboarding } from '../../src/screens/Onboarding';
import { Dashboard } from '../../src/screens/Dashboard';
import { Screen } from '../../src/components/Screen';

export default function DashboardRoute() {
  const hasCompleted = useSettingsStore((s) => s.settings.hasCompletedOnboarding);

  if (!hasCompleted) {
    return <Screen><Onboarding /></Screen>;
  }

  return <Screen><Dashboard /></Screen>;
}
