import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

admin.initializeApp();

const db = admin.firestore();
const rtdb = admin.database();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPreview(data: admin.firestore.DocumentData): string {
  if (data.type === 'image') return '📷 Photo';
  if (data.type === 'voice') return '🎤 Voice message';
  return (data.text as string ?? '').slice(0, 100);
}

async function isMember(cid: string, uid: string): Promise<boolean> {
  const snap = await db
    .collection('conversations')
    .doc(cid)
    .collection('members')
    .doc(uid)
    .get();
  return snap.exists;
}

// ─── onMessageCreate ──────────────────────────────────────────────────────────

export const onMessageCreate = functions.firestore
  .document('conversations/{cid}/messages/{mid}')
  .onCreate(async (snap: functions.firestore.QueryDocumentSnapshot, context: functions.EventContext) => {
    const {cid} = context.params;
    const message = snap.data();
    const senderId: string = message.senderId;

    // 1) Validate sender is still a member (security double-check)
    const senderIsMember = await isMember(cid, senderId);
    if (!senderIsMember) {
      functions.logger.warn(`onMessageCreate: ${senderId} is not a member of ${cid}`);
      await snap.ref.delete();
      return null;
    }

    const preview = buildPreview(message);
    const sentAt = message.createdAt as admin.firestore.Timestamp;

    // 2) Update conversations/{cid} top-level lastMessage fields
    await db.collection('conversations').doc(cid).update({
      lastMessage: preview,
      lastMessageAt: sentAt,
      lastSenderId: senderId,
    });

    // 3) Get all members for fan-out
    const membersSnap = await db
      .collection('conversations')
      .doc(cid)
      .collection('members')
      .get();

    // 4) Fan-out userConversations + collect FCM tokens for offline members
    const fcmTokens: string[] = [];

    await Promise.all(
      membersSnap.docs.map(async (memberDoc: admin.firestore.QueryDocumentSnapshot) => {
        const uid = memberDoc.id;
        const isOnline = await checkOnline(uid);
        const isSender = uid === senderId;

        // 4a) Fan-out update
        const userConvRef = db
          .collection('userConversations')
          .doc(uid)
          .collection('items')
          .doc(cid);

        const update: any = {
          lastMessagePreview: preview,
          lastMessageAt: sentAt,
        };

        if (!isSender) {
          update.unreadCount = admin.firestore.FieldValue.increment(1);
        }

        await userConvRef.set(update, {merge: true});

        // 4b) Collect FCM token if not sender and offline
        if (!isSender && !isOnline) {
          const memberData = memberDoc.data();
          if (!memberData.muted) {
            const userSnap = await db.collection('users').doc(uid).get();
            const token = userSnap.data()?.fcmToken as string | undefined;
            if (token) fcmTokens.push(token);
          }
        }
      }),
    );

    // 5) Send FCM push notifications
    if (fcmTokens.length > 0) {
      // Get sender's display name for notification
      const senderSnap = await db.collection('users').doc(senderId).get();
      const senderName = senderSnap.data()?.displayName ?? 'Someone';

      const convSnap = await db.collection('conversations').doc(cid).get();
      const convData = convSnap.data();
      const chatName =
        convData?.type === 'group'
          ? convData?.name ?? 'Group'
          : senderName;

      const messaging = admin.messaging();

      // Send in batches of 500 (FCM limit)
      const chunks = chunkArray(fcmTokens, 500);
      await Promise.all(
        chunks.map(batch =>
          messaging.sendEachForMulticast({
            tokens: batch,
            notification: {
              title: chatName,
              body: preview,
            },
            data: {
              cid,
              type: 'new_message',
              senderId,
            },
            android: {
              priority: 'high',
              notification: {
                channelId: 'messages',
                sound: 'default',
              },
            },
            apns: {
              payload: {
                aps: {
                  sound: 'default',
                  badge: 1,
                  contentAvailable: true,
                },
              },
            },
          }).then((result: admin.messaging.BatchResponse) => {
            // Clean up invalid tokens
            result.responses.forEach((resp: admin.messaging.SendResponse, idx: number) => {
              if (
                !resp.success &&
                (resp.error?.code === 'messaging/invalid-registration-token' ||
                  resp.error?.code === 'messaging/registration-token-not-registered')
              ) {
                functions.logger.info(`Removing stale token: ${batch[idx]}`);
                // Optionally: remove stale token from user doc
              }
            });
          }),
        ),
      );
    }

    return null;
  });

// ─── onConversationCreate ─────────────────────────────────────────────────────
// Ensures userConversations bootstrap even if client write failed

export const onConversationCreate = functions.firestore
  .document('conversations/{cid}')
  .onCreate(async (snap: functions.firestore.QueryDocumentSnapshot, context: functions.EventContext) => {
    const {cid} = context.params;

    const membersSnap = await db
      .collection('conversations')
      .doc(cid)
      .collection('members')
      .get();

    const batch = db.batch();
    for (const memberDoc of membersSnap.docs) {
      const uid = memberDoc.id;
      const ref = db
        .collection('userConversations')
        .doc(uid)
        .collection('items')
        .doc(cid);

      batch.set(
        ref,
        {
          cid,
          lastMessagePreview: '',
          lastMessageAt: snap.data().createdAt,
          unreadCount: 0,
          muted: false,
          archived: false,
        },
        {merge: true},
      );
    }
    await batch.commit();
    return null;
  });

// ─── Utils ────────────────────────────────────────────────────────────────────

async function checkOnline(uid: string): Promise<boolean> {
  const snap = await rtdb.ref(`/status/${uid}/online`).get();
  return snap.val() === true;
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
