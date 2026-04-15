-- list all purchase order's related transactions, including prepayments, item receipts, vendor bills, and more.

SELECT
	PO.TranID AS PONumber,
	PO.TranDate AS DateOrdered,
	BUILTIN.DF( PO.Entity ) AS Supplier,
	BUILTIN.DF( PO.Status ) AS POStatus,
	( PO.ForeignTotal * -1 ) AS POAmount,
	NextTransaction.TranDate,
	BUILTIN.DF( NTL.NextDoc ) AS RelatedTransaction,
	BUILTIN.DF( NextTransaction.Status ) AS TransactionStatus,
	BUILTIN.DF( NextTransaction.ApprovalStatus ) AS ApprovalStatus,
	( NextTransaction.ForeignTotal * -1 ) AS TotalAmount,
	NextTransaction.ForeignAmountPaid AS AmountPaid,
	NextTransaction.ForeignAmountUnpaid AS BalanceDue,
	NextTransaction.Memo	
FROM
	Transaction AS PO
	INNER JOIN NextTransactionLink AS NTL ON
		( NTL.PreviousDoc = PO.ID )
	INNER JOIN Transaction AS NextTransaction ON
		( NextTransaction.ID = NTL.NextDoc )

ORDER BY
	NextTransaction.TranDate,
	NextTransaction.ID