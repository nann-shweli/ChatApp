"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onConversationCreate = exports.onMessageCreate = exports.syncAuthUsersToFirestore = exports.onAuthUserCreate = void 0;
const admin = require("firebase-admin");
const functions = require("firebase-functions");
admin.initializeApp();
const db = admin.firestore();
const rtdb = admin.database();
// ─── Helpers ──────────────────────────────────────────────────────────────────
function normalizeSearchValue(value) {
    var _a;
    return (_a = value === null || value === void 0 ? void 0 : value.trim().toLowerCase()) !== null && _a !== void 0 ? _a : '';
}
function buildAuthUserProfileData(user) {
    var _a, _b, _c;
    const email = normalizeSearchValue(user.email);
    const displayName = ((_a = user.displayName) === null || _a === void 0 ? void 0 : _a.trim()) || email || 'Unknown User';
    return {
        uid: user.uid,
        displayName,
        displayNameLowercase: normalizeSearchValue(displayName),
        email,
        emailLowercase: email,
        photoURL: (_b = user.photoURL) !== null && _b !== void 0 ? _b : '',
        phoneNumber: (_c = user.phoneNumber) !== null && _c !== void 0 ? _c : '',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
}
async function upsertUserProfileForAuthUser(user) {
    var _a, _b, _c, _d;
    const userRef = db.collection('users').doc(user.uid);
    const snap = await userRef.get();
    await userRef.set(Object.assign(Object.assign({}, buildAuthUserProfileData(user)), { fcmToken: (_b = (_a = snap.data()) === null || _a === void 0 ? void 0 : _a.fcmToken) !== null && _b !== void 0 ? _b : '', createdAt: (_d = (_c = snap.data()) === null || _c === void 0 ? void 0 : _c.createdAt) !== null && _d !== void 0 ? _d : admin.firestore.FieldValue.serverTimestamp() }), { merge: true });
}
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
// ─── Auth user profile sync ──────────────────────────────────────────────────
exports.onAuthUserCreate = functions.auth
    .user()
    .onCreate(async (user) => {
    await upsertUserProfileForAuthUser(user);
    return null;
});
exports.syncAuthUsersToFirestore = functions.https.onCall(async (_data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to sync users.');
    }
    let nextPageToken;
    let syncedCount = 0;
    do {
        const result = await admin.auth().listUsers(1000, nextPageToken);
        await Promise.all(result.users.map(upsertUserProfileForAuthUser));
        syncedCount += result.users.length;
        nextPageToken = result.pageToken;
    } while (nextPageToken);
    return { syncedCount };
});
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
        var _a, _b, _c;
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
        const existingUserConvSnap = await userConvRef.get();
        const existingLastMessageAt = (_a = existingUserConvSnap.data()) === null || _a === void 0 ? void 0 : _a.lastMessageAt;
        const alreadyFannedOut = (_b = existingLastMessageAt === null || existingLastMessageAt === void 0 ? void 0 : existingLastMessageAt.isEqual(sentAt)) !== null && _b !== void 0 ? _b : false;
        if (!isSender && !alreadyFannedOut) {
            update.unreadCount = admin.firestore.FieldValue.increment(1);
        }
        await userConvRef.set(update, { merge: true });
        // 4b) Collect FCM token if not sender and offline
        if (!isSender && !isOnline) {
            const memberData = memberDoc.data();
            if (!memberData.muted) {
                const userSnap = await db.collection('users').doc(uid).get();
                const token = (_c = userSnap.data()) === null || _c === void 0 ? void 0 : _c.fcmToken;
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
        const chatName = (convData === null || convData === void 0 ? void 0 : convData.type) === 'group' ? (_c = convData === null || convData === void 0 ? void 0 : convData.name) !== null && _c !== void 0 ? _c : 'Group' : senderName;
        const messaging = admin.messaging();
        // Send in batches of 500 (FCM limit)
        const chunks = chunkArray(fcmTokens, 500);
        await Promise.all(chunks.map(batch => messaging
            .sendEachForMulticast({
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
        })
            .then((result) => {
            // Clean up invalid tokens
            result.responses.forEach((resp, idx) => {
                var _a, _b;
                if (!resp.success &&
                    (((_a = resp.error) === null || _a === void 0 ? void 0 : _a.code) ===
                        'messaging/invalid-registration-token' ||
                        ((_b = resp.error) === null || _b === void 0 ? void 0 : _b.code) ===
                            'messaging/registration-token-not-registered')) {
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