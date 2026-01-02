import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

export default function Onboarding() {
  return (
    <ProtectedRoute>
      <OnboardingWizard />
    </ProtectedRoute>
  );
}
