import { useState, useCallback } from 'react';

interface SuccessFeedbackState {
  show: boolean;
  message: string;
}

export function useSuccessFeedback() {
  const [feedback, setFeedback] = useState<SuccessFeedbackState>({
    show: false,
    message: ''
  });

  const showSuccess = useCallback((message: string) => {
    setFeedback({ show: true, message });
  }, []);

  const hideSuccess = useCallback(() => {
    setFeedback({ show: false, message: '' });
  }, []);

  return {
    showSuccess,
    hideSuccess,
    feedback
  };
}