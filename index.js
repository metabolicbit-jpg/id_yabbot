// ========== ID Finder Bot v7.4 - Clean (Auto-Track Only) ==========

const REQUIRED_CHANNEL_ID = "5235764517";
const JOIN_LINK = "https://ble.ir/join/NzdkM2I1Nj";
const PUBLIC_LINK = "https://ble.ir/yadbegirim";

const ADMIN_IDS = ["1381797564"];

const GUIDE_MESSAGE = `🌟 سلام دوست عزیز!

به ربات آیدی‌یاب بله خوش آمدی. 

اینجا خیلی راحت می‌تونی آیدی عددی کاربران، گروه‌ها و کانال‌های بله رو پیدا کنی.

🔎 فقط کافیه:
▫️ برای آیدی خودت روی دکمه "شروع" بزن
▫️ برای آیدی یک کاربر، پیامش رو به بات فوروارد (بازارسال) کن
▫️ برای گروه، بات آیدی یاب رو به گروه اضافه کن و به محض اضافه شدن آیدی گروه رو برات میفرسته. 
▫️ برای کانال، ربات آیدی یاب رو اضافه کن و مدیر گروه و مجوز ارسال پیام رو روشن بزار و یک پیام بفرست تا ایدی کانال رو برات بفرسته

⚡ ساده، سریع و کاربردی!`;

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('ID Finder Tool is running!');

    try {
      const update = await request.json();
      const token = env.BALE_BOT_TOKEN;

      // --- مدیریت Callback Query ---
      if (update.callback_query) {
        const cb = update.callback_query;
        const chatId = cb.message.chat.id;
        const userId = cb.from.id;
        const data = cb.data;

        await baleApi(token, 'answerCallbackQuery', { callback_query_id: cb.id });

        const isMember = await checkStrictMembership(token, userId);

        if (data === 'check_membership_inline') {
          if (isMember) {
            await editMessage(token, chatId, cb.message.message_id,
              `✅ *عضویت تایید شد!*\n\n🆔 *شناسه شما:* \`${userId}\`\n\n${GUIDE_MESSAGE}`,
              getServicesInlineKeyboard(userId)
            );
          } else {
            await baleApi(token, 'answerCallbackQuery', {
              callback_query_id: cb.id, text: '❌ هنوز عضو نشده‌اید!', show_alert: true
            });
          }
        } else if (data === 'get_my_id_inline') {
          if (isMember) {
            await editMessage(token, chatId, cb.message.message_id,
              `🆔 *شناسه شما:* \`${userId}\`\n\n${GUIDE_MESSAGE}`,
              getServicesInlineKeyboard(userId)
            );
          } else {
            await baleApi(token, 'answerCallbackQuery', {
              callback_query_id: cb.id, text: 'لطفاً ابتدا عضو شوید.', show_alert: true
            });
          }
        }
        return new Response('OK');
      }

      // --- مدیریت پیام‌ها ---
      const msg = update.channel_post || update.message;
      if (!msg) return new Response('OK');

      const chatId = msg.chat.id;
      const userId = msg.from ? msg.from.id : null;

      // ۱) پیام در کانال
      if (msg.chat.type === 'channel') {
        const cid = chatId.toString();
        if (cid !== REQUIRED_CHANNEL_ID && cid !== `-100${REQUIRED_CHANNEL_ID}`) {
          const title = msg.chat.title || 'Unknown';
          const username = msg.chat.username ? '@' + msg.chat.username : '(خصوصی)';
          const replyText = `🆔 *شناسه این کانال:*\n\n🔢 عددی: \`${cid}\`\n📛 نام: ${title}\n🔗 آیدی: ${username}`;
          await baleApi(token, 'sendMessage', {
            chat_id: chatId,
            text: replyText,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: "📋 کپی آیدی", copy_text: { text: cid } }]] }
          });
          console.log(`📢 Channel Detected: ID=${cid}`);
        }
        return new Response('OK');
      }

      // ۲) چت خصوصی
      if (msg.chat.type === 'private' && userId) {

        console.log(`📨 Private from ${userId} | text=${msg.text || '(non-text)'}`);

        // ✅ ثبت خودکار کاربر با «هر پیام» (قدیمی یا جدید)
        if (!ADMIN_IDS.includes(userId.toString())) {
          await trackUser(env, msg.from);
        }

        // --- دستورات ادمین ---
        if (ADMIN_IDS.includes(userId.toString())) {
          if (msg.text === '/stats') {
            const stats = await env.ID_FINDER_DB.get('stats', 'json') || { total: 0 };
            await baleApi(token, 'sendMessage', {
              chat_id: chatId,
              text: `📊 *آمار ربات:*\n\n👥 تعداد کل کاربران ثبت شده: ${stats.total}`,
              parse_mode: 'Markdown'
            });
            return new Response('OK');
          }
          if (msg.text === '/users' || msg.text === '/user') {
            const users = await env.ID_FINDER_DB.get('recent_users', 'json') || [];
            const recent = users.slice(-10).reverse();
            
            let list = "";
            const copyButtons = [];
            
            recent.forEach((u, idx) => {
              const isLegacy = typeof u === 'string';
              const uid = isLegacy ? u : u.id;
              const uName = isLegacy ? '(نام ثبت نشده)' : (u.firstName || '—');
              const uUser = isLegacy ? '—' : (u.username ? '@' + u.username : '(ندارد)');
              
              list += `\n${idx + 1}️⃣ \`${uid}\`\n   📛 ${uName}\n   🔗 ${uUser}\n`;
              copyButtons.push([{ text: `${idx + 1}️⃣ ${uName}`, copy_text: { text: uid } }]);
            });
            
            const text = recent.length > 0
              ? `👥 *۱۰ کاربر اخیر:*\n${list}\n💡 روی دکمه‌های زیر بزنید تا آیدی کپی شود:`
              : '👥 *۱۰ کاربر اخیر:*\n\nهنوز کاربری ثبت نشده است.';
            
            await baleApi(token, 'sendMessage', {
              chat_id: chatId,
              text: text,
              parse_mode: 'Markdown',
              reply_markup: recent.length > 0 ? { inline_keyboard: copyButtons } : undefined
            });
            return new Response('OK');
          }
          if (msg.text === '/debug') {
            let report = `🛠 *گزارش دیباگ:*\n\n`;
            report += `• اتصال KV: ${env.ID_FINDER_DB ? '✅ متصل' : '❌ تعریف نشده'}\n`;
            try {
              await env.ID_FINDER_DB.put('debug_test', JSON.stringify({ t: Date.now() }));
              const back = await env.ID_FINDER_DB.get('debug_test', 'json');
              report += `• تست نوشتن/خواندن KV: ${back ? '✅ موفق' : '❌ ناموفق'}\n`;
            } catch (e) {
              report += `• ❌ خطای KV: ${e.message}\n`;
            }
            const users = await env.ID_FINDER_DB.get('recent_users', 'json') || [];
            const stats = await env.ID_FINDER_DB.get('stats', 'json') || { total: 0 };
            report += `• کاربران اخیر: ${users.length}\n• آمار کل: ${stats.total}`;
            await baleApi(token, 'sendMessage', { chat_id: chatId, text: report, parse_mode: 'Markdown' });
            return new Response('OK');
          }
        }

        // الف) /start
        if (msg.text === '/start') {
          await baleApi(token, 'sendMessage', {
            chat_id: chatId,
            text: GUIDE_MESSAGE,
            reply_markup: getReplyKeyboard()
          });
          return new Response('OK');
        }

        // ب) دکمه «🚀 شروع»
        if (msg.text === "🚀 شروع") {
          const isMember = await checkStrictMembership(token, userId);

          if (isMember) {
            await baleApi(token, 'sendMessage', {
              chat_id: chatId,
              text: `✅ خوش آمدید!\n\n🆔 *شناسه شما:* \`${userId}\``,
              parse_mode: 'Markdown',
              reply_markup: getServicesInlineKeyboard(userId)
            });
          } else {
            await baleApi(token, 'sendMessage', {
              chat_id: chatId,
              text: `⚠️ *دسترسی محدود*\n\nشما عضو کانال نیستید یا خارج شده‌اید.\nبرای استفاده، ابتدا عضو شوید:\n📢 @yadbegirim`,
              parse_mode: 'Markdown',
              reply_markup: getJoinInlineKeyboard()
            });
          }
          return new Response('OK');
        }

        // ج) پیام فوروارد شده
        if (msg.forward_from || msg.forward_from_chat) {
          const isMember = await checkStrictMembership(token, userId);

          if (!isMember) {
            await baleApi(token, 'sendMessage', {
              chat_id: chatId,
              text: `⚠️ *خطا:* شما عضو کانال نیستید.\nلطفاً عضو شوید و دکمه «بررسی عضویت» را بزنید.`,
              reply_markup: getJoinInlineKeyboard()
            });
            return new Response('OK');
          }

          let replyText = "";
          let copyId = "";
          
          if (msg.forward_from) {
            const fwdId = msg.forward_from.id.toString();
            const fwdName = msg.forward_from.first_name + (msg.forward_from.last_name ? ' ' + msg.forward_from.last_name : '');
            const fwdUser = msg.forward_from.username ? '@' + msg.forward_from.username : '(ندارد)';
            replyText = `👤 *شناسه کاربر:*\n\n🔢 \`${fwdId}\`\n👤 نام: ${fwdName}\n🔗 یوزر: ${fwdUser}`;
            copyId = fwdId;
          } else if (msg.forward_from_chat) {
            const fwdId = msg.forward_from_chat.id.toString();
            const fwdTitle = msg.forward_from_chat.title || 'Unknown';
            const fwdUser = msg.forward_from_chat.username ? '@' + msg.forward_from_chat.username : '(خصوصی)';
            replyText = `📢 *شناسه منبع:*\n\n🔢 \`${fwdId}\`\n📛 نام: ${fwdTitle}\n🔗 آیدی: ${fwdUser}`;
            copyId = fwdId;
          }

          await baleApi(token, 'sendMessage', {
            chat_id: chatId,
            text: replyText + `\n\n${GUIDE_MESSAGE}`,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: "📋 کپی آیدی", copy_text: { text: copyId } }]
              ]
            }
          });
          return new Response('OK');
        }
      }

      // ۳) گروه‌ها
      if (msg.chat.type === 'supergroup' || msg.chat.type === 'group') {
        const id = msg.chat.id.toString();
        const title = msg.chat.title || 'Unknown';
        const username = msg.chat.username ? '@' + msg.chat.username : '(بدون یوزر)';
        await baleApi(token, 'sendMessage', {
          chat_id: chatId,
          text: `🆔 *شناسه این گروه:*\n\n🔢 \`${id}\`\n📛 ${title}\n🔗 آیدی: ${username}`,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: "📋 کپی آیدی", copy_text: { text: id } }]] }
        });
      }

    } catch (e) {
      console.error('Error:', e);
    }
    return new Response('OK');
  }
};

// --- توابع کمکی ---

async function baleApi(token, method, data) {
  const url = `https://tapi.bale.ai/bot${token}/${method}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (e) {
    console.error(`API Error in ${method}:`, e);
    return null;
  }
}

async function checkStrictMembership(token, userId) {
  const res = await baleApi(token, 'getChatMember', {
    chat_id: REQUIRED_CHANNEL_ID,
    user_id: userId
  });
  if (res && res.ok) {
    const status = res.result.status;
    return ['member', 'administrator', 'creator'].includes(status);
  }
  return false;
}

// ✅ ثبت خودکار کاربر (قدیمی یا جدید) با اطلاعات کامل
async function trackUser(env, user) {
  try {
    const userId = user.id.toString();
    const userObj = {
      id: userId,
      firstName: user.first_name || '',
      username: user.username || ''
    };

    const users = await env.ID_FINDER_DB.get('recent_users', 'json') || [];
    
    const exists = users.some(u => {
      if (typeof u === 'string') return u === userId;
      return u.id === userId;
    });

    if (!exists) {
      users.push(userObj);
      if (users.length > 50) users.shift();
      await env.ID_FINDER_DB.put('recent_users', JSON.stringify(users));

      const stats = await env.ID_FINDER_DB.get('stats', 'json') || { total: 0 };
      stats.total++;
      await env.ID_FINDER_DB.put('stats', JSON.stringify(stats));

      console.log(`📥 New user tracked: ${userId} (${user.firstName}) | Total: ${stats.total}`);
    } else {
      // کاربر قدیمی (رشته‌ای) را به فرمت کامل ارتقا بده
      const idx = users.findIndex(u => {
        if (typeof u === 'string') return u === userId;
        return u.id === userId;
      });
      if (idx !== -1 && typeof users[idx] === 'string') {
        users[idx] = userObj;
        await env.ID_FINDER_DB.put('recent_users', JSON.stringify(users));
        console.log(`🔄 Upgraded legacy user: ${userId}`);
      }
    }
  } catch (e) {
    console.error('KV Error:', e);
  }
}

function getReplyKeyboard() {
  return {
    keyboard: [[{ text: "🚀 شروع" }]],
    resize_keyboard: true,
    is_persistent: true
  };
}

function getServicesInlineKeyboard(userId) {
  return {
    inline_keyboard: [
      [
        { text: "🆔 آیدی من", callback_data: "get_my_id_inline" },
        { text: "🔄 بررسی عضویت", callback_data: "check_membership_inline" }
      ],
      [{ text: "📋 کپی آیدی من", copy_text: { text: userId.toString() } }],
      [{ text: "📢 کانال یادبگیریم", url: PUBLIC_LINK }]
    ]
  };
}

function getJoinInlineKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "📢 عضویت در کانال", url: JOIN_LINK }],
      [{ text: "✅ بررسی عضویت", callback_data: "check_membership_inline" }]
    ]
  };
}

async function editMessage(token, chatId, messageId, text, replyMarkup) {
  await baleApi(token, 'editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text: text,
    parse_mode: 'Markdown',
    reply_markup: replyMarkup
  });
}