import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectChat } from '../store/chatsSlice';

interface UseKeyboardShortcutsOptions {
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export function useKeyboardShortcuts({ searchInputRef }: UseKeyboardShortcutsOptions): void {
  const dispatch = useAppDispatch();
  const { chats, selectedChatId } = useAppSelector((s) => s.chats);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd+K — focus search
      if (mod && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Escape — blur active input, or clear chat selection
      if (e.key === 'Escape') {
        if (document.activeElement instanceof HTMLInputElement) {
          (document.activeElement as HTMLInputElement).blur();
        } else if (selectedChatId !== null) {
          dispatch(selectChat(null));
        }
        return;
      }

      // Arrow keys — navigate chat list (only when no input is focused)
      if (
        (e.key === 'ArrowUp' || e.key === 'ArrowDown') &&
        !(document.activeElement instanceof HTMLInputElement) &&
        !(document.activeElement instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        if (chats.length === 0) return;

        const currentIndex = selectedChatId !== null
          ? chats.findIndex((c) => c.id === selectedChatId)
          : -1;

        let nextIndex: number;
        if (e.key === 'ArrowUp') {
          nextIndex = currentIndex <= 0 ? chats.length - 1 : currentIndex - 1;
        } else {
          nextIndex = currentIndex >= chats.length - 1 ? 0 : currentIndex + 1;
        }

        const nextChat = chats[nextIndex];
        if (nextChat) {
          dispatch(selectChat(nextChat.id));
        }
      }
    },
    [dispatch, chats, selectedChatId, searchInputRef],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
