import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Filter, FileSpreadsheet, Building2, ExternalLink, Eye } from 'lucide-react'; // Download, Search, 
import Button from '../../components/ui/Button';
import TransactionStatusBadge from '../../components/transactions/TransactionStatusBadge';
import EditTransactionModal from '../../components/transactions/EditTransactionModal';
import { CoupaTransaction } from '../../constants/types';
import { dateRangeOptions } from '../../constants/consts';
import Bridge from '../../constants/Bridge';
import { Input, Select, Pagination, Spin, Button as FilterButton, InputNumber } from 'antd';
// import cupa tables
import CupaRequisition from './cupaTables/Requisition';
import CupaPurchaseOrder from './cupaTables/PurchaseOrder';
import CupaInvoiceTable from './cupaTables/Invoice';
import CupaPayments from './cupaTables/Payments';
import CupaAll from './cupaTables/All';
import moment from 'moment';
interface TransactionsProps {
  initialSystem?: "coupa" | "netsuite";
  showSystemTabs?: boolean;
}

const { Option } = Select;

const Main: React.FC<TransactionsProps> = ({
  initialSystem = "coupa",
  showSystemTabs = true,
}) => {
  const location = useLocation();
  const [dateRange, setDateRange] = useState('2years');
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeSystem, setActiveSystem] = useState<"coupa" | "netsuite">(initialSystem ?? "coupa");
  const [activeTransactionType, setActiveTransactionType] = useState('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<CoupaTransaction | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [dashboardCount, setDashboardCount] = useState<{ label: string; count: number; color: string; }[]>([]);
  const [coupaData, setCoupaData] = useState<Array<CoupaTransaction>>([]);
  const [netsuiteData, setNetsuiteData] = useState<Array<CoupaTransaction>>([]);
  const [transactionCounts, setTransactionCounts] = useState<any>(null);
  
  // coupa filter data states  
  const [userList, setUserList] = useState<string[]>([]);
  const [supplierList, setSupplierList] = useState<string[]>([]);
  const [departmentList, setDepartmentList] = useState<string[]>([]);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const daysBack = dateRangeToDaysBack[dateRange];
        if (daysBack) {
          const response = await Bridge.transactions.getCounts(daysBack);
          console.log("Fetched transactionCounts:", response);
          setTransactionCounts(response);
        }
      } catch (error) {
        console.error("Error fetching transaction counts:", error);
      }
    };
    fetchCounts();
  }, [activeSystem, dateRange]);
  // comman dynamic filter data states
  const [statusList, setStatusList] = useState<string[]>([]);
  // netsuite dynamic filter data states
  const [vendorList, setVendorList] = useState<string[]>([]);
  const [locationList, setLocationList] = useState<string[]>([]);
  const [subsidiaryList, setSubsidiaryList] = useState<string[]>([]);

  // Filters state
  const [coupaFilters, setCoupaFilters] = useState({
    forEmployee: null as string[] | null,
    type: '',
    department: '',
    supplier: '',
    user: '',
    status: '',
    purchaseOrderSupplier: null as string[] | null,
    invoiceAmountMin: 0,
    invoiceAmountMax: 0,
    invoicePaymentTerms: '',

    paymentStatus: '',
    paymentFromDate: '',
    paymentToDate: '',
    paymentReceivingLocation: '',
    paymentPurchaseOrder: '',
    paymentReceivedBy: '',
    searchById: '',
  });

  const [netsuiteFilters, setNetsuiteFilters] = useState({
    subsidiary: '',
    vendor: '',
    location: '',
    status: '',
    fromDate: '',
    toDate: '',
    amountMin: 0,
    amountMax: 0,
    forEmployee: null as string[] | null
  });

  const systemTabs = [
    { id: 'coupa', name: 'Coupa Transactions', icon: <FileSpreadsheet className="h-5 w-5" /> },
    { id: 'netsuite', name: 'NetSuite Transactions', icon: <Building2 className="h-5 w-5" /> }
  ];

  const coupaTransactionTypes = [
    { id: 'all', name: 'All' },
    { id: 'purchase_order', name: 'Purchase Orders' },
    { id: 'invoice', name: 'Invoices' },
    { id: 'requisition', name: 'Requisitions' },
    { id: 'payments', name: 'Payments' }
  ];

  const netsuiteTransactionTypes = [
    { id: 'all', name: 'All' },
    { id: 'purchase_order', name: 'Purchase Orders' },
    { id: 'bill', name: 'Bills' },
    { id: 'bill_payment', name: 'Bill Payments' }
  ];
  
  useEffect(() => {
    setActiveSystem(initialSystem);
  }, [initialSystem]);

  // reset transaction type to 'all' whenever the active system changes
  useEffect(() => {
    const params          = new URLSearchParams(location.search);

    const typeParam       = params.get("type");
    
    const dateRangeParam  = params.get("dateRange");

    if (typeParam) {
      setActiveTransactionType(typeParam);
    } else {
      setActiveTransactionType('all');
    }

    if (dateRangeParam) {
      setDateRange(dateRangeParam);
    }
    
    setCurrentPage(1);
  }, [activeSystem, location.search]);

  const getFilteredNetsuiteRecords = () => {
    let records = netsuiteData || [];
    
    return records;
  };

  const getFilteredCoupaRecords = () => {
    let records = coupaData || [];

    if (activeTransactionType !== 'all') {
      records = records.filter(t => t.Type.toLowerCase().replace(' ', '_') === activeTransactionType);
    }

    // Normalize filter: lowercase + safe underscore to space replacement
    const normalizedStatus = activeStatusFilter?.toLowerCase()
        .split("_") // avoids regex, cleaner for Sonar
        .join(" ");

    const filteredByStatus = records.filter((item) => {
      const itemStatus = (item["Status"] || "")
      .toLowerCase()
      .split("_")
      .join(" ");

      return itemStatus.includes(normalizedStatus);
    });

    return filteredByStatus;
  };

  const getCurrentTransactionTypes = () => {
    return activeSystem === 'coupa' ? coupaTransactionTypes : netsuiteTransactionTypes;
  };
  
  // start - Coupa Filters -- Individual renderers for each transaction type
  const renderDefaultFilters = () => (
    <>
      <div>
        <label
          htmlFor="poNumber"
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          Search By ID
        </label>
        <Input
          id="poNumber"
          placeholder="Enter Number..."
          value={coupaFilters.searchById || ""}
          onChange={(e) =>
            setCoupaFilters((prev) => ({
              ...prev,
              searchById: e.target.value,
            }))
          }
          className="w-full"
        />
      </div>

      <div>
        <label htmlFor="users" className="block text-sm font-medium text-neutral-700 mb-1">
          Users
        </label>
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="Select multiple Users"
          onChange={(e) => setCoupaFilters(prev => ({ ...prev, forEmployee: e }))}
          maxTagCount={1}
        >
          {userList.map((item) => (
            <Option key={item} value={item}>{item}</Option>
          ))}
        </Select>
      </div>

      <div>
        <label
          htmlFor="supplier"
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          Suppliers
        </label>
        <Select
          mode="multiple"
          style={{ width: "100%" }}
          placeholder="Select multiple Suppliers"
          onChange={(e) =>
            setCoupaFilters((prev) => ({
              ...prev,
              purchaseOrderSupplier: e,
            }))
          }
          maxTagCount={1}
        >
          {supplierList.map((item) => (
            <Option key={item} value={item}>
              {item}
            </Option>
          ))}
        </Select>
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-neutral-700 mb-1">
          Status
        </label>
        <Select
          id="status"
          value={coupaFilters.status || ""}
          onChange={(value) =>
            setCoupaFilters((prev) => ({
              ...prev,
              status: value,
            }))
          }
          className="w-full"
          placeholder="All Statuses"
          allowClear
        >
          <Option value="">All Statuses</Option>
          {statusList.map((status) => (
            <Option key={status} value={status}>
              {status}
            </Option>
          ))}
        </Select>
      </div>

      <div>
        <label
          htmlFor="department"
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          Cost Centers
        </label>
        <Select
          id="department"
          value={coupaFilters.department || ""}
          onChange={(value) =>
            setCoupaFilters((prev) => ({
              ...prev,
              department: value,
            }))
          }
          className="w-full"
          placeholder="All Cost Centers"
          allowClear
        >
          <Option value="">All Cost Centers</Option>
          {departmentList.map((department) => (
            <Option key={department} value={department}>
              {department}
            </Option>
          ))}
        </Select>
      </div>

      <div>
        <label htmlFor="invoiceAmountRange" className="block text-sm font-medium text-neutral-700 mb-1">Amount Range</label>

        <div className="flex space-x-2">
          <InputNumber
            id="invoiceAmountMin"
            placeholder="Min"
            className="w-full"
            style={{ width: "100%" }}
            min={0}
            value={coupaFilters.invoiceAmountMin}
            onChange={(value) =>
              setCoupaFilters((prev) => ({
                ...prev,
                invoiceAmountMin: value ?? 0,
              }))
            }
          />

          <InputNumber
            id="invoiceAmountMax"
            placeholder="Max"
            className="w-full"
            style={{ width: "100%" }}
            min={0}
            value={coupaFilters.invoiceAmountMax}
            onChange={(value) =>
              setCoupaFilters((prev) => ({
                ...prev,
                invoiceAmountMax: value ?? 0,
              }))
            }
          />
        </div>
      </div>
    </>
  );

  // Final unified renderer
  const renderCoupaFilters = () => {
    const content = renderDefaultFilters();

    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {content}

        <div className="mt-6 md:col-span-1">
          <FilterButton
            id="filterCoupaSubmitBtn"
            type="primary"
            style={{ background: "#ea580c", width: "fit-content", padding: "0 24px" }}
            onClick={handleCoupaFilterSubmit}
          >
            Submit
          </FilterButton>
        </div>
      </div>
    );
  };
  // end - Coupa Filters

  const renderNetSuiteFilters = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Subsidiary */}
      <div>
        <label
          htmlFor="subsidiary"
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          Subsidiaries
        </label>
        <Select
          id="subsidiary"
          value={netsuiteFilters.subsidiary || ""}
          onChange={(value) =>
            setNetsuiteFilters((prev) => ({
              ...prev,
              subsidiary: value,
            }))
          }
          className="w-full"
          placeholder="All Subsidiaries"
          allowClear
        >
          <Option value="">All Subsidiaries</Option>
          {subsidiaryList.map((subsidiary) => (
            <Option key={subsidiary} value={subsidiary}>
              {subsidiary}
            </Option>
          ))}
        </Select>
      </div>

      {/* Vendor */}
      <div>
        <label
          htmlFor="vendor"
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          Vendors
        </label>
        <Select
          id="vendor"
          value={netsuiteFilters.vendor || ""}
          onChange={(value) =>
            setNetsuiteFilters((prev) => ({
              ...prev,
              vendor: value,
            }))
          }
          className="w-full"
          placeholder="All Vendors"
          allowClear
        >
          <Option value="">All Vendors</Option>
          {vendorList.map((vendor) => (
            <Option key={vendor} value={vendor}>
              {vendor}
            </Option>
          ))}
        </Select>
      </div>

      {/* Location */}
      <div>
        <label
          htmlFor="location"
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          Locations
        </label>
        <Select
          id="location"
          value={netsuiteFilters.location || ""}
          onChange={(value) =>
            setNetsuiteFilters((prev) => ({
              ...prev,
              location: value,
            }))
          }
          className="w-full"
          placeholder="All Locations"
          allowClear
        >
          <Option value="">All Locations</Option>
          {locationList.map((location) => (
            <Option key={location} value={location}>
              {location}
            </Option>
          ))}
        </Select>
      </div>

      {/* Status */}
      <div>
        <label
          htmlFor="netsuiteStatus"
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          Status
        </label>
        <Select
          id="netsuiteStatus"
          value={netsuiteFilters.status || ""}
          onChange={(value) =>
            setNetsuiteFilters((prev) => ({
              ...prev,
              status: value,
            }))
          }
          className="w-full"
          placeholder="All Statuses"
          allowClear
        >
          <Option value="">All Statuses</Option>
          {statusList.map((status) => (
            <Option key={status} value={status}>
              {status}
            </Option>
          ))}
        </Select>
      </div>
      
      {/* Users */}
      <div>
        <label htmlFor="users" className="block text-sm font-medium text-neutral-700 mb-1">
          Users
        </label>
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="Select multiple Users"
          onChange={(e) => setNetsuiteFilters(prev => ({ ...prev, forEmployee: e }))}
          maxTagCount={1}
        >
          {userList.map((item) => (
            <Option key={item} value={item}>{item}</Option>
          ))}
        </Select>
      </div>
      
      <div className="mt-6 md:col-span-1">
          <FilterButton
            id="filterNetsuiteSubmitBtn"
            type="primary"
            onClick={handleNetsuiteFilterSubmit}
            style={{ background: "#ea580c", width: "fit-content", padding: "0 24px" }}
          >
            Submit
          </FilterButton>
        </div>
    </div>
  );

  const renderCoupaActions = () => (
    <div className="flex items-center space-x-2">
      {/* Removed action buttons as requested */}
    </div>
  );

  const renderNetSuiteActions = () => {
    return (
      <div className="flex items-center space-x-2">
        {/* Removed action buttons as requested */}
      </div>
    );
  };

  const renderCoupaTable = () => {
    const type = activeTransactionType;

    if (type === 'all') {
      return <CupaAll 
      records={paginatedRecords} 
      coupaFilters={coupaFilters}
      activeTransactionType={activeTransactionType}
      />;
    } else if (type === 'purchase_order') {
      return (
        <CupaPurchaseOrder
          records={paginatedRecords}
          coupaFilters={coupaFilters}
          activeTransactionType={activeTransactionType}
        />
      );
    } else if (type === 'requisition') {
      return (
        <CupaRequisition
          records={paginatedRecords}
          coupaFilters={coupaFilters}
          activeTransactionType={activeTransactionType}
        />
      );
    } else if (type === 'invoice') {
      return (
        <CupaInvoiceTable
          records={paginatedRecords}
          coupaFilters={coupaFilters}
          activeTransactionType={activeTransactionType}
        />
      );
    } else if (type === 'payments') {
      return (
        <CupaPayments
          records={paginatedRecords}
          coupaFilters={coupaFilters}
          activeTransactionType={activeTransactionType}
        />
      );
    } else {
      return null;
    }
  };

  const renderNetSuiteTable = () => {
    const transactions = paginatedRecords;
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                NetSuite ID
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Number
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Type
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Vendor
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Subsidiary
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Location
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Amount
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Date
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Due Date
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-200">
            {transactions.map((transaction: any) => (
              <tr key={`${transaction['NetSuite ID']}-${transaction['For_Employee']}`} className="hover:bg-neutral-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">
                  {transaction['NetSuite ID']}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-600">
                  {transaction['Number']}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 capitalize">
                  {transaction['Type']}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                  {transaction['Vendor'] ? transaction['Vendor'] : "---"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                  {transaction['Subsidiary'] ? transaction['Subsidiary'] : "---"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                  {transaction['Location'] ? transaction['Location'] : "---"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                  ${transaction['Amount'] ? transaction['Amount'] : 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <TransactionStatusBadge status={transaction['Status']} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                  {transaction['Date'] ? moment(transaction['Date']).format('YYYY-MM-DD') : "---"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                  {transaction['Due Date'] ? moment(transaction['Due Date']).format('YYYY-MM-DD') : "---"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Eye size={14} />}
                      onClick={() => {
                        setSelectedTransaction(transaction);
                        setShowEditModal(true);
                      }}
                    >
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<ExternalLink size={14} />}
                      onClick={() => window.open(`https://netsuite.com/transactions/${transaction['NetSuite ID']}`, '_blank')}
                    >
                      Open in NetSuite
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const dateRangeToDaysBack: { [key: string]: number } = {
    'week': 7,
    'month': 30,
    'quarter': 90,
    'year': 365,
    '2years': 800,
  };

  // fetchCounts needs to be a separate function that returns a promise
  const fetchCounts = async (daysBack: number) => {
    try {
      const response = await Bridge.transactions.getCounts(daysBack);
      console.log("Fetched transactionCounts:", response);
      setTransactionCounts(response);
      return response;
    } catch (error) {
      console.error("Error fetching transaction counts:", error);
      throw error; // Re-throw to propagate error to Promise.all
    }
  };

  useEffect(() => {
    console.log('Transactions Main.tsx - dateRange in useEffect:', dateRange); // Added console.log
    const offset = (currentPage - 1) * itemsPerPage;
    const daysBack = dateRangeToDaysBack[dateRange];
    console.log({ dateRange, daysBack });

    if (daysBack) {
      setIsLoading(true); // Set loading true once for all fetches

      const fetchPromises = [];
      if (activeSystem === "coupa") {
        fetchPromises.push(getCoupaTransactions(daysBack, itemsPerPage, offset));
      } else {
        fetchPromises.push(getNetsuiteTransactions(daysBack, itemsPerPage, offset));
      }
      fetchPromises.push(fetchCounts(daysBack)); // Assuming fetchCounts also returns a promise

      Promise.all(fetchPromises)
        .then(() => {
          setIsLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching transactions data:", error);
          setIsLoading(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSystem, currentPage, itemsPerPage, dateRange]);



  useEffect(() => {
    if (transactionCounts) { // Only call if transactionCounts is available
      getDashboardCounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSystem, coupaData, netsuiteData, transactionCounts]);

   const handleCounterClick = (item: any) => {
    if (item.transactionType) {
      // Switch to the specific transaction type
      setActiveTransactionType(item.transactionType);
      setActiveStatusFilter("");
    } else if (item.statusFilter) {
      // For status-based filtering, we need to implement status filtering logic
      // For now, we'll show all transactions and let the user use the status filter
      setActiveTransactionType("all");
      // You could also implement status filtering here if needed
      setActiveStatusFilter(item.statusFilter);
    }
   };

  const getDashboardCounts = () => {
    const transactions: any[] = activeSystem === 'coupa' ? coupaData : netsuiteData;

    const getType   = (t: any)    => (t.type ?? t.Type ?? '').toString().toLowerCase().split(' ').join('_').split('\t').join('_');
    const getStatus = (t: any)  => (t.status ?? t.Status ?? '').toString().toLowerCase();

    let dashboardData: any[] = [];

    if (activeSystem === 'coupa') {
      console.log("transactionCounts.coupa:", transactionCounts?.coupa);
      if (transactionCounts && transactionCounts.coupa) {
        const coupaCounts = transactionCounts.coupa;
        dashboardData = [
          {
            label: "Purchase Orders",
            count: coupaCounts.purchase_order,
            color: "text-primary-600",
            transactionType: "purchase_order",
          },
          {
            label: "Invoices",
            count: coupaCounts.invoice,
            color: "text-secondary-600",
            transactionType: "invoice",
          },
          {
            label: "Requisitions",
            count: coupaCounts.requisition,
            color: "text-success-600",
            transactionType: "requisition",
          },
          {
            label: "Payments",
            count: coupaCounts.payments, // Assuming payments count is available in transactionCounts.coupa
            color: "text-success-600",
            transactionType: "payments",
          },
          {
            label: "Pending Approval",
            count: coupaCounts.pending_approval,
            color: "text-warning-600",
            transactionType: null,
            statusFilter: "pending_approval",
          },
        ];
      }
    } else {
      console.log("transactionCounts.netsuite:", transactionCounts?.netsuite);
      if (transactionCounts && transactionCounts.netsuite) {
        const netsuiteCounts = transactionCounts.netsuite;
        dashboardData = [
          {
            label: "Purchase Orders",
            count: netsuiteCounts.purchase_order,
            color: "text-primary-600",
            transactionType: "purchase_order",
          },
          {
            label: "Bills",
            count: netsuiteCounts.bill,
            color: "text-secondary-600",
            transactionType: "bill",
          },
          {
            label: "Bill Payments",
            count: netsuiteCounts.bill_payment,
            color: "text-success-600",
            transactionType: "bill_payment",
          },
          {
            label: "Pending Approval",
            count: netsuiteCounts.pending_approval,
            color: "text-warning-600",
            transactionType: null,
            statusFilter: "pending_approval",
          },
        ];
      }
    }

    console.log("Dashboard data before setting state:", dashboardData);
    setDashboardCount(dashboardData);
  };

  const getNetsuiteTransactions = async (daysBack: number, limit: number, offset: number) => {
    try {
      const response = await Bridge.transactions.getNetsuiteTransactions(daysBack, limit, offset);
      const dataToSet = Array.isArray(response.data.data) ? response.data.data : [];
      setNetsuiteData(dataToSet);
      setTotalItems(response.data.total_count);

      // Update filter dropdown lists
      const uniqueSubsidiaries = new Set<string>();
      const uniqueVendors = new Set<string>();
      const uniqueLocations = new Set<string>();
      const uniqueStatus = new Set<string>();
      const uniqueUsers = new Set<string>();

      for (const item of dataToSet) {
        if (item['Subsidiary']) uniqueSubsidiaries.add(item['Subsidiary']);
        if (item['Vendor']) uniqueVendors.add(item['Vendor']);
        if (item['Location']) uniqueLocations.add(item['Location']);
        if (item['Status']) uniqueStatus.add(item['Status']);
        if (item['For_Employee']) uniqueUsers.add(item['For_Employee']);
      }

      setSubsidiaryList(Array.from(uniqueSubsidiaries));
      setVendorList(Array.from(uniqueVendors));
      setLocationList(Array.from(uniqueLocations));
      setStatusList(Array.from(uniqueStatus));
      setUserList(Array.from(uniqueUsers));
      return response;
    } catch (error) {
      console.error("Error fetching NetSuite transactions:", error);
      throw error;
    }
  };

  const getCoupaTransactions = async (daysBack: number, limit: number, offset: number) => {
    try {
      const response = await Bridge.transactions.getCoupaTransactions(daysBack, limit, offset);
      const dataToSet = Array.isArray(response.data.data) ? response.data.data : [];
      setCoupaData(dataToSet);
      setTotalItems(response.data.total_count);

      // Update filter dropdown lists
      const uniqueSuppliers = new Set<string>();
      const uniqueDepartments = new Set<string>();
      const uniqueUsers = new Set<string>();
      const uniqueStatus = new Set<string>();

      for (const item of dataToSet) {
        if (item['Supplier']) uniqueSuppliers.add(item['Supplier']);
        if (item['DEPARTMENT_NAME']) uniqueDepartments.add(item['DEPARTMENT_NAME']);
        if (item['For_Employee']) uniqueUsers.add(item['For_Employee']);
        if (item['Status']) uniqueStatus.add(item['Status']);
      }

      setSupplierList(Array.from(uniqueSuppliers));
      setDepartmentList(Array.from(uniqueDepartments));
      setUserList(Array.from(uniqueUsers));
      setStatusList(Array.from(uniqueStatus));
      return response;
    } catch (error) {
      console.error("Error fetching Coupa transactions:", error);
      throw error;
    }
  };

  // ---------- Pagination Logic ----------
  const getSourceRecordsForView = () => {
    if (activeSystem === 'coupa') {
      return getFilteredCoupaRecords();
    } else {
      return getFilteredNetsuiteRecords();
    }
  };

  // Define once — outside the loop
  const handleItemClick = useCallback(
    (clickedItem: any) => {
      handleCounterClick(clickedItem);
    },
    [handleCounterClick]
  );

  const sourceRecords = getSourceRecordsForView();

  // Update total items & adjust invalid page when dataset changes
  useEffect(() => {
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalItems, itemsPerPage]);

  const paginatedRecords = sourceRecords;
  // ---------- End Pagination Logic ----------


  // Filter submission handlers
  const handleCoupaFilterSubmit = async () => {
    // Collect filter values for potential future use
    const filterValues = {
      searchById: coupaFilters.searchById,
      forEmployee: coupaFilters.forEmployee, // as user
      department: coupaFilters.department, // as cost center
      status: coupaFilters.status,
      purchaseOrderSupplier: coupaFilters.purchaseOrderSupplier,  // as supplier
      invoiceAmountMin: coupaFilters.invoiceAmountMin, // as min amount
      invoiceAmountMax: coupaFilters.invoiceAmountMax, // as max amount
      activeTransactionType: activeTransactionType, // as current type
      dateRange: dateRange // week/ month / year
    };

    // Log for future use
    console.log('Coupa filters:', filterValues);

    // Reset pagination and reload data
    setCurrentPage(1);
    const daysBack = dateRangeToDaysBack[dateRange];
    if (daysBack) {
      await getCoupaTransactions(daysBack, itemsPerPage, 0);
    }
  };

  const handleNetsuiteFilterSubmit = async () => {
    // Collect filter values for potential future use
    const filterValues = {
      subsidiary: netsuiteFilters.subsidiary,
      vendor: netsuiteFilters.vendor,
      location: netsuiteFilters.location,
      status: netsuiteFilters.status,
      forEmployee: netsuiteFilters.forEmployee,
      activeTransactionType: activeTransactionType,
      dateRange: dateRange
    };

    // Log for future use
    console.log('NetSuite filters:', filterValues);

    // Reset pagination and reload data
    setCurrentPage(1);
    const daysBack = dateRangeToDaysBack[dateRange];
    if (daysBack) {
      await getNetsuiteTransactions(daysBack, itemsPerPage, 0);
    }
  };

  const handleDateRangeChange = async (value: string) => {
    setDateRange(value);
    
    // Reset pagination and reload data based on active system
    setCurrentPage(1);
    const daysBack = dateRangeToDaysBack[value];
    if (daysBack) {
      if (activeSystem === 'coupa') {
        await getCoupaTransactions(daysBack, itemsPerPage, 0);
      } else {
        await getNetsuiteTransactions(daysBack, itemsPerPage, 0);
      }
    }
  };

  return (
    <div className="space-y-6">
      <Spin 
        spinning={isLoading}
        size="large"
        tip="Loading..."
      >
        {/* Top Head */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-2.5">
          <h1 className="text-2xl font-semibold text-neutral-900">
            {initialSystem=='coupa' ? 'Coupa Transactions' : 'NetSuite Transactions'}
          </h1>
          <div className="mt-4 md:mt-0 flex items-center space-x-3">
            <div className="relative">
              {/* removed Search*/}
            </div>
            <div className="mt-4 md:mt-0 flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Select
                  className="w-full sm:text-sm"
                  value={dateRange}
                  // onChange={(value) => setDateRange(value)}
                  onChange={handleDateRangeChange}
                >
                  {dateRangeOptions.map((option: { value: string; label: string }) => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Filter size={16} />}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              {showAdvancedFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            {/* <Button
              variant="outline"
              size="sm"
              leftIcon={<Download size={16} />}
              onClick={handleExportCSV}
            >
              Export
            </Button> */}
          </div>
        </div>

        {/* System Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {dashboardCount?.map((item: any, index: number) => {
            const key = `${index}`;

            return (
              <Button key={key}
                className="dashboard-count-block bg-white p-4 rounded-lg shadow-card cursor-pointer hover:shadow-card-hover transition-shadow duration-300"
                onClick={() => handleItemClick(item)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-600">
                      {item.label}
                    </p>
                    <p className={`mt-2 text-2xl font-semibold ${item.color}`}>
                      {item.count}
                    </p>
                  </div>
                </div>
              </Button>
            );
          })}
        </div>

        <div className="bg-white rounded-lg shadow-card overflow-hidden mt-4">
          {/* System Tabs */}
          <div className="border-b border-neutral-200">
            <nav className="flex space-x-4 px-6">
              {showSystemTabs && (
                <div className="border-b border-neutral-200">
                  <nav className="flex space-x-4 px-6">
                    {systemTabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveSystem(tab.id as 'coupa' | 'netsuite');
                          setActiveTransactionType('all');
                        }}
                        className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 ${activeSystem === tab.id
                            ? 'border-primary-600 text-primary-600'
                            : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                          }`}
                    >
                      {tab.icon}
                        <span>{tab.name}</span>
                      </button>
                    ))}
                  </nav>
                </div>
              )}
            </nav>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50">
              {activeSystem === 'coupa' ? renderCoupaFilters() : renderNetSuiteFilters()}
            </div>
          )}

          {/* Transaction Type Filters and Actions */}
          <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex items-center space-x-2 overflow-x-auto">
                {getCurrentTransactionTypes().map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setActiveTransactionType(type.id)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap ${activeTransactionType === type.id
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-neutral-600 hover:bg-neutral-100'
                      }`}
                  >
                    {type.name}
                  </button>
                ))}
              </div>
              <div className="flex items-center space-x-3">
                {activeSystem === 'coupa' ? renderCoupaActions() : renderNetSuiteActions()}
              </div>
            </div>
          </div>

          {/* Transaction Table */}
          {activeSystem === 'coupa' ? renderCoupaTable() : renderNetSuiteTable()}

          {/* Footer */}
          <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-neutral-500">
                Showing <span className="font-medium">{paginatedRecords.length}</span> of{" "}
                <span className="font-medium">{totalItems}</span>{" "}
                {activeSystem} transactions
              </div>
              <Pagination
                current={currentPage}
                pageSize={itemsPerPage}
                total={totalItems}
                showSizeChanger
                showQuickJumper
                pageSizeOptions={['10', '20', '50']}
                onChange={(page, pageSize) => {
                  if (pageSize === itemsPerPage) {
                    setCurrentPage(page);
                  } else {
                    setItemsPerPage(pageSize);
                    setCurrentPage(1);
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Edit Transaction Modal */}
        <EditTransactionModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTransaction(null);
          }}
          transaction={selectedTransaction}
        />
      </Spin>
    </div>
  );
};

export default Main;