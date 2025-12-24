'use client';

import { memo } from 'react';

import BalanceClient from './Client';

const MobileProfileBalancePage = memo(() => {
  const mobile = true;
  return <BalanceClient mobile={mobile} />;
});

MobileProfileBalancePage.displayName = 'MobileProfileBalancePage';

export default MobileProfileBalancePage;
