/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/error'], function(record, error) {

    /**
     * beforeSubmit event handler to enforce Memo field requirement on Sales Order.
     */
    function beforeSubmit(context) {
        var newRecord = context.newRecord;

        // Only apply to Sales Orders
        if (newRecord.type !== record.Type.SALES_ORDER) {
            return;
        }

        // Get the Memo field value
        var memo = newRecord.getValue({ fieldId: 'memo' });

        // If Memo is empty, throw an error to prevent save
        if (!memo || memo.trim() === '') {
            throw error.create({
                name: 'MEMO_REQUIRED',
                message: 'The Memo field is mandatory on Sales Orders.',
                notifyOff: false
            });
        }
    }

    return {
        beforeSubmit: beforeSubmit
    };
});