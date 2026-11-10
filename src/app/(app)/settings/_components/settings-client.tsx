'use client'

import { AccountSection } from './account-section'
import { AppearanceSection } from './appearance-section'
import { EmailSection } from './email-section'
import { PasswordSection } from './password-section'
import { ProfileSection } from './profile-section'

interface SettingsClientProps {
  userId: string
  currentEmail: string
  initialName: string
  initialPhone: string
  initialAvatarUrl: string
}

/** The settings screen in two columns. Each section keeps its own state and
 *  saves on its own; nothing here is shared between them. */
export default function SettingsClient({
  userId,
  currentEmail,
  initialName,
  initialPhone,
  initialAvatarUrl,
}: SettingsClientProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      <div className="space-y-4">
        <ProfileSection
          userId={userId}
          currentEmail={currentEmail}
          initialName={initialName}
          initialPhone={initialPhone}
          initialAvatarUrl={initialAvatarUrl}
        />
        <EmailSection currentEmail={currentEmail} />
      </div>

      <div className="space-y-4">
        <PasswordSection />
        <AppearanceSection />
        <AccountSection />
      </div>
    </div>
  )
}
