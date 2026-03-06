import {useEffect, useState, useCallback, useRef} from 'react';
import {listenMessages, fetchOlderMessages} from '../services/chatService';
import {Message} from '../types';

/**
 * Hook for real-time message subscription with pagination support.
 * Messages are stored in descending order (newest first) for FlatList inverted.
 */
export const useMessages = (cid: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    setLoading(true);
    setMessages([]);

    const unsubscribe = listenMessages(
      cid,
      msgs => {
        setMessages(msgs);
        setLoading(false);
        setHasMore(msgs.length >= 30);
      },
      err => {
        console.error('useMessages error:', err);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [cid]);

  const fetchMore = useCallback(async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;

    const oldest = messages[messages.length - 1];
    setLoadingMore(true);
    try {
      const older = await fetchOlderMessages(cid, oldest);
      if (older.length === 0) {
        setHasMore(false);
      } else {
        setMessages(prev => [...prev, ...older]);
        setHasMore(older.length >= 30);
      }
    } catch (err) {
      console.error('fetchMore error:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [cid, loadingMore, hasMore, messages]);

  return {messages, loading, loadingMore, hasMore, fetchMore};
};
