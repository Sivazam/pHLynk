  const handleConfirmPayment = async () => {
    const currentTenantId = getCurrentTenantId();
    if (!currentTenantId || !user?.uid || !pendingPaymentData) return;

    setIsCollectingPayment(true);

    try {
      console.log('🚀 Starting completed payment creation process...');
      console.log('💳 Payment data:', {
        retailerId: pendingPaymentData.retailerId,
        retailerName: pendingPaymentData.retailerName,
        amount: pendingPaymentData.amount,
        method: pendingPaymentData.paymentMethod,
        utr: pendingPaymentData.utr,
        notes: pendingPaymentData.notes
      });

      // Call to new API to create completed payment
      const response = await fetch('/api/payments/create-completed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: currentTenantId,
          retailerId: pendingPaymentData.retailerId,
          retailerName: getRetailerName(retailers.find(r => r.id === pendingPaymentData.retailerId)),
          lineWorkerId: user.uid,
          lineWorkerName: user?.displayName || 'Line Worker',
          totalPaid: pendingPaymentData.amount,
          method: pendingPaymentData.paymentMethod,
          utr: pendingPaymentData.utr,
          notes: pendingPaymentData.notes
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment');
      }

      const result = await response.json();
      console.log('✅ Payment created successfully:', result);

      // ✅ Store amount before clearing pending data (for success dialog)
      setLastPaymentAmount(pendingPaymentData.amount);

      // Clear pending payment data
      setPendingPaymentData(null);

      // Close confirmation dialog
      setShowConfirmationDialog(false);

      // Show success dialog after a short delay
      setTimeout(() => {
        setShowPaymentSuccess(true);
      }, 300);

      // Refresh data to show completed payment
      await fetchLineWorkerData();
    } catch (error) {
      console.error('❌ Error creating completed payment:', error);
      setShowConfirmationDialog(false);
      throw error;
    } finally {
      setIsCollectingPayment(false);
    }
  };
