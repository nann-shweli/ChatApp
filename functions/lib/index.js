"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onConversationCreate = exports.onMessageCreate = void 0;
const admin = require("firebase-admin");
const functions = require("firebase-functions");
admin.initializeApp();
const db = admin.firestore();
const rtdb = admin.database();
// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildPreview(data) {
    var _a;
    if (data.type === 'image')
        return '📷 Photo';
    if (data.type === 'voice')
        return '🎤 Voice message';
    return ((_a = data.text) !== null && _a !== void 0 ? _a : '').slice(0, 100);
}
async function isMember(cid, uid) {
    const snap = await db
        .collection('conversations')
        .doc(cid)
        .collection('members')
        .doc(uid)
        .get();
    return snap.exists;
}
// ─── onMessageCreate ──────────────────────────────────────────────────────────
exports.onMessageCreate = functions.firestore
    .document('conversations/{cid}/messages/{mid}')
    .onCreate(async (snap, context) => {
    var _a, _b, _c;
    const { cid } = context.params;
    const message = snap.data();
    const senderId = message.senderId;
    // 1) Validate sender is still a member (security double-check)
    const senderIsMember = await isMember(cid, senderId);
    if (!senderIsMember) {
        functions.logger.warn(`onMessageCreate: ${senderId} is not a member of ${cid}`);
        await snap.ref.delete();
        return null;
    }
    const preview = buildPreview(message);
    const sentAt = message.createdAt;
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
    const fcmTokens = [];
    await Promise.all(membersSnap.docs.map(async (memberDoc) => {
        var _a;
        const uid = memberDoc.id;
        const isOnline = await checkOnline(uid);
        const isSender = uid === senderId;
        // 4a) Fan-out update
        const userConvRef = db
            .collection('userConversations')
            .doc(uid)
            .collection('items')
            .doc(cid);
        const update = {
            lastMessagePreview: preview,
            lastMessageAt: sentAt,
        };
        if (!isSender) {
            update.unreadCount = admin.firestore.FieldValue.increment(1);
        }
        await userConvRef.set(update, { merge: true });
        // 4b) Collect FCM token if not sender and offline
        if (!isSender && !isOnline) {
            const memberData = memberDoc.data();
            if (!memberData.muted) {
                const userSnap = await db.collection('users').doc(uid).get();
                const token = (_a = userSnap.data()) === null || _a === void 0 ? void 0 : _a.fcmToken;
                if (token)
                    fcmTokens.push(token);
            }
        }
    }));
    // 5) Send FCM push notifications
    if (fcmTokens.length > 0) {
        // Get sender's display name for notification
        const senderSnap = await db.collection('users').doc(senderId).get();
        const senderName = (_b = (_a = senderSnap.data()) === null || _a === void 0 ? void 0 : _a.displayName) !== null && _b !== void 0 ? _b : 'Someone';
        const convSnap = await db.collection('conversations').doc(cid).get();
        const convData = convSnap.data();
        const chatName = (convData === null || convData === void 0 ? void 0 : convData.type) === 'group'
            ? (_c = convData === null || convData === void 0 ? void 0 : convData.name) !== null && _c !== void 0 ? _c : 'Group'
            : senderName;
        const messaging = admin.messaging();
        // Send in batches of 500 (FCM limit)
        const chunks = chunkArray(fcmTokens, 500);
        await Promise.all(chunks.map(batch => messaging.sendEachForMulticast({
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
        }).then((result) => {
            // Clean up invalid tokens
            result.responses.forEach((resp, idx) => {
                var _a, _b;
                if (!resp.success &&
                    (((_a = resp.error) === null || _a === void 0 ? void 0 : _a.code) === 'messaging/invalid-registration-token' ||
                        ((_b = resp.error) === null || _b === void 0 ? void 0 : _b.code) === 'messaging/registration-token-not-registered')) {
                    functions.logger.info(`Removing stale token: ${batch[idx]}`);
                    // Optionally: remove stale token from user doc
                }
            });
        })));
    }
    return null;
});
// ─── onConversationCreate ─────────────────────────────────────────────────────
// Ensures userConversations bootstrap even if client write failed
exports.onConversationCreate = functions.firestore
    .document('conversations/{cid}')
    .onCreate(async (snap, context) => {
    const { cid } = context.params;
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
        batch.set(ref, {
            cid,
            lastMessagePreview: '',
            lastMessageAt: snap.data().createdAt,
            unreadCount: 0,
            muted: false,
            archived: false,
        }, { merge: true });
    }
    await batch.commit();
    return null;
});
// ─── Utils ────────────────────────────────────────────────────────────────────
async function checkOnline(uid) {
    const snap = await rtdb.ref(`/status/${uid}/online`).get();
    return snap.val() === true;
}
function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
//# sourceMappingURL=index.js.map