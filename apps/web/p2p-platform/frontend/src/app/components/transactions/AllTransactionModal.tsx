import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import Button from "../ui/Button";
import { CoupaTransaction } from "../../constants/types";
import { ModalOverlay } from "../ui/ModalOverlay";

interface AllTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: CoupaTransaction | null;
  activeTransactionType: string;
}

type FieldKey =
  | "number"
  | "date"
  | "amount"
  | "supplier"
  | "department"
  | "status"
  | "dueDate"
  | "type"
  | "memo"
  | "user"
  | "issueDate"
  | "totalAmount"
  | "description"
  | "paymentStatus"
  | "requestDate"
  | "currentStatus"
  | "paymentDate";

const AllTransactionModal: React.FC<AllTransactionModalProps> = ({
  isOpen,
  onClose,
  transaction,
  activeTransactionType,
}) => {
  const [formData, setFormData] = useState({
    type: "",
    number: "",
    user: "",
    date: "",
    dueDate: "",
    amount: "",
    status: "",
    department: "",
    supplier: "",
    memo: "",
  });

  useEffect(() => {
    if (transaction) {
      setFormData({
        type: transaction["Type"] || "",
        number: transaction["Number"] || "",
        user: transaction["For_Employee"] || "",
        date: transaction["Date"] || "",
        dueDate: transaction["Due Date"] || "",
        amount: transaction["Amount"] || "",
        status: transaction["Status"] || "",
        department: transaction["DEPARTMENT_NAME"] || "",
        supplier: transaction["Supplier"] || "",
        memo: transaction["HEADER_MEMO"] || "",
      });
    }
  }, [transaction]);

  // 🧩 Central field-label mapping
  const fieldLabelMap: Record<string, Partial<Record<FieldKey, string>>> = {
    all: {
      number: "Transaction Number",
      date: "Date",
      amount: "Amount",
      supplier: "Supplier",
      department: "Cost Center",
      status: "Status",
      dueDate: "Due Date",
      type: "Type",
      memo: "Memo",
      user: "User",
    },
    purchase_order: {
      number: "PO Number",
      date: "Issue Date",
      user: "User",
      memo: "Memo",
      supplier: "Supplier Name",
      amount: "Total Amount",
      status: "Status",
    },
    invoice: {
      number: "Invoice Number",
      supplier: "Supplier Name",
      user: "User",
      amount: "Amount",
      status: "Payment Status",
      date: "Issue Date",
      memo: "Memo",
    },
    requisition: {
      number: "Number",
      user: "User",
      memo: "Description",
      amount: "Total Amount",
      date: "Request Date",
      status: "Current Status",
    },
    payment: {
      number: "Number",
      supplier: "Supplier",
      amount: "Amount",
      date: "Payment Date",
      status: "Status",
    },
  };

  // 🧠 Function to return visible fields for the current type
  const getVisibleFields = (type: string): FieldKey[] => {
    const mapping = fieldLabelMap[type] || fieldLabelMap["all"];
    return Object.keys(mapping) as FieldKey[];
  };

  if (!isOpen || !transaction) return null;

  const visibleFields = getVisibleFields(activeTransactionType);
  const labels = fieldLabelMap[activeTransactionType] || fieldLabelMap["all"];

  const getValue = (key: FieldKey): string => {
    const value = formData[key as keyof typeof formData];
    if (key === "date" || key === "dueDate") {
      return value ? value.split("T")[0] : "";
    }
    return value ? value.toString().split("_").join(" ") : "";
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <ModalOverlay onClose={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
          <div className="flex items-center justify-between p-6 border-b border-neutral-200">
            <h2 className="text-xl font-semibold text-neutral-900">
              View Transaction
            </h2>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-500"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {visibleFields.map((field) => {
                  const getInputType = (field: string): string => {
                    if (field.toLowerCase().includes("date")) {
                      return "date";
                    } else if (field === "amount") {
                      return "number";
                    } else {
                      return "text";
                    }
                  };

                  return (
                    <div key={field}>
                      <label
                        htmlFor={field}
                        className="block text-sm font-medium text-neutral-700 mb-1"
                      >
                        {labels[field]}
                      </label>
                      <input
                        id={field}
                        type={getInputType(field)}
                        step={getInputType(field) === "number" ? "0.01" : undefined}
                        className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm bg-neutral-50"
                        value={getValue(field)}
                        disabled
                        readOnly
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <Button variant="outline" type="button" onClick={onClose}>
                Close
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AllTransactionModal;