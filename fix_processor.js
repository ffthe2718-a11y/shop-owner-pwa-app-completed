const fs = require('fs');
const file = 'src/lib/ownerPreferenceSyncProcessor.ts';
let content = fs.readFileSync(file, 'utf8');

const target = `export function isAllowedOwnerPreferenceAction(actionType: string): boolean {
  return ALLOWED_OFFLINE_ACTION_TYPES.includes(actionType as any);
}`;

const replacement = `const FORBIDDEN_ACTION_KEYWORDS = [
  'booking',
  'service_crud', 'service_create', 'service_update', 'service_delete',
  'staff_crud', 'staff_create', 'staff_update', 'staff_delete',
  'customer_edit', 'customer_create', 'customer_update', 'customer_delete',
  'profile_update', 'profile_edit',
  'logo_upload', 'image_upload',
  'website_save', 'website_publish',
  'wallet',
  'payout',
  'refund',
  'razorpay',
  'kyc',
  'password', 'email_change'
];

export function isAllowedOwnerPreferenceAction(actionType: string): boolean {
  const lower = actionType.toLowerCase();
  for (const keyword of FORBIDDEN_ACTION_KEYWORDS) {
    if (lower.includes(keyword) && !ALLOWED_OFFLINE_ACTION_TYPES.includes(actionType as any)) {
      return false;
    }
  }
  return ALLOWED_OFFLINE_ACTION_TYPES.includes(actionType as any);
}`;

if (content.includes("export function isAllowedOwnerPreferenceAction")) {
  content = content.replace(/export function isAllowedOwnerPreferenceAction[\s\S]*?}/, replacement);
  fs.writeFileSync(file, content);
  console.log("Replaced successfully");
} else {
  console.log("Could not find target");
}
