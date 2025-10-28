import React, { createContext, useContext, useState, useCallback } from 'react';
import Modal from '../components/Modal';

const ModalContext = createContext();

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within ModalProvider');
  }
  return context;
}

export function ModalProvider({ children }) {
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: null, // 'alert', 'confirm', 'prompt'
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    confirmText: 'OK',
    cancelText: 'Cancel',
    variant: 'default', // 'default', 'danger', 'primary'
    inputValue: '',
    inputPlaceholder: ''
  });

  const closeModal = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }));
    // Clear after animation
    setTimeout(() => {
      setModalState({
        isOpen: false,
        type: null,
        title: '',
        message: '',
        onConfirm: null,
        onCancel: null,
        confirmText: 'OK',
        cancelText: 'Cancel',
        variant: 'default',
        inputValue: '',
        inputPlaceholder: ''
      });
    }, 200);
  }, []);

  const alert = useCallback((message, title = '') => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        type: 'alert',
        title,
        message,
        confirmText: 'OK',
        variant: 'default',
        onConfirm: () => {
          closeModal();
          resolve();
        },
        onCancel: null,
        inputValue: '',
        inputPlaceholder: ''
      });
    });
  }, [closeModal]);

  const confirm = useCallback((message, title = 'Confirm', options = {}) => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        type: 'confirm',
        title,
        message,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        variant: options.variant || 'default',
        onConfirm: () => {
          closeModal();
          resolve(true);
        },
        onCancel: () => {
          closeModal();
          resolve(false);
        },
        inputValue: '',
        inputPlaceholder: ''
      });
    });
  }, [closeModal]);

  const prompt = useCallback((message, title = 'Input', defaultValue = '', placeholder = '') => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        type: 'prompt',
        title,
        message,
        confirmText: 'OK',
        cancelText: 'Cancel',
        variant: 'default',
        inputValue: defaultValue,
        inputPlaceholder: placeholder,
        onConfirm: (value) => {
          closeModal();
          resolve(value);
        },
        onCancel: () => {
          closeModal();
          resolve(null);
        }
      });
    });
  }, [closeModal]);

  const handleInputChange = (e) => {
    setModalState(prev => ({ ...prev, inputValue: e.target.value }));
  };

  const handleConfirm = () => {
    if (modalState.type === 'prompt') {
      modalState.onConfirm?.(modalState.inputValue);
    } else {
      modalState.onConfirm?.();
    }
  };

  const handleCancel = () => {
    modalState.onCancel?.();
  };

  const getButtonClass = () => {
    switch (modalState.variant) {
      case 'danger':
        return 'btn-danger';
      case 'primary':
        return 'btn-primary';
      default:
        return 'btn-confirm';
    }
  };

  const footer = (
    <>
      {modalState.type === 'confirm' || modalState.type === 'prompt' ? (
        <>
          <button className="btn-cancel" onClick={handleCancel}>
            {modalState.cancelText}
          </button>
          <button className={getButtonClass()} onClick={handleConfirm}>
            {modalState.confirmText}
          </button>
        </>
      ) : (
        <button className="btn-confirm" onClick={handleConfirm}>
          {modalState.confirmText}
        </button>
      )}
    </>
  );

  return (
    <ModalContext.Provider value={{ alert, confirm, prompt }}>
      {children}
      <Modal
        isOpen={modalState.isOpen}
        onClose={modalState.type === 'alert' ? handleConfirm : handleCancel}
        title={modalState.title}
        footer={footer}
        showCloseButton={modalState.type !== 'alert'}
      >
        <div>{modalState.message}</div>
        {modalState.type === 'prompt' && (
          <input
            type="text"
            className="modal-input"
            value={modalState.inputValue}
            onChange={handleInputChange}
            placeholder={modalState.inputPlaceholder}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleConfirm();
              }
            }}
          />
        )}
      </Modal>
    </ModalContext.Provider>
  );
}
