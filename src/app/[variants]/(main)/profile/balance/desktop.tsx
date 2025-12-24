'use client';

import { memo } from 'react';

import BalanceClient from './Client';

const DesktopProfileBalancePage = memo(() => {
  const mobile = false;
  return <BalanceClient mobile={mobile} />;
});

DesktopProfileBalancePage.displayName = 'DesktopProfileBalancePage';

export default DesktopProfileBalancePage;
