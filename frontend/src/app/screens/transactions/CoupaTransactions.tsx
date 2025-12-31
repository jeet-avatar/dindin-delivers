import React from "react";
import TransactionsMain from "./Main";

const CoupaTransactions: React.FC = () => {
  return <TransactionsMain initialSystem="coupa" showSystemTabs={false} />;
};

export default CoupaTransactions;