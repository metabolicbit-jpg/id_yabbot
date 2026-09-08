// ========== ID Finder Bot v8.2 - Final D1 Version (No KV, No Migrate) ==========

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
▫️ برای گروه، بات آیدی یاب رو به گروه اضافه کن و به محض اضافه شدن آیدی گروه رو برات می‌فرسته. 
▫️ برای کانال، ربات آیدی یاب رو اضافه کن و مدیر گروه و مجوز ارسال پیام رو روشن بزار و یک پیام بفرست تا ایدی کانال رو برات بفرسته

⚡ ساده، سریع و کاربردی!`;

export default {
  async fetch(request, env) {
    // تنظیم وب‌هوک (اختیاری)
    if (request.method === 'POST') {
      const url = new URL(request.url);
      if (url.pathname === '/webhook' && url.searchParams.get('secret') === env.WEBHOOK_SECRET) {
        const token = env.BALE_BOT_TOKEN;
        if (!token) return new Response('Missing token', { status: 500 });
        
        const webhookUrl = `https://${url.hostname}/webhook`;
        const res = await baleApi(token, 'setWebhook', { url: webhookUrl });
        if (res) {
          return new Response(JSON.stringify({ ok: res.ok, description: res.description }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response('Failed to set webhook', { status: 500 });
      }
    }

    if (request.method !== 'POST') {
      return new Response('ID Finder Tool is running!');
    }

    try {
      const update = await request.json();
      const token = env.BALE_BOT_TOKEN;
      if (!token) return new Response('Missing token', { status: 500 });

      // --- مدیریت Callback Query ---
      if (update.callback_query) {
        const cb = update.callback_query;
        if (!cb.message || !cb.message.chat) return new Response('OK');

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

      // --- مدیریت رویداد اضافه شدن بات به گروه ---
      if (update.my_chat_member) {
        const mcm = update.my_chat_member;
        const chat = mcm.chat;
        const newStatus = mcm.new_chat_member.status;
        const chatType = chat.type;

        if (chatType === 'group' || chatType === 'supergroup') {
          if (newStatus === 'member' || newStatus === 'administrator') {
            const id = chat.id.toString();
            const title = chat.title || 'Unknown';
            const username = chat.username ? '@' + chat.username : '(بدون یوزر)';
            await baleApi(token, 'sendMessage', {
              chat_id: id,
              text: `🆔 *شناسه این گروه:*\n\n🔢 \`${id}\`\n📛 ${title}\n🔗 آیدی: ${username}`,
              parse_mode: 'Markdown',
              reply_markup: { inline_keyboard: [[{ text: "📋 کپی آیدی", copy_text: { text: id } }]] }
            });
            console.log(`📢 Bot added to group: ID=${id}`);
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

        // ثبت خودکار کاربر در D1 (فقط غیر ادمین)
        if (!ADMIN_IDS.includes(userId.toString())) {
          await trackUser(env, msg.from);
        }

        // --- دستورات ادمین ---
        if (ADMIN_IDS.includes(userId.toString())) {
          if (msg.text === '/stats') {
            const result = await env.DB.prepare("SELECT value FROM stats WHERE key = 'total'").first();
            const total = result ? result.value : 0;
            await baleApi(token, 'sendMessage', {
              chat_id: chatId,
              text: `📊 *آمار ربات:*\n\n👥 تعداد کل کاربران ثبت شده: ${total}`,
              parse_mode: 'Markdown'
            });
            return new Response('OK');
          }
          if (msg.text === '/users' || msg.text === '/user') {
            const { results } = await env.DB.prepare(
              "SELECT user_id, first_name, username FROM users ORDER BY created_at DESC LIMIT 10"
            ).all();
            
            let list = "";
            const copyButtons = [];
            
            results.forEach((u, idx) => {
              const uid = u.user_id;
              const uName = u.first_name || '—';
              const uUser = u.username ? '@' + u.username : '(ندارد)';
              
              list += `\n${idx + 1}️⃣ \`${uid}\`\n   📛 ${uName}\n   🔗 ${uUser}\n`;
              copyButtons.push([{ text: `${idx + 1}️⃣ ${uName}`, copy_text: { text: uid } }]);
            });
            
            const text = results.length > 0
              ? `👥 *۱۰ کاربر اخیر:*\n${list}\n💡 روی دکمه‌های زیر بزنید تا آیدی کپی شود:`
              : '👥 *۱۰ کاربر اخیر:*\n\nهنوز کاربری ثبت نشده است.';
            
            await baleApi(token, 'sendMessage', {
              chat_id: chatId,
              text: text,
              parse_mode: 'Markdown',
              reply_markup: results.length > 0 ? { inline_keyboard: copyButtons } : undefined
            });
            return new Response('OK');
          }
          if (msg.text === '/debug') {
            let report = `🛠 *گزارش دیباگ:*\n\n`;
            report += `• اتصال D1: ${env.DB ? '✅ متصل' : '❌ تعریف نشده'}\n`;
            try {
              await env.DB.prepare("INSERT OR IGNORE INTO stats (key, value) VALUES ('debug', 1)").run();
              const back = await env.DB.prepare("SELECT value FROM stats WHERE key = 'debug'").first();
              report += `• تست نوشتن/خواندن D1: ${back ? '✅ موفق' : '❌ ناموفق'}\n`;
            } catch (e) {
              report += `• ❌ خطای D1: ${e.message}\n`;
            }
            const { results } = await env.DB.prepare("SELECT COUNT(*) as count FROM users").first();
            const totalUsers = results ? results.count : 0;
            report += `• تعداد کل کاربران: ${totalUsers}`;
            await baleApi(token, 'sendMessage', { chat_id: chatId, text: report, parse_mode: 'Markdown' });
            return new Response('OK');
          }
          
          // --- ارسال پیام به یک کاربر یا گروه خاص (تکی) ---
          if (msg.text === '/sendto' || (msg.text && msg.text.startsWith('/sendto '))) {
            const parts = msg.text.split(' ');
            if (parts.length < 3) {
              await baleApi(token, 'sendMessage', {
                chat_id: chatId,
                text: `❗️ نحوه استفاده:\n/sendto <آیدی> <متن>\n\nمثال:\n/sendto 123456789 سلام دوست عزیز!`
              });
              return new Response('OK');
            }
            const targetId = parts[1];
            const sendText = parts.slice(2).join(' ');
            const res = await baleApi(token, 'sendMessage', { chat_id: targetId, text: sendText });
            if (res) {
              await baleApi(token, 'sendMessage', { chat_id: chatId, text: `✅ پیام با موفقیت به ${targetId} ارسال شد.` });
            } else {
              await baleApi(token, 'sendMessage', { chat_id: chatId, text: `❌ ارسال به ${targetId} ناموفق بود. (احتمالا بات را بلاک کرده یا آیدی اشتباه است)` });
            }
            return new Response('OK');
          }

          // --- ارسال دسته‌ای (Broadcast) به تمام کاربران ثبت شده ---
          if (msg.text === '/broadcast' || (msg.text && msg.text.startsWith('/broadcast '))) {
            let textToSend = '';
            if (msg.text.startsWith('/broadcast ')) {
              textToSend = msg.text.substring('/broadcast '.length);
            } else if (msg.reply_to_message && msg.reply_to_message.text) {
              textToSend = msg.reply_to_message.text;
            }

            if (!textToSend) {
              await baleApi(token, 'sendMessage', {
                chat_id: chatId,
                text: `❗️ لطفاً متن پیام را بنویسید یا به یک پیام ریپلای کنید.\nمثال:\n/broadcast سلام به همه دوستان`
              });
              return new Response('OK');
            }

            const { results } = await env.DB.prepare("SELECT user_id FROM users").all();
            if (results.length === 0) {
              await baleApi(token, 'sendMessage', { chat_id: chatId, text: '⚠️ هنوز کاربری برای ارسال پیام ثبت نشده است.' });
              return new Response('OK');
            }

            let successCount = 0;
            let failCount = 0;

            const chunkSize = 20;
            for (let i = 0; i < results.length; i += chunkSize) {
               const batch = results.slice(i, i + chunkSize);
               for (const u of batch) {
                 const uId = u.user_id;
                 const res = await baleApi(token, 'sendMessage', {
                   chat_id: uId,
                   text: textToSend
                 });
                 if (res) successCount++;
                 else failCount++;
               }
            }

            await baleApi(token, 'sendMessage', {
              chat_id: chatId,
              text: `📨 *گزارش ارسال دسته‌ای:*\n\n✅ موفق: ${successCount}\n❌ ناموفق: ${failCount}\n\n(تعداد کل کاربران فعلی: ${results.length})`,
              parse_mode: 'Markdown'
            });
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

        // د) پیام‌های دیگر در چت خصوصی (راهنما)
        await baleApi(token, 'sendMessage', {
          chat_id: chatId,
          text: `❓ برای دریافت آیدی خود روی دکمه «🚀 شروع» بزنید یا پیام کاربر دیگری را فوروارد کنید.\n\n${GUIDE_MESSAGE}`,
          reply_markup: getReplyKeyboard()
        });
        return new Response('OK');
      }

      // ۳) گروه‌ها (اگر پیامی با دستور /id باشد)
      if (msg.chat.type === 'supergroup' || msg.chat.type === 'group') {
        if (msg.text === '/id' || msg.text === '/ID' || msg.text === '/آیدی') {
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
        return new Response('OK');
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
    
    if (!res.ok) {
      console.error(`API error in ${method}: status ${res.status}`);
      return null;
    }
    
    const json = await res.json();
    if (!json.ok) {
      console.error(`API error in ${method}: ${json.description}`);
      return null;
    }
    return json;
  } catch (e) {
    console.error(`Fetch error in ${method}:`, e);
    return null;
  }
}

async function checkStrictMembership(token, userId) {
  const res = await baleApi(token, 'getChatMember', {
    chat_id: REQUIRED_CHANNEL_ID,
    user_id: userId
  });
  
  if (res && res.ok && res.result) {
    const status = res.result.status;
    return ['member', 'administrator', 'creator'].includes(status);
  }
  return false;
}

async function getBotId(token) {
  const res = await baleApi(token, 'getMe', {});
  return res && res.result ? res.result.id : null;
}

// تابع ثبت کاربر با D1
async function trackUser(env, user) {
  if (!user) return;
  const userId = user.id.toString();
  const firstName = user.first_name || '';
  const username = user.username || '';

  await env.DB.prepare(
    "INSERT OR IGNORE INTO users (user_id, first_name, username) VALUES (?, ?, ?)"
  ).bind(userId, firstName, username).run();

  await env.DB.prepare("INSERT OR IGNORE INTO stats (key, value) VALUES ('total', 0)").run();
  await env.DB.prepare("UPDATE stats SET value = value + 1 WHERE key = 'total'").run();
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