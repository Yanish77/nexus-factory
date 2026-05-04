export type RiskyAction =
  | "LIVE_PRODUCT_PUBLISHING"
  | "SPEND_MONEY"
  | "CUSTOMER_MESSAGE"
  | "REFUND"
  | "PRODUCTION_DEPLOY"
  | "API_CREDENTIAL_CHANGE"
  | "MODEL_ROUTING_CHANGE";

export type ApprovalDecision = {
  allowed: boolean;
  requiresApproval: boolean;
  reason: string;
};

export const riskyActions: RiskyAction[] = [
  "LIVE_PRODUCT_PUBLISHING",
  "SPEND_MONEY",
  "CUSTOMER_MESSAGE",
  "REFUND",
  "PRODUCTION_DEPLOY",
  "API_CREDENTIAL_CHANGE",
  "MODEL_ROUTING_CHANGE",
];

export function evaluateApproval(action: RiskyAction): ApprovalDecision {
  if (riskyActions.includes(action)) {
    return {
      allowed: false,
      requiresApproval: true,
      reason: `${action} requires human approval.`,
    };
  }

  return {
    allowed: true,
    requiresApproval: false,
    reason: "Action is allowed.",
  };
}
