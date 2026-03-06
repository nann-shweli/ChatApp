import {useEffect, useState} from 'react';
import {listenChatList, getUserById, getConversation} from '../services/chatService';
import {UserConversationItem, User, Conversation} from '../types';

/**
 * Subscribes to the current user's chat list and enriches each item
 * with the other user's profile for direct conversations.
 */
export const useChatList = (uid: string | null) => {
  const [items, setItems] = useState<UserConversationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setItems([]);
      return;
    }

    setLoading(true);
    const unsubscribe = listenChatList(
      uid,
      async rawItems => {
        // Enrich direct chat items with the other user's data
        const enriched = await Promise.all(
          rawItems.map(async item => {
            // Direct cid format: uid1_uid2 (sorted)
            const parts = item.cid.split('_');
            if (parts.length === 2 && parts[0].length > 20 && parts[1].length > 20) {
              const otherUid = parts.find(p => p !== uid);
              if (otherUid) {
                const otherUser = await getUserById(otherUid);
                return {...item, otherUser: otherUser ?? undefined};
              }
            } else {
              // Group chat or direct with non-standard cid
              const conv = (await getConversation(item.cid)) as Conversation | null;
              return {...item, conversation: conv ?? undefined};
            }
            return item;
          }),
        );
        setItems(enriched);
        setLoading(false);
      },
      err => {
        console.error('useChatList error:', err);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [uid]);

  return {items, loading};
};
