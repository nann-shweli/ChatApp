import {useEffect, useState} from 'react';
import {
  listenChatList,
  getUserById,
  getConversation,
} from '../services/chatService';
import {UserConversationItem, Conversation} from '../types';

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
            const conv = (await getConversation(item.cid)) as
              | (Conversation & {memberIds?: string[]})
              | null;

            if (conv?.type === 'direct') {
              const otherUid =
                conv.memberIds?.find(memberUid => memberUid !== uid) ??
                item.cid.split('_').find(part => part !== uid);

              if (otherUid) {
                const otherUser = await getUserById(otherUid);
                return {
                  ...item,
                  conversation: conv,
                  otherUser: otherUser ?? undefined,
                };
              }
            }

            return {...item, conversation: conv ?? undefined};
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
