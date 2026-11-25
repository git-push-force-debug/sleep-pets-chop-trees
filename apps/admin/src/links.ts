export const chatwootUrl = (displayId: number) =>
  `https://app.chatwoot.com/app/accounts/${import.meta.env.VITE_CHATWOOT_ACCOUNT_ID}/conversations/${displayId}`;
