// ========== ID Finder Bot v7.1 - Diagnostic + Anti-Spam ==========

const REQUIRED_CHANNEL_ID = "5235764517"; // آیدی کانال یادبگیریم
const JOIN_LINK = "https://ble.ir/join/NzdkM2I1Nj";
const PUBLIC_LINK = "https://ble.ir/yadbegirim";

// 👑 لیست آیدی‌های ادمین
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

      // --- مدیریت Callback Query (دکمه‌های شیشه‌ای) ---
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
              getServicesInlineKeyboard()
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
              getServicesInlineKeyboard()
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
        // ✅ ضد اسپم: در کانال یادبگیریم پاسخ نده (فقط کانال‌های دیگر)
        if (cid !== REQUIRED_CHANNEL_ID && cid !== `-100${REQUIRED_CHANNEL_ID}`) {
          const title = msg.chat.title || 'Unknown';
          const username = msg.chat.username ? '@' + msg.chat.username : '(خصوصی)';
          const replyText = `🆔 *شناسه این کانال:*\n\n🔢 عددی: \`${cid}\`\n📛 نام: ${title}\n🔗 آیدی: ${username}`;
          await baleApi(token, 'sendMessage', { chat_id: chatId, text: replyText, parse_mode: 'Markdown' });
          console.log(`📢 Channel Detected: ID=${cid}`);
        }
        return new Response('OK');
      }

      // ۲) چت خصوصی
      if (msg.chat.type === 'private' && userId) {

        //  لاگ دیباگ: آیا پیام خصوصی اصلاً می‌رسد؟
        console.log(`📨 Private from ${userId} | text=${msg.text || '(non-text)'}`);

        // ✅ ثبت کاربر با «هر پیام» (فقط کاربران عادی، یک‌بار و یکتا)
        if (!ADMIN_IDS.includes(userId.toString())) {
          await trackUser(env, userId);
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
            const list = users.slice(-10).reverse().join('\n');
            await baleApi(token, 'sendMessage', {
              chat_id: chatId,
              text: `👥 *۱۰ کاربر اخیر:*\n\n${list || 'هنوز کاربری نیست.'}`,
              parse_mode: 'Markdown'
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
              reply_markup: getServicesInlineKeyboard()
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
          if (msg.forward_from) {
            replyText = `👤 *شناسه کاربر:*\n\n🔢 \`${msg.forward_from.id}\`\n👤 نام: ${msg.forward_from.first_name}`;
          } else if (msg.forward_from_chat) {
            replyText = `📢 *شناسه منبع:*\n\n🔢 \`${msg.forward_from_chat.id}\`\n📛 نام: ${msg.forward_from_chat.title}`;
          }

          await baleApi(token, 'sendMessage', {
            chat_id: chatId,
            text: replyText + `\n\n${GUIDE_MESSAGE}`,
            parse_mode: 'Markdown',
            reply_markup: getReplyKeyboard()
          });
          return new Response('OK');
        }
      }

      // ۳) گروه‌ها
      if (msg.chat.type === 'supergroup' || msg.chat.type === 'group') {
        const id = msg.chat.id;
        const title = msg.chat.title || 'Unknown';
        await baleApi(token, 'sendMessage', {
          chat_id: chatId,
          text: `🆔 *شناسه این گروه:*\n\n🔢 \`${id}\`\n📛 ${title}`,
          parse_mode: 'Markdown'
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

// بررسی سخت‌گیرانه عضویت در کانال
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

// ثبت کاربر یکتا در KV
async function trackUser(env, userId) {
  try {
    const users = await env.ID_FINDER_DB.get('recent_users', 'json') || [];
    if (!users.includes(userId.toString())) {
      users.push(userId.toString());
      if (users.length > 50) users.shift();
      await env.ID_FINDER_DB.put('recent_users', JSON.stringify(users));

      const stats = await env.ID_FINDER_DB.get('stats', 'json') || { total: 0 };
      stats.total++;
      await env.ID_FINDER_DB.put('stats', JSON.stringify(stats));

      console.log(`📥 New user tracked: ${userId} | Total: ${stats.total}`);
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

function getServicesInlineKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "🆔 آیدی من", callback_data: "get_my_id_inline" },
        { text: "🔄 بررسی عضویت", callback_data: "check_membership_inline" }
      ],
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