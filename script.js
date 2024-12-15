$(document).ready(function () {
    // Dynamically generate due dates based on the current year
    const currentYear = new Date().getFullYear();
    const dueDates = [`04/15/${currentYear}`, `06/15/${currentYear}`, `09/15/${currentYear}`, `01/15/${currentYear + 1}`];

    // Populate the dropdown for due dates
    dueDates.forEach(date => {
        $('#due_datef').append(`<option value="${date}">${date}</option>`);
    });
    dueDates.forEach(date => {
        $('#edit-due_date').append(`<option value="${date}">${date}</option>`);
    });
    dueDates.forEach(date => {
        $('#due_date_filter').append(`<option value="${date}">${date}</option>`);
    });
    

    $('#payment-form').on('submit', function (event) {
        event.preventDefault();

        const paymentId = $(this).attr('data-id');  // Get the payment ID if it's for updating
        const paymentData = {
            company: $('#company').val(),
            amount: parseFloat($('#amount').val()),
            payment_date: $('#payment_date').val(),
            status: $('#status').val(),
            due_date: $('#due_datef').val(),
            tax_rate: parseFloat($('#tax_rate').val())
        };

        if (paymentId) {
            updatePayment(paymentId, paymentData);  // Update existing payment
        } else {
            savePayment(paymentData);  // Save new payment
        }
    });

    // Function to save a new payment
    function savePayment(paymentData) {
        $.ajax({
            url: '/add_payment',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(paymentData),
            success: function (response) {
                alert(response.message);
                $('#payment-form')[0].reset();  // Reset form fields
                $('#payment-form').removeAttr('data-id');  // Clear the data-id attribute
                loadPayments();  // Reload payments after adding
            },
            error: function (error) {
                console.error("Error adding payment:", error);
                alert('Failed to add payment. Please try again.');
            }
        });
    }

    // Function to load payments dynamically and populate the table
    function loadPayments() {
        $.ajax({
            url: '/payments',
            method: 'GET',
            success: function (payments) {
                // Clear the current table rows
                $('#payments-table tbody').empty();

                // Populate the table with payment data
                payments.forEach(payment => {
                    $('#payments-table tbody').append(`
                        <tr>
                            <td>${payment.id}</td>
                            <td>${payment.company}</td>
                            <td>${payment.amount}</td>
                            <td>${payment.payment_date}</td>
                            <td>${payment.status}</td>
                            <td>${payment.due_date}</td>
                            <td>
                                <button class="edit-btn" data-id="${payment.id}">Edit</button>
                                <button class="delete-btn" data-id="${payment.id}">Delete</button>
                            </td>
                        </tr>
                    `);
                });
            },
            error: function (error) {
                console.error("Error loading payments:", error);
            }
        });
    }

    // Modal elements
    const modal = $('#editModal');
    const closeModal = $('.close');

    // Handle 'Edit' button click
    $('#payments-table').on('click', '.edit-btn', function () {
        const paymentId = $(this).data('id');

        // Fetch the payment data from the server
        $.ajax({
            url: `/payments_id/${paymentId}`,
            method: 'GET',
            success: function (payment) {
                // Pre-fill the form in the modal with the payment data
                $('#edit-company').val(payment.company);
                $('#edit-amount').val(payment.amount);
                $('#edit-payment_date').val(payment.payment_date);
                $('#edit-status').val(payment.status);
                $('#edit-due_date').val(payment.due_date);
                $('#edit-save-btn').data('id', payment.id); // Save payment ID for later use

                // Show the modal
                modal.show();
            },
            error: function (error) {
                console.error("Error fetching payment:", error);
                alert('Failed to fetch payment details.');
            }
        });
    });

    // Handle form submission for editing a payment
    $('#edit-payment-form').on('submit', function (event) {
        event.preventDefault();

        const paymentId = $('#edit-save-btn').data('id');
        const paymentData = {
            company: $('#edit-company').val(),
            amount: parseFloat($('#edit-amount').val()),
            payment_date: $('#edit-payment_date').val(),
            status: $('#edit-status').val(),
            due_date: $('#edit-due_date').val(),
        };

        // Send the updated data to the backend via AJAX
        $.ajax({
            url: `/update_payment/${paymentId}`,
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(paymentData),
            success: function (response) {
                alert('Payment updated successfully');
                modal.hide();  // Hide the modal
                loadPayments();  // Reload payments after update
                $('#edit-payment-form')[0].reset();  // Clear the form
            },
            error: function (error) {
                console.error("Error updating payment:", error);
                alert('Failed to update payment. Please try again.');
            }
        });
    });

    // Close the modal when the user clicks on <span> (x)
    closeModal.on('click', function () {
        modal.hide();
    });

    // Close the modal if the user clicks outside of the modal content
    $(window).on('click', function (event) {
        if ($(event.target).is(modal)) {
            modal.hide();
        }
    });


    // Event listener to delete a payment when 'Delete' is clicked
    $('#payments-table').on('click', '.delete-btn', function () {
        const paymentId = $(this).data('id');
        
        // Confirm deletion
        if (confirm('Are you sure you want to delete this payment?')) {
            // Send a DELETE request to remove the payment record
            $.ajax({
                url: `/delete_payment/${paymentId}`,
                method: 'DELETE',
                success: function (response) {
                    alert('Payment deleted successfully');
                    loadPayments();  // Reload payments after deletion
                },
                error: function (error) {
                    console.error("Error deleting payment:", error);
                    alert('Failed to delete payment. Please try again.');
                }
            });
        }
    });

    // Handle the filter by due date dropdown change
    $('#due_date_filter').on('change', function () {
        const selectedDueDate = $(this).val();
        const encodedDueDate = encodeURIComponent(selectedDueDate);

        // Get the entered tax rate from the input field
        const taxRate = parseFloat($('#tax_rate').val());

        // Ensure valid tax rate
        if (isNaN(taxRate) || taxRate <= 0) {
            alert("Please enter a valid tax rate.");
            return;
        }
        
        $.ajax({
            url: `/payments_due_date?due_date=${encodedDueDate}`,
            method: 'GET',
            success: function (response) {
                // Clear the current table rows
                $('#tax-table tbody').empty();

                let totalAmount = 0;
                let totalTaxDue = 0;

                // Populate the table with filtered payments
                response.payments.forEach(payment => {
                    $('#tax-table tbody').append(`
                        <tr>
                            <td>${payment.id}</td>
                            <td>${payment.company}</td>
                            <td>${payment.amount}</td>
                            <td>${payment.payment_date}</td>
                            <td>${payment.status}</td>
                            <td>${payment.due_date}</td>
                        </tr>
                    `);
                    totalAmount += payment.amount;
                    totalTaxDue += calculateTax(payment.amount, $('#tax_rate').val());
                });
                
                // Append the Total Amount row
                $('#tax-table tbody').append(`
                    <tr>
                        <td colspan="5" class="tax"><strong>Total Amount:</strong></td>
                        <td colspan="1">$${totalAmount.toFixed(2)}</strong></td>
                    </tr>
                `);

                // Append the Tax Rate row
                $('#tax-table tbody').append(`
                    <tr>
                        <td colspan="5" class="tax"><strong>Tax Rate:</strong></td>
                        <td colspan="1">${taxRate * 100}%</strong></td>
                    </tr>
                `);

                // Append the Tax Due row
                $('#tax-table tbody').append(`
                    <tr>
                        <td colspan="5" class="tax"><strong>Tax Due:</strong></td>
                        <td colspan="1">$${totalTaxDue.toFixed(2)}</strong></td>
                    </tr>
                `);

            },
            error: function (error) {
                console.error("Error fetching filtered payments:", error);
            }
        });
    });

    // Handle tax rate input change dynamically
    $('#tax_rate').on('change', function () {
        // Trigger change for due date filter to recalculate tax
        $('#due_date_filter').trigger('change');
    });

    // Function to calculate tax based on amount and tax rate
    function calculateTax(amount, taxRate) {
        return amount * taxRate;
    }

    // Initial load of payments when the page is ready
    loadPayments();
});
