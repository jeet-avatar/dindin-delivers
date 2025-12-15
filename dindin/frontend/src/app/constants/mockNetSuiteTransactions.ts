export interface NetSuiteTransaction {
    "NetSuite ID": number;
    "Number": string;
    "Type": string;
    "Vendor"?: string;
    "Subsidiary": string;
    "Location": string;
    "Amount": string;
    "Status": string;
    "Date": string;
    "Due Date"?: string | null;
    "For_Employee": string;
}

export const mockNetSuiteTransactions: NetSuiteTransaction[] = [
  {
    "NetSuite ID": 1001,
    "Number": "NS-0001",
    "Type": "Bill",
    "Vendor": "Acme Supplies",
    "Subsidiary": "US Operations",
    "Location": "New York",
    "Amount": "1,250.00",
    "Status": "Approved",
    "Date": "2025-10-01",
    "Due Date": "2025-10-15",
    "For_Employee": "John Doe"
  },
  {
    "NetSuite ID": 1002,
    "Number": "NS-0002",
    "Type": "Bill Payment",
    "Vendor": "TechMart LLC",
    "Subsidiary": "EU Operations",
    "Location": "London",
    "Amount": "5,700.00",
    "Status": "Pending Approval",
    "Date": "2025-10-02",
    "Due Date": "2025-10-17",
    "For_Employee": "Alice Johnson"
  },
  {
    "NetSuite ID": 1003,
    "Number": "NS-0003",
    "Type": "Purchase Order",
    "Vendor": "Global Traders",
    "Subsidiary": "Asia Operations",
    "Location": "Singapore",
    "Amount": "2,950.00",
    "Status": "Paid",
    "Date": "2025-10-03",
    "Due Date": "2025-10-18",
    "For_Employee": "Robert Smith"
  },
  {
    "NetSuite ID": 1004,
    "Number": "NS-0004",
    "Type": "Bill",
    "Vendor": "Nova Tech",
    "Subsidiary": "US Operations",
    "Location": "San Francisco",
    "Amount": "8,200.00",
    "Status": "Overdue",
    "Date": "2025-09-28",
    "Due Date": null,
    "For_Employee": "Emily White"
  },
  {
    "NetSuite ID": 1005,
    "Number": "NS-0005",
    "Type": "Purchase Order",
    "Vendor": "",
    "Subsidiary": "US Operations",
    "Location": "Austin",
    "Amount": "4,100.00",
    "Status": "In Progress",
    "Date": "2025-10-04",
    "Due Date": "2025-10-20",
    "For_Employee": "Michael Green"
  },
  {
    "NetSuite ID": 1006,
    "Number": "NS-0006",
    "Type": "Bill Payment",
    "Vendor": "Eco Supplies",
    "Subsidiary": "EU Operations",
    "Location": "Berlin",
    "Amount": "3,450.00",
    "Status": "Approved",
    "Date": "2025-10-05",
    "Due Date": "2025-10-22",
    "For_Employee": "Laura Adams"
  },
  {
    "NetSuite ID": 1007,
    "Number": "NS-0007",
    "Type": "Bill",
    "Vendor": "Green Energy",
    "Subsidiary": "Asia Operations",
    "Location": "Tokyo",
    "Amount": "0.00", // Edge case: zero amount
    "Status": "Paid",
    "Date": "2025-10-06",
    "Due Date": "2025-10-21",
    "For_Employee": "David King"
  },
  {
    "NetSuite ID": 1008,
    "Number": "NS-0008",
    "Type": "Purchase Order",
    "Vendor": "NextGen Systems",
    "Subsidiary": "US Operations",
    "Location": "Chicago",
    "Amount": "6,250.00",
    "Status": "Pending Approval",
    "Date": "2025-10-07",
    "Due Date": "2025-10-24",
    "For_Employee": "Sophia Martinez"
  },
  {
    "NetSuite ID": 1009,
    "Number": "NS-0009",
    "Type": "Bill",
    "Vendor": "BlueStar Corp",
    "Subsidiary": "US Operations",
    "Location": "Miami",
    "Amount": "7,150.00",
    "Status": "Approved",
    "Date": "2025-10-08",
    "Due Date": "2025-10-25",
    "For_Employee": "Chris Evans"
  },
  {
    "NetSuite ID": 1010,
    "Number": "NS-0010",
    "Type": "Bill Payment",
    "Vendor": "Skyline Services",
    "Subsidiary": "EU Operations",
    "Location": "Paris",
    "Amount": "2,300.00",
    "Status": "Paid",
    "Date": "2025-10-09",
    "Due Date": "2025-10-26",
    "For_Employee": "Olivia Brown"
  },
  {
    "NetSuite ID": 1011,
    "Number": "NS-0011",
    "Type": "Purchase Order",
    "Vendor": "Office Essentials",
    "Subsidiary": "US Operations",
    "Location": "Seattle",
    "Amount": "1,800.00",
    "Status": "Pending Approval",
    "Date": "2025-10-10",
    "Due Date": null,
    "For_Employee": "Ethan Wilson"
  },
  {
    "NetSuite ID": 1012,
    "Number": "NS-0012",
    "Type": "Bill",
    "Vendor": "BrightTech Ltd",
    "Subsidiary": "Asia Operations",
    "Location": "Hong Kong",
    "Amount": "4,950.00",
    "Status": "Overdue",
    "Date": "2025-09-20",
    "Due Date": "2025-10-05",
    "For_Employee": "Emma Clark"
  },
  {
    "NetSuite ID": 1013,
    "Number": "NS-0013",
    "Type": "Bill Payment",
    "Vendor": "EcoSupplies",
    "Subsidiary": "US Operations",
    "Location": "Los Angeles",
    "Amount": "3,100.00",
    "Status": "Approved",
    "Date": "2025-10-11",
    "Due Date": "2025-10-28",
    "For_Employee": "Daniel Walker"
  },
  {
    "NetSuite ID": 1014,
    "Number": "NS-0014",
    "Type": "Purchase Order",
    "Vendor": "DataWorld",
    "Subsidiary": "US Operations",
    "Location": "Boston",
    "Amount": "12,000.00",
    "Status": "In Progress",
    "Date": "2025-10-12",
    "Due Date": "2025-10-30",
    "For_Employee": "Chloe Johnson"
  },
  {
    "NetSuite ID": 1015,
    "Number": "NS-0015",
    "Type": "Bill",
    "Vendor": "CloudWorks",
    "Subsidiary": "EU Operations",
    "Location": "Madrid",
    "Amount": "6,500.00",
    "Status": "Pending Approval",
    "Date": "2025-10-13",
    "Due Date": "2025-10-31",
    "For_Employee": "Jack Thompson"
  },
  {
    "NetSuite ID": 1016,
    "Number": "NS-0016",
    "Type": "Bill Payment",
    "Vendor": "Greenline Solutions",
    "Subsidiary": "Asia Operations",
    "Location": "Bangalore",
    "Amount": "2,900.00",
    "Status": "Paid",
    "Date": "2025-10-14",
    "Due Date": "2025-11-01",
    "For_Employee": "Isabella Lee"
  },
  {
    "NetSuite ID": 1017,
    "Number": "NS-0017",
    "Type": "Purchase Order",
    "Vendor": "ProServe Inc.",
    "Subsidiary": "US Operations",
    "Location": "Denver",
    "Amount": "1,750.00",
    "Status": "In Progress",
    "Date": "2025-10-15",
    "Due Date": "2025-11-02",
    "For_Employee": "Mason Young"
  },
  {
    "NetSuite ID": 1018,
    "Number": "NS-0018",
    "Type": "Bill",
    "Vendor": "Core Systems",
    "Subsidiary": "EU Operations",
    "Location": "Rome",
    "Amount": "8,750.00",
    "Status": "Approved",
    "Date": "2025-10-16",
    "Due Date": "2025-11-03",
    "For_Employee": "Grace Taylor"
  },
  {
    "NetSuite ID": 1019,
    "Number": "NS-0019",
    "Type": "Bill Payment",
    "Vendor": "Vision Electronics",
    "Subsidiary": "US Operations",
    "Location": "Dallas",
    "Amount": "5,600.00",
    "Status": "Paid",
    "Date": "2025-10-17",
    "Due Date": "2025-11-04",
    "For_Employee": "Benjamin Scott"
  },
  {
    "NetSuite ID": 1020,
    "Number": "NS-0020",
    "Type": "Bill",
    "Vendor": "BluePeak Partners",
    "Subsidiary": "Asia Operations",
    "Location": "Manila",
    "Amount": "9,300.00",
    "Status": "Pending Approval",
    "Date": "2025-10-18",
    "Due Date": "",
    "For_Employee": "Sophia Davis"
  }
];