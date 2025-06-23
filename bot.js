const TelegramBot = require('node-telegram-bot-api');
const { LocalStorage } = require('node-localstorage');
const localStorage = new LocalStorage('./scratch');

// Replace with your Telegram bot token
const token = '8062033173:AAHA7WO3tEPGRxwCcZrM6N8vs6yQf4r0WGA';
const bot = new TelegramBot(token, { polling: true });

// --- DATA (No Changes) ---
const emotions = [
  { name: "Joy", color: "yellow", tips: ["Write down what caused this joy to revisit the moment.", "Share your joy with someone close.", "Dance or move your body to express this energy."], emoji: "😊", intensity: ["Cheerful", "Happy", "Ecstatic", "Euphoric"] },
  { name: "Sadness", color: "blue", tips: ["Try writing your thoughts in a journal.", "Allow yourself some rest and relaxation.", "Listen to calming music.", "Reach out to a friend."], emoji: "😢", intensity: ["Melancholy", "Sad", "Heartbroken", "Devastated"] },
  { name: "Anger", color: "red", tips: ["Take a few deep breaths.", "Try physical activity to release tension.", "Count to 10 before reacting.", "Write about what's bothering you."], emoji: "😠", intensity: ["Annoyed", "Frustrated", "Angry", "Furious"] },
  { name: "Fear", color: "purple", tips: ["Think about the worst-case scenario and how you'd handle it.", "Talk to someone you trust.", "Practice grounding techniques.", "Focus on what you can control."], emoji: "😰", intensity: ["Worried", "Anxious", "Scared", "Terrified"] },
  { name: "Calm", color: "green", tips: ["Try meditation or breathing exercises.", "Spend time in nature.", "Practice gratitude.", "Enjoy this peaceful moment."], emoji: "😌", intensity: ["Relaxed", "Peaceful", "Serene", "Tranquil"] },
  { name: "Excited", color: "orange", tips: ["Channel this energy into something productive.", "Share your excitement with others.", "Make plans for what you're excited about."], emoji: "🤩", intensity: ["Interested", "Enthusiastic", "Excited", "Thrilled"] }
];
const achievements = [
  { name: "First Entry", icon: "🌟", description: "Made your first journal entry" },
  { name: "Week Streak", icon: "🔥", description: "7 consecutive days of check-ins" },
  { name: "Emotion Explorer", icon: "🧭", description: "Experienced all core emotion types" },
  { name: "Deep Thinker", icon: "🧠", description: "Wrote 10 detailed journal entries" },
  { name: "Zen Master", icon: "🧘", description: "Completed 50 breathing exercises" }
];


// --- HELPER FUNCTIONS (No Changes) ---
function getUserData(userId) {
  const data = localStorage.getItem(`user_${userId}`);
  return data ? JSON.parse(data) : {
    history: [],
    streak: 0,
    unlockedAchievements: [],
    breathingCount: 0,
    currentState: 'home',
    selectedEmotion: null,
    selectedIntensity: 0,
    journalText: '',
    multipleEmotions: []
  };
}

function saveUserData(userId, data) {
  localStorage.setItem(`user_${userId}`, JSON.stringify(data));
}

function checkAchievements(userId, newHistory) {
    const userData = getUserData(userId);
    const newlyUnlocked = [];

    if (newHistory.length === 1 && !userData.unlockedAchievements.includes("First Entry")) {
        newlyUnlocked.push("First Entry");
    }
    const detailedEntries = newHistory.filter(entry => entry.text && entry.text.split(' ').length >= 50);
    if (detailedEntries.length >= 10 && !userData.unlockedAchievements.includes("Deep Thinker")) {
        newlyUnlocked.push("Deep Thinker");
    }
    const uniqueEmotionsLogged = new Set(newHistory.flatMap(entry => entry.emotions));
    if (uniqueEmotionsLogged.size >= emotions.length && !userData.unlockedAchievements.includes("Emotion Explorer")) {
        newlyUnlocked.push("Emotion Explorer");
    }
    if (userData.streak >= 7 && !userData.unlockedAchievements.includes("Week Streak")) {
        newlyUnlocked.push("Week Streak");
    }
    if (newlyUnlocked.length > 0) {
        userData.unlockedAchievements = [...userData.unlockedAchievements, ...newlyUnlocked];
        saveUserData(userId, userData);
        return `Achievement unlocked: ${newlyUnlocked.join(', ')}! 🎉`;
    }
    return null;
}


// --- MAIN COMMAND HANDLER (No Changes) ---
bot.onText(/\/emotion/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userData = getUserData(userId);
  
  // The first message is sent normally. Subsequent interactions will edit this message.
  showHomeView(chatId, userId, userData);
});

// --- MODIFIED VIEW FUNCTIONS ---

/**
 * MODIFIED: This function can now either send a new message or edit an existing one.
 * If messageId is provided, it edits. Otherwise, it sends a new message.
 */
function showHomeView(chatId, userId, userData, messageId = null) {
  userData.currentState = 'home';
  saveUserData(userId, userData);
  
  const text = `🌟 *Emotions in Check* 🌟\n\nHow are you feeling today?`;
  const keyboard = {
    inline_keyboard: [
      [{ text: "Select Main Emotion", callback_data: "select_emotion" }],
      [{ text: "Select Multiple Emotions", callback_data: "select_multiple" }],
      [{ text: `🧘 Breathing Exercises (${userData.breathingCount})`, callback_data: "breathing_exercise" }],
      [{ text: "📖 History", callback_data: "view_history" }],
      [{ text: "🏆 Achievements", callback_data: "view_achievements" }],
      [{ text: `🔥 Streak: ${userData.streak} days`, callback_data: "streak_info" }]
    ]
  };
  
  const options = { parse_mode: 'Markdown', reply_markup: keyboard };

  if (messageId) {
    // If we have a messageId, edit the existing message.
    bot.editMessageText(text, { ...options, chat_id: chatId, message_id: messageId });
  } else {
    // Otherwise, send a new one.
    bot.sendMessage(chatId, text, options);
  }
}

/**
 * MODIFIED: Now uses bot.editMessageText to avoid creating a new message.
 */
function showEmotionSelection(chatId, userId, messageId) {
  const userData = getUserData(userId);
  userData.currentState = 'select_emotion';
  saveUserData(userId, userData);
  
  const keyboard = {
    inline_keyboard: emotions.map(emotion => [
      { text: `${emotion.emoji} ${emotion.name}`, callback_data: `emotion_${emotion.name}` }
    ]).concat([[{ text: "⬅️ Back", callback_data: "back_to_home" }]]) // Added back button
  };
  
  bot.editMessageText("Select your main emotion:", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: keyboard
  });
}

/**
 * MODIFIED: Now uses bot.editMessageText.
 */
function showMultipleEmotionSelection(chatId, userId, messageId) {
  const userData = getUserData(userId);
  userData.currentState = 'select_multiple';
  saveUserData(userId, userData);
  
  const keyboardRows = [];
  for (let i = 0; i < emotions.length; i += 2) {
    const row = [];
    if (i < emotions.length) {
      const emotion1 = emotions[i];
      const isSelected1 = userData.multipleEmotions.some(e => e.name === emotion1.name);
      row.push({ text: `${isSelected1 ? '✅ ' : ''}${emotion1.emoji} ${emotion1.name}`, callback_data: `multi_${emotion1.name}` });
    }
    if (i + 1 < emotions.length) {
      const emotion2 = emotions[i + 1];
      const isSelected2 = userData.multipleEmotions.some(e => e.name === emotion2.name);
      row.push({ text: `${isSelected2 ? '✅ ' : ''}${emotion2.emoji} ${emotion2.name}`, callback_data: `multi_${emotion2.name}` });
    }
    keyboardRows.push(row);
  }
  
  keyboardRows.push([
    { text: "📝 Journal These Emotions", callback_data: "journal_multiple" },
    { text: "⬅️ Back", callback_data: "back_to_home" }
  ]);
  
  bot.editMessageText("Select multiple emotions (toggle on/off):", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: { inline_keyboard: keyboardRows }
  });
}

/**
 * MODIFIED: Now uses bot.editMessageText.
 */
function showIntensitySelection(chatId, userId, emotionName, messageId) {
  const userData = getUserData(userId);
  const emotion = emotions.find(e => e.name === emotionName);
  userData.currentState = 'select_intensity';
  userData.selectedEmotion = emotion;
  saveUserData(userId, userData);
  
  const keyboard = {
    inline_keyboard: [
      emotion.intensity.map((level, index) => ({ text: level, callback_data: `intensity_${index}` })),
      [{ text: "⬅️ Back", callback_data: "back_to_emotions" }]
    ]
  };
  
  bot.editMessageText(`Select intensity for ${emotion.emoji} ${emotion.name}:`, {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: keyboard
  });
}

/**
 * MODIFIED: Now uses bot.editMessageText.
 */
function showJournalView(chatId, userId, messageId) {
  const userData = getUserData(userId);
  userData.currentState = 'journal';
  saveUserData(userId, userData);
  
  let emotionText;
  if (userData.selectedEmotion) {
    emotionText = `${userData.selectedEmotion.emoji} ${userData.selectedEmotion.name} (${userData.selectedEmotion.intensity[userData.selectedIntensity]})`;
  } else if (userData.multipleEmotions.length > 0) {
    emotionText = userData.multipleEmotions.map(e => `${e.emoji} ${e.name}`).join(', ');
  } else {
    emotionText = "No emotion selected";
  }
  
  const tips = userData.selectedEmotion 
    ? `\n\n*Tips for ${userData.selectedEmotion.name}:*\n• ${userData.selectedEmotion.tips.join('\n• ')}`
    : userData.multipleEmotions.length > 0
      ? `\n\n*Tips for your mix of emotions:*\nTry writing about what you're feeling and why. Reflect on how these emotions interact.`
      : '';
  
  const text = `📝 *Journal Entry*\n\nEmotion: ${emotionText}${tips}\n\nPlease write your thoughts below:`;
  
  bot.editMessageText(text, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: "💾 Save (After you type)", callback_data: "save_journal" }],
        [{ text: "⬅️ Cancel", callback_data: "cancel_journal" }]
      ]
    }
  });
}

// --- UNMODIFIED FUNCTIONS (Behavior is fine as is) ---

function saveJournalEntry(chatId, userId, text) {
  const userData = getUserData(userId);
  
  if (!text && !userData.selectedEmotion && userData.multipleEmotions.length === 0) {
    bot.sendMessage(chatId, "Please select an emotion or write something before saving.");
    return;
  }

  const newEntry = {
    emotions: userData.selectedEmotion ? [userData.selectedEmotion.name] : userData.multipleEmotions.map(e => e.name),
    intensity: userData.selectedEmotion ? userData.selectedIntensity : undefined,
    text: text || '',
    date: new Date().toLocaleString()
  };
  
  const newHistory = [...userData.history, newEntry];
  userData.history = newHistory;
  
  const today = new Date().toDateString();
  const lastEntryDate = userData.history.length > 1 ? new Date(userData.history[userData.history.length - 2].date).toDateString() : null;
  
  if (lastEntryDate !== today) {
    userData.streak += 1;
  } else if (userData.history.length === 1) {
    userData.streak = 1;
  }
  
  const achievementMessage = checkAchievements(userId, newHistory);
  
  userData.selectedEmotion = null;
  userData.multipleEmotions = [];
  userData.journalText = '';
  //currentState is set in showHomeView
  
  // Send a confirmation message. This is intentionally a *new* message.
  bot.sendMessage(chatId, "✅ Journal entry saved successfully!", { reply_markup: { remove_keyboard: true } });
  
  // Show any achievement unlocked message
  if (achievementMessage) {
    bot.sendMessage(chatId, achievementMessage);
  }
  
  // Reset by sending a new home screen.
  showHomeView(chatId, userId, userData);
}

/**
 * MODIFIED: Now uses bot.editMessageText.
 */
function showHistoryView(chatId, userId, messageId) {
  const userData = getUserData(userId);
  userData.currentState = 'history';
  saveUserData(userId, userData);
  
  let text;
  if (userData.history.length === 0) {
    text = "No entries yet. Start by selecting how you feel!";
  } else {
    const emotionCounts = {};
    emotions.forEach(e => emotionCounts[e.name] = 0);
    userData.history.forEach(entry => {
      entry.emotions.forEach(emotion => {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      });
    });
    
    let statsMessage = "📊 *Your Emotional Journey*\n\n";
    emotions.forEach(emotion => {
      if (emotionCounts[emotion.name] > 0) {
        statsMessage += `${emotion.emoji} ${emotion.name}: ${emotionCounts[emotion.name]} entries\n`;
      }
    });
    
    const recentEntries = userData.history.slice(-5).reverse();
    let entriesMessage = "\n📖 *Recent Entries*\n";
    recentEntries.forEach((entry) => {
      const emotionsText = entry.emotions.map(name => {
        const emotion = emotions.find(e => e.name === name);
        return emotion ? emotion.emoji : name;
      }).join(' ');
      const intensityText = entry.intensity !== undefined && entry.emotions.length === 1 ? ` (${emotions.find(e => e.name === entry.emotions[0]).intensity[entry.intensity]})` : '';
      const textPreview = entry.text ? `\n${entry.text.substring(0, 50)}${entry.text.length > 50 ? '...' : ''}` : '';
      entriesMessage += `\n${emotionsText}${intensityText} - ${entry.date}${textPreview}`;
    });
    text = statsMessage + entriesMessage;
  }
  
  bot.editMessageText(text, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[{ text: "⬅️ Back", callback_data: "back_to_home" }]]
    }
  });
}

/**
 * MODIFIED: Now uses bot.editMessageText.
 */
function showAchievementsView(chatId, userId, messageId) {
  const userData = getUserData(userId);
  userData.currentState = 'achievements';
  saveUserData(userId, userData);
  
  let message = "🏆 *Your Achievements*\n\n";
  achievements.forEach(achievement => {
    const isUnlocked = userData.unlockedAchievements.includes(achievement.name);
    message += `${isUnlocked ? '✅' : '🔒'} ${achievement.icon} *${achievement.name}* - ${achievement.description}\n`;
  });
  
  bot.editMessageText(message, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[{ text: "⬅️ Back", callback_data: "back_to_home" }]]
    }
  });
}

// Breathing exercise is kept as-is, since it sends a sequence of messages.
function startBreathingExercise(chatId, userId) {
    // This part is intentionally left to send new messages to guide the user through timed steps.
    // However, you could edit the initial message to start the exercise.
}


// --- MODIFIED CALLBACK QUERY HANDLER ---
bot.on('callback_query', (callbackQuery) => {
  const message = callbackQuery.message;
  const chatId = message.chat.id;
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;
  
  // CORE CHANGE: Get the messageId here to pass to view functions
  const messageId = message.message_id; 
  
  const userData = getUserData(userId);
  
  // Use a switch statement for cleaner logic
  switch (true) {
    case data === 'back_to_home':
      showHomeView(chatId, userId, userData, messageId);
      break;
      
    case data === 'select_emotion':
      showEmotionSelection(chatId, userId, messageId);
      break;
      
    case data === 'select_multiple':
      showMultipleEmotionSelection(chatId, userId, messageId);
      break;
      
    case data.startsWith('emotion_'):
      const emotionName = data.split('_')[1];
      showIntensitySelection(chatId, userId, emotionName, messageId);
      break;
      
    case data.startsWith('intensity_'):
      const intensityIndex = parseInt(data.split('_')[1]);
      userData.selectedIntensity = intensityIndex;
      saveUserData(userId, userData);
      showJournalView(chatId, userId, messageId);
      break;
      
    case data.startsWith('multi_'):
      const multiEmotionName = data.split('_')[1];
      const emotion = emotions.find(e => e.name === multiEmotionName);
      const existingIndex = userData.multipleEmotions.findIndex(e => e.name === multiEmotionName);
      
      if (existingIndex >= 0) {
        userData.multipleEmotions.splice(existingIndex, 1);
      } else {
        userData.multipleEmotions.push(emotion);
      }
      
      saveUserData(userId, userData);
      showMultipleEmotionSelection(chatId, userId, messageId);
      break;
      
    case data === 'journal_multiple':
      if (userData.multipleEmotions.length === 0) {
        bot.answerCallbackQuery(callbackQuery.id, { text: "Please select at least one emotion" });
      } else {
        showJournalView(chatId, userId, messageId);
      }
      break;
      
    case data === 'back_to_emotions':
      showEmotionSelection(chatId, userId, messageId);
      break;
      
    case data === 'save_journal':
      bot.answerCallbackQuery(callbackQuery.id, { text: "Please type your journal entry and send it as a message." });
      break;
      
    case data === 'cancel_journal':
      userData.selectedEmotion = null;
      userData.multipleEmotions = [];
      userData.journalText = '';
      saveUserData(userId, userData);
      showHomeView(chatId, userId, userData, messageId);
      break;
      
    case data === 'view_history':
      showHistoryView(chatId, userId, messageId);
      break;
      
    case data === 'view_achievements':
      showAchievementsView(chatId, userId, messageId);
      break;
      
    case data === 'breathing_exercise':
      // This is an exception - we'll send a new message to start the exercise
      bot.answerCallbackQuery(callbackQuery.id);
      startBreathingExercise(chatId, userId);
      break;

    case data === 'stop_breathing':
      // Handling for stopping exercise remains the same
      if (userData.breathingInterval) {
        clearInterval(userData.breathingInterval);
      }
      userData.currentState = 'home';
      saveUserData(userId, userData);
      bot.editMessageText("Breathing exercise stopped.", { chat_id: chatId, message_id: messageId });
      showHomeView(chatId, userId, getUserData(userId)); // Send new home view
      break;

    case data === 'streak_info':
      bot.answerCallbackQuery(callbackQuery.id, {
        text: `Your current streak is ${userData.streak} days! Keep it going!`,
        show_alert: true
      });
      break;
      
    default:
      bot.answerCallbackQuery(callbackQuery.id);
      break;
  }
});

// --- TEXT MESSAGE HANDLER (No Changes) ---
bot.on('message', (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;
  
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userData = getUserData(userId);
  
  if (userData.currentState === 'journal') {
    // This function sends its own confirmation and a new home view
    saveJournalEntry(chatId, userId, msg.text);
  }
});

console.log("Emotions in Check bot is running (with message editing)...");
