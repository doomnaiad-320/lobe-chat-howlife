import { Plans } from '@/types/subscription';

export interface CommonState {
  balance: number;
  isOnboard: boolean;
  isShowPWAGuide: boolean;
  isUserCanEnableTrace: boolean;
  isUserHasConversation: boolean;
  isUserStateInit: boolean;
  subscriptionPlan?: Plans;
}

export const initialCommonState: CommonState = {
  balance: 0,
  isOnboard: false,
  isShowPWAGuide: false,
  isUserCanEnableTrace: false,
  isUserHasConversation: false,
  isUserStateInit: false,
};
