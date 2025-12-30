import React, { useState, useEffect } from 'react';
import { Tabs, Card, Spin, DatePicker, Select, Button, Statistic, Row, Col, Table, Tag, Alert } from 'antd';
import {
  DollarOutlined,
  BankOutlined,
  FileTextOutlined,
  LineChartOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../api/api';

const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface BalanceSheetData {
  as_of_date: string;
  assets: {
    current_assets: {
      cash_stripe: number;
      accounts_receivable: number;
      prepaid_expenses: number;
      total_current_assets: number;
    };
    fixed_assets: {
      equipment: number;
      accumulated_depreciation: number;
      total_fixed_assets: number;
    };
    total_assets: number;
  };
  liabilities: {
    current_liabilities: {
      accounts_payable_restaurants: number;
      accounts_payable_drivers: number;
      sales_tax_payable: number;
      accrued_expenses: number;
      total_current_liabilities: number;
    };
    long_term_liabilities: {
      total_long_term_liabilities: number;
    };
    total_liabilities: number;
  };
  equity: {
    common_stock: number;
    retained_earnings: number;
    current_period_earnings: number;
    total_equity: number;
  };
  totals: {
    total_assets: number;
    total_liabilities: number;
    total_equity: number;
    total_liabilities_and_equity: number;
  };
  is_balanced: boolean;
}

interface IncomeStatementData {
  period: {
    start_date: string;
    end_date: string;
    period_type: string;
  };
  revenue: {
    platform_fees: {
      food_delivery: number;
      rideshare: number;
      total: number;
    };
    delivery_fees: number;
    total_revenue: number;
  };
  cost_of_revenue: {
    driver_payments: number;
    payment_processing: number;
    total_cost_of_revenue: number;
  };
  gross_profit: number;
  gross_margin_percent: number;
  operating_expenses: {
    technology_infrastructure: number;
    marketing: number;
    general_administrative: number;
    total_operating_expenses: number;
  };
  operating_income: number;
  net_income: number;
  net_margin_percent: number;
  metrics: {
    total_orders: number;
    total_rides: number;
    average_order_value: number;
    revenue_per_order: number;
  };
}

interface TrialBalanceData {
  as_of_date: string;
  accounts: Array<{
    account_code: string;
    account_name: string;
    total_debit: number;
    total_credit: number;
    net_balance: number;
    account_type?: string;
    category?: string;
  }>;
  totals: {
    total_debits: number;
    total_credits: number;
    difference: number;
  };
  is_balanced: boolean;
}

interface CashFlowData {
  period: {
    start_date: string;
    end_date: string;
  };
  operating_activities: {
    cash_received_from_customers: number;
    cash_paid_to_drivers: number;
    cash_paid_to_restaurants: number;
    payment_processing_fees: number;
    net_cash_from_operations: number;
  };
  investing_activities: {
    equipment_purchases: number;
    net_cash_from_investing: number;
  };
  financing_activities: {
    equity_investments: number;
    net_cash_from_financing: number;
  };
  net_change_in_cash: number;
  beginning_cash_balance: number;
  ending_cash_balance: number;
}

interface ChartOfAccountsData {
  assets: Array<{ code: string; name: string; type: string; category: string; normal_balance: string }>;
  liabilities: Array<{ code: string; name: string; type: string; category: string; normal_balance: string }>;
  equity: Array<{ code: string; name: string; type: string; category: string; normal_balance: string }>;
  revenue: Array<{ code: string; name: string; type: string; category: string; normal_balance: string }>;
  expenses: Array<{ code: string; name: string; type: string; category: string; normal_balance: string }>;
}

const AccountingDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('balance-sheet');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('month');
  const [asOfDate, setAsOfDate] = useState(dayjs());

  // Data states
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetData | null>(null);
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatementData | null>(null);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceData | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowData | null>(null);
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccountsData | null>(null);

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab, period, asOfDate]);

  const fetchData = async (tab: string) => {
    setLoading(true);
    setError(null);
    try {
      // Try multiple token keys for compatibility
      const token = localStorage.getItem('token') || localStorage.getItem('id_token') || localStorage.getItem('access_token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        setLoading(false);
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };

      switch (tab) {
        case 'balance-sheet':
          const bsRes = await api.get('/admin/accounting/balance-sheet', {
            params: { as_of_date: asOfDate.format('YYYY-MM-DD') },
            headers
          });
          console.log('Balance Sheet Response:', bsRes.data);
          setBalanceSheet(bsRes.data.balance_sheet);
          break;

        case 'income-statement':
          const isRes = await api.get('/admin/accounting/income-statement', {
            params: { period },
            headers
          });
          console.log('Income Statement Response:', isRes.data);
          setIncomeStatement(isRes.data.income_statement);
          break;

        case 'trial-balance':
          const tbRes = await api.get('/admin/accounting/trial-balance', {
            params: { as_of_date: asOfDate.format('YYYY-MM-DD') },
            headers
          });
          console.log('Trial Balance Response:', tbRes.data);
          setTrialBalance(tbRes.data.trial_balance);
          break;

        case 'cash-flow':
          const cfRes = await api.get('/admin/accounting/cash-flow', { headers });
          console.log('Cash Flow Response:', cfRes.data);
          setCashFlow(cfRes.data.cash_flow_statement);
          break;

        case 'chart-of-accounts':
          const coaRes = await api.get('/admin/accounting/chart-of-accounts', { headers });
          console.log('Chart of Accounts Response:', coaRes.data);
          setChartOfAccounts(coaRes.data.grouped);
          break;
      }
    } catch (err: any) {
      console.error('Error fetching accounting data:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to load data';
      setError(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const renderBalanceSheet = () => {
    if (loading) return <div className="flex justify-center py-12"><Spin size="large" /></div>;
    if (error) return <Alert message="Error" description={error} type="error" showIcon />;
    if (!balanceSheet) return <Alert message="No Data" description="No balance sheet data available. Check if there are completed orders in the system." type="info" showIcon />;

    return (
      <div className="balance-sheet">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Balance Sheet</h2>
          <div className="flex items-center gap-2">
            <span>As of:</span>
            <DatePicker
              value={asOfDate}
              onChange={(date) => date && setAsOfDate(date)}
            />
          </div>
        </div>

        {balanceSheet.is_balanced ? (
          <Alert
            message="Books are balanced"
            description="Assets = Liabilities + Equity"
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            className="mb-4"
          />
        ) : (
          <Alert
            message="Books are NOT balanced"
            description="There is a discrepancy in the accounting equation"
            type="error"
            showIcon
            icon={<WarningOutlined />}
            className="mb-4"
          />
        )}

        <Row gutter={24}>
          {/* Assets */}
          <Col span={12}>
            <Card title="ASSETS" className="mb-4">
              <div className="font-semibold text-lg mb-2">Current Assets</div>
              <div className="flex justify-between py-1">
                <span>Cash - Stripe</span>
                <span>{formatCurrency(balanceSheet.assets.current_assets.cash_stripe)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Accounts Receivable</span>
                <span>{formatCurrency(balanceSheet.assets.current_assets.accounts_receivable)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Prepaid Expenses</span>
                <span>{formatCurrency(balanceSheet.assets.current_assets.prepaid_expenses)}</span>
              </div>
              <div className="flex justify-between py-1 font-semibold border-t mt-2 pt-2">
                <span>Total Current Assets</span>
                <span>{formatCurrency(balanceSheet.assets.current_assets.total_current_assets)}</span>
              </div>

              <div className="font-semibold text-lg mb-2 mt-4">Fixed Assets</div>
              <div className="flex justify-between py-1">
                <span>Equipment</span>
                <span>{formatCurrency(balanceSheet.assets.fixed_assets.equipment)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Accumulated Depreciation</span>
                <span>({formatCurrency(Math.abs(balanceSheet.assets.fixed_assets.accumulated_depreciation))})</span>
              </div>
              <div className="flex justify-between py-1 font-semibold border-t mt-2 pt-2">
                <span>Total Fixed Assets</span>
                <span>{formatCurrency(balanceSheet.assets.fixed_assets.total_fixed_assets)}</span>
              </div>

              <div className="flex justify-between py-2 font-bold text-lg border-t-2 mt-4 pt-2 bg-blue-50 px-2 rounded">
                <span>TOTAL ASSETS</span>
                <span>{formatCurrency(balanceSheet.assets.total_assets)}</span>
              </div>
            </Card>
          </Col>

          {/* Liabilities & Equity */}
          <Col span={12}>
            <Card title="LIABILITIES" className="mb-4">
              <div className="font-semibold text-lg mb-2">Current Liabilities</div>
              <div className="flex justify-between py-1">
                <span>Accounts Payable - Restaurants</span>
                <span>{formatCurrency(balanceSheet.liabilities.current_liabilities.accounts_payable_restaurants)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Accounts Payable - Drivers</span>
                <span>{formatCurrency(balanceSheet.liabilities.current_liabilities.accounts_payable_drivers)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Sales Tax Payable</span>
                <span>{formatCurrency(balanceSheet.liabilities.current_liabilities.sales_tax_payable)}</span>
              </div>
              <div className="flex justify-between py-1 font-semibold border-t mt-2 pt-2">
                <span>Total Current Liabilities</span>
                <span>{formatCurrency(balanceSheet.liabilities.current_liabilities.total_current_liabilities)}</span>
              </div>

              <div className="flex justify-between py-2 font-bold border-t mt-4 pt-2">
                <span>TOTAL LIABILITIES</span>
                <span>{formatCurrency(balanceSheet.liabilities.total_liabilities)}</span>
              </div>
            </Card>

            <Card title="EQUITY">
              <div className="flex justify-between py-1">
                <span>Common Stock</span>
                <span>{formatCurrency(balanceSheet.equity.common_stock)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Retained Earnings</span>
                <span>{formatCurrency(balanceSheet.equity.retained_earnings)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Current Period Earnings</span>
                <span>{formatCurrency(balanceSheet.equity.current_period_earnings)}</span>
              </div>
              <div className="flex justify-between py-2 font-bold border-t mt-2 pt-2">
                <span>TOTAL EQUITY</span>
                <span>{formatCurrency(balanceSheet.equity.total_equity)}</span>
              </div>

              <div className="flex justify-between py-2 font-bold text-lg border-t-2 mt-4 pt-2 bg-green-50 px-2 rounded">
                <span>TOTAL LIABILITIES + EQUITY</span>
                <span>{formatCurrency(balanceSheet.totals.total_liabilities_and_equity)}</span>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  const renderIncomeStatement = () => {
    if (loading) return <div className="flex justify-center py-12"><Spin size="large" /></div>;
    if (error) return <Alert message="Error" description={error} type="error" showIcon />;
    if (!incomeStatement) return <Alert message="No Data" description="No income statement data available. Check if there are completed orders in the system." type="info" showIcon />;

    return (
      <div className="income-statement">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Income Statement (P&L)</h2>
          <Select value={period} onChange={setPeriod} style={{ width: 150 }}>
            <Option value="week">Last Week</Option>
            <Option value="month">This Month</Option>
            <Option value="quarter">This Quarter</Option>
            <Option value="year">This Year</Option>
          </Select>
        </div>

        <Row gutter={16} className="mb-6">
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Revenue"
                value={incomeStatement.revenue.total_revenue}
                precision={2}
                prefix="$"
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Gross Profit"
                value={incomeStatement.gross_profit}
                precision={2}
                prefix="$"
                suffix={<span className="text-sm">({incomeStatement.gross_margin_percent}%)</span>}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Net Income"
                value={incomeStatement.net_income}
                precision={2}
                prefix="$"
                valueStyle={{ color: incomeStatement.net_income >= 0 ? '#3f8600' : '#cf1322' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Net Margin"
                value={incomeStatement.net_margin_percent}
                precision={2}
                suffix="%"
              />
            </Card>
          </Col>
        </Row>

        <Card className="mb-4">
          <div className="font-bold text-lg mb-3 text-green-700">REVENUE</div>
          <div className="ml-4">
            <div className="font-semibold mb-2">Platform Fees</div>
            <div className="flex justify-between py-1 ml-4">
              <span>Food Delivery Platform Fees</span>
              <span>{formatCurrency(incomeStatement.revenue.platform_fees.food_delivery)}</span>
            </div>
            <div className="flex justify-between py-1 ml-4">
              <span>Rideshare Platform Fees</span>
              <span>{formatCurrency(incomeStatement.revenue.platform_fees.rideshare)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Delivery Fee Revenue</span>
              <span>{formatCurrency(incomeStatement.revenue.delivery_fees)}</span>
            </div>
          </div>
          <div className="flex justify-between py-2 font-bold border-t mt-2 pt-2 text-green-700">
            <span>TOTAL REVENUE</span>
            <span>{formatCurrency(incomeStatement.revenue.total_revenue)}</span>
          </div>
        </Card>

        <Card className="mb-4">
          <div className="font-bold text-lg mb-3 text-red-700">COST OF REVENUE</div>
          <div className="ml-4">
            <div className="flex justify-between py-1">
              <span>Driver Payments</span>
              <span>({formatCurrency(incomeStatement.cost_of_revenue.driver_payments)})</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Payment Processing Fees (Stripe)</span>
              <span>({formatCurrency(incomeStatement.cost_of_revenue.payment_processing)})</span>
            </div>
          </div>
          <div className="flex justify-between py-2 font-bold border-t mt-2 pt-2 text-red-700">
            <span>TOTAL COST OF REVENUE</span>
            <span>({formatCurrency(incomeStatement.cost_of_revenue.total_cost_of_revenue)})</span>
          </div>
        </Card>

        <Card className="mb-4 bg-blue-50">
          <div className="flex justify-between py-2 font-bold text-lg">
            <span>GROSS PROFIT</span>
            <span>{formatCurrency(incomeStatement.gross_profit)} ({incomeStatement.gross_margin_percent}%)</span>
          </div>
        </Card>

        <Card className="mb-4">
          <div className="font-bold text-lg mb-3 text-orange-700">OPERATING EXPENSES</div>
          <div className="ml-4">
            <div className="flex justify-between py-1">
              <span>Technology & Infrastructure</span>
              <span>({formatCurrency(incomeStatement.operating_expenses.technology_infrastructure)})</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Marketing</span>
              <span>({formatCurrency(incomeStatement.operating_expenses.marketing)})</span>
            </div>
            <div className="flex justify-between py-1">
              <span>General & Administrative</span>
              <span>({formatCurrency(incomeStatement.operating_expenses.general_administrative)})</span>
            </div>
          </div>
          <div className="flex justify-between py-2 font-bold border-t mt-2 pt-2 text-orange-700">
            <span>TOTAL OPERATING EXPENSES</span>
            <span>({formatCurrency(incomeStatement.operating_expenses.total_operating_expenses)})</span>
          </div>
        </Card>

        <Card className={incomeStatement.net_income >= 0 ? 'bg-green-50' : 'bg-red-50'}>
          <div className="flex justify-between py-2 font-bold text-xl">
            <span>NET INCOME</span>
            <span className={incomeStatement.net_income >= 0 ? 'text-green-700' : 'text-red-700'}>
              {formatCurrency(incomeStatement.net_income)}
            </span>
          </div>
        </Card>

        <Card className="mt-4" title="Key Metrics">
          <Row gutter={16}>
            <Col span={6}>
              <Statistic title="Total Orders" value={incomeStatement.metrics.total_orders} />
            </Col>
            <Col span={6}>
              <Statistic title="Total Rides" value={incomeStatement.metrics.total_rides} />
            </Col>
            <Col span={6}>
              <Statistic title="Avg Order Value" value={incomeStatement.metrics.average_order_value} prefix="$" precision={2} />
            </Col>
            <Col span={6}>
              <Statistic title="Revenue/Order" value={incomeStatement.metrics.revenue_per_order} prefix="$" precision={2} />
            </Col>
          </Row>
        </Card>
      </div>
    );
  };

  const renderTrialBalance = () => {
    if (loading) return <div className="flex justify-center py-12"><Spin size="large" /></div>;
    if (error) return <Alert message="Error" description={error} type="error" showIcon />;
    if (!trialBalance) return <Alert message="No Data" description="No trial balance data available." type="info" showIcon />;

    const columns = [
      { title: 'Account Code', dataIndex: 'account_code', key: 'account_code', width: 120 },
      { title: 'Account Name', dataIndex: 'account_name', key: 'account_name' },
      {
        title: 'Type',
        dataIndex: 'account_type',
        key: 'account_type',
        render: (type: string) => (
          <Tag color={
            type === 'asset' ? 'blue' :
            type === 'liability' ? 'orange' :
            type === 'equity' ? 'purple' :
            type === 'revenue' ? 'green' : 'red'
          }>
            {type?.toUpperCase()}
          </Tag>
        )
      },
      {
        title: 'Debit',
        dataIndex: 'total_debit',
        key: 'total_debit',
        align: 'right' as const,
        render: (val: number) => val > 0 ? formatCurrency(val) : '-'
      },
      {
        title: 'Credit',
        dataIndex: 'total_credit',
        key: 'total_credit',
        align: 'right' as const,
        render: (val: number) => val > 0 ? formatCurrency(val) : '-'
      },
      {
        title: 'Balance',
        dataIndex: 'net_balance',
        key: 'net_balance',
        align: 'right' as const,
        render: (val: number) => (
          <span className={val >= 0 ? 'text-green-600' : 'text-red-600'}>
            {formatCurrency(val)}
          </span>
        )
      },
    ];

    return (
      <div className="trial-balance">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Trial Balance</h2>
          <DatePicker
            value={asOfDate}
            onChange={(date) => date && setAsOfDate(date)}
          />
        </div>

        {trialBalance.is_balanced ? (
          <Alert
            message="Trial Balance is Balanced"
            description={`Total Debits: ${formatCurrency(trialBalance.totals.total_debits)} = Total Credits: ${formatCurrency(trialBalance.totals.total_credits)}`}
            type="success"
            showIcon
            className="mb-4"
          />
        ) : (
          <Alert
            message="Trial Balance is NOT Balanced"
            description={`Difference: ${formatCurrency(trialBalance.totals.difference)}`}
            type="error"
            showIcon
            className="mb-4"
          />
        )}

        <Table
          columns={columns}
          dataSource={trialBalance.accounts}
          rowKey="account_code"
          pagination={false}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row className="bg-gray-100 font-bold">
                <Table.Summary.Cell index={0} colSpan={3}>TOTALS</Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  {formatCurrency(trialBalance.totals.total_debits)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  {formatCurrency(trialBalance.totals.total_credits)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  {formatCurrency(trialBalance.totals.difference)}
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </div>
    );
  };

  const renderCashFlow = () => {
    if (loading) return <div className="flex justify-center py-12"><Spin size="large" /></div>;
    if (error) return <Alert message="Error" description={error} type="error" showIcon />;
    if (!cashFlow) return <Alert message="No Data" description="No cash flow data available." type="info" showIcon />;

    return (
      <div className="cash-flow">
        <h2 className="text-xl font-semibold mb-4">Cash Flow Statement</h2>

        <Card className="mb-4" title="Operating Activities">
          <div className="flex justify-between py-1">
            <span>Cash Received from Customers</span>
            <span className="text-green-600">{formatCurrency(cashFlow.operating_activities.cash_received_from_customers)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Cash Paid to Drivers</span>
            <span className="text-red-600">{formatCurrency(cashFlow.operating_activities.cash_paid_to_drivers)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Cash Paid to Restaurants</span>
            <span className="text-red-600">{formatCurrency(cashFlow.operating_activities.cash_paid_to_restaurants)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Payment Processing Fees</span>
            <span className="text-red-600">{formatCurrency(cashFlow.operating_activities.payment_processing_fees)}</span>
          </div>
          <div className="flex justify-between py-2 font-bold border-t mt-2 pt-2">
            <span>Net Cash from Operating Activities</span>
            <span className={cashFlow.operating_activities.net_cash_from_operations >= 0 ? 'text-green-600' : 'text-red-600'}>
              {formatCurrency(cashFlow.operating_activities.net_cash_from_operations)}
            </span>
          </div>
        </Card>

        <Card className="mb-4" title="Investing Activities">
          <div className="flex justify-between py-1">
            <span>Equipment Purchases</span>
            <span>{formatCurrency(cashFlow.investing_activities.equipment_purchases)}</span>
          </div>
          <div className="flex justify-between py-2 font-bold border-t mt-2 pt-2">
            <span>Net Cash from Investing Activities</span>
            <span>{formatCurrency(cashFlow.investing_activities.net_cash_from_investing)}</span>
          </div>
        </Card>

        <Card className="mb-4" title="Financing Activities">
          <div className="flex justify-between py-1">
            <span>Equity Investments</span>
            <span>{formatCurrency(cashFlow.financing_activities.equity_investments)}</span>
          </div>
          <div className="flex justify-between py-2 font-bold border-t mt-2 pt-2">
            <span>Net Cash from Financing Activities</span>
            <span>{formatCurrency(cashFlow.financing_activities.net_cash_from_financing)}</span>
          </div>
        </Card>

        <Card className="bg-blue-50">
          <div className="flex justify-between py-1">
            <span>Beginning Cash Balance</span>
            <span>{formatCurrency(cashFlow.beginning_cash_balance)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Net Change in Cash</span>
            <span className={cashFlow.net_change_in_cash >= 0 ? 'text-green-600' : 'text-red-600'}>
              {formatCurrency(cashFlow.net_change_in_cash)}
            </span>
          </div>
          <div className="flex justify-between py-2 font-bold text-lg border-t mt-2 pt-2">
            <span>Ending Cash Balance</span>
            <span>{formatCurrency(cashFlow.ending_cash_balance)}</span>
          </div>
        </Card>
      </div>
    );
  };

  const renderChartOfAccounts = () => {
    if (loading) return <div className="flex justify-center py-12"><Spin size="large" /></div>;
    if (error) return <Alert message="Error" description={error} type="error" showIcon />;
    if (!chartOfAccounts) return <Alert message="No Data" description="No chart of accounts data available." type="info" showIcon />;

    const columns = [
      { title: 'Code', dataIndex: 'code', key: 'code', width: 100 },
      { title: 'Account Name', dataIndex: 'name', key: 'name' },
      { title: 'Category', dataIndex: 'category', key: 'category' },
      {
        title: 'Normal Balance',
        dataIndex: 'normal_balance',
        key: 'normal_balance',
        render: (val: string) => (
          <Tag color={val === 'debit' ? 'blue' : 'green'}>{val.toUpperCase()}</Tag>
        )
      },
    ];

    const renderSection = (title: string, data: any[], color: string) => (
      <Card title={<span style={{ color }}>{title}</span>} className="mb-4">
        <Table
          columns={columns}
          dataSource={data}
          rowKey="code"
          pagination={false}
          size="small"
        />
      </Card>
    );

    return (
      <div className="chart-of-accounts">
        <h2 className="text-xl font-semibold mb-4">Chart of Accounts</h2>
        {renderSection('ASSETS (1xxx)', chartOfAccounts.assets, '#1890ff')}
        {renderSection('LIABILITIES (2xxx)', chartOfAccounts.liabilities, '#fa8c16')}
        {renderSection('EQUITY (3xxx)', chartOfAccounts.equity, '#722ed1')}
        {renderSection('REVENUE (4xxx)', chartOfAccounts.revenue, '#52c41a')}
        {renderSection('EXPENSES (5xxx-6xxx)', chartOfAccounts.expenses, '#f5222d')}
      </div>
    );
  };

  return (
    <div className="accounting-dashboard">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Accounting & Financial Reports</h1>
        <Button
          icon={<SyncOutlined spin={loading} />}
          onClick={() => fetchData(activeTab)}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>

      <Spin spinning={loading}>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane
            tab={<span><BankOutlined /> Balance Sheet</span>}
            key="balance-sheet"
          >
            {renderBalanceSheet()}
          </TabPane>

          <TabPane
            tab={<span><LineChartOutlined /> Income Statement</span>}
            key="income-statement"
          >
            {renderIncomeStatement()}
          </TabPane>

          <TabPane
            tab={<span><FileTextOutlined /> Trial Balance</span>}
            key="trial-balance"
          >
            {renderTrialBalance()}
          </TabPane>

          <TabPane
            tab={<span><DollarOutlined /> Cash Flow</span>}
            key="cash-flow"
          >
            {renderCashFlow()}
          </TabPane>

          <TabPane
            tab={<span><FileTextOutlined /> Chart of Accounts</span>}
            key="chart-of-accounts"
          >
            {renderChartOfAccounts()}
          </TabPane>
        </Tabs>
      </Spin>
    </div>
  );
};

export default AccountingDashboard;
