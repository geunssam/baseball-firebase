import { useEffect } from 'react';

/**
 * 키보드 단축키를 위한 커스텀 Hook
 *
 * @param {Array<string>} keys - 감지할 키 배열 (예: ['Enter'], ['Escape'], ['Ctrl+S'])
 * @param {Function} callback - 키가 눌렸을 때 실행할 함수
 * @param {Array} deps - useEffect 의존성 배열
 * @param {Object} options - 옵션 객체
 * @param {boolean} options.ignoreInputs - input/textarea에서도 작동 여부 (기본: true, 무시함)
 * @param {boolean} options.preventDefault - 기본 동작 방지 여부 (기본: true)
 *
 * @example
 * // Enter 키로 폼 제출
 * useKeyboardShortcut(['Enter'], handleSubmit, [formData]);
 *
 * // ESC 키로 모달 닫기
 * useKeyboardShortcut(['Escape'], handleClose, []);
 *
 * // Ctrl+S로 저장 (input에서도 작동)
 * useKeyboardShortcut(['Ctrl+s'], handleSave, [data], { ignoreInputs: false });
 */
export const useKeyboardShortcut = (keys, callback, deps = [], options = {}) => {
  const { ignoreInputs = true, preventDefault = true } = options;

  useEffect(() => {
    const handleKeyDown = (e) => {
      // input/textarea에서는 작동하지 않음 (옵션으로 조정 가능)
      if (ignoreInputs && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) {
        return;
      }

      const keyCombo = [];
      if (e.ctrlKey) keyCombo.push('Ctrl');
      if (e.shiftKey) keyCombo.push('Shift');
      if (e.metaKey) keyCombo.push('Meta');
      if (e.altKey) keyCombo.push('Alt');
      keyCombo.push(e.key);

      const comboString = keyCombo.join('+');

      if (keys.includes(comboString) || keys.includes(e.key)) {
        if (preventDefault) {
          e.preventDefault();
        }
        callback(e);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, deps);
};

/**
 * 모달용 키보드 단축키 Hook
 * ESC로 닫기, Enter로 확인 기능을 자동으로 추가
 *
 * @param {boolean} isOpen - 모달이 열려있는지 여부
 * @param {Function} onClose - 닫기 콜백
 * @param {Function} onConfirm - 확인 콜백 (선택적)
 * @param {Array} deps - useEffect 의존성 배열
 *
 * @example
 * useModalKeyboard(open, onClose, handleSubmit, [formData]);
 */
export const useModalKeyboard = (isOpen, onClose, onConfirm, deps = []) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // input, textarea, select에서는 Enter만 무시
      const isInputElement = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);

      // ESC: 항상 모달 닫기
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Enter: input이 아닐 때만 확인
      if (e.key === 'Enter' && !isInputElement && onConfirm) {
        // Shift+Enter나 Ctrl+Enter는 무시 (줄바꿈 용도)
        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          onConfirm();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onConfirm, ...deps]);
};

export default useKeyboardShortcut;
