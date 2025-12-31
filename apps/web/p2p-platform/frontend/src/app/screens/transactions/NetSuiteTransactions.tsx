import React from "react";
import TransactionsMain from "./Main";

const NetSuiteTransactions: React.FC = () => {
  return <TransactionsMain initialSystem="netsuite" showSystemTabs={false} />;
};

export default NetSuiteTransactions;