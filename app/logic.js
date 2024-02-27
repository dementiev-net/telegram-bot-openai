import {bold, code} from 'telegraf/format'
import {openai} from './class/openai.class.js'
import {ogg} from './class/ogg.class.js'
import {
    gptMessage,
    removeFile,
    emptySession,
    printAdminCommands,
    printConversation,
    printUsers
} from './utils.js'
import {db} from './class/db.class.js'

export function initCommand(message) {
    return async function (ctx) {
        ctx.session = emptySession()
        if (await db.isAdmin(ctx.message.from.id)) {
            await ctx.reply(message, {
                reply_markup: {
                    keyboard: [
                        ["Новый диалог", "Моя переписка"],
                        ["Администрирование"]
                    ]
                }
            })
        } else if (await db.isUser(ctx.message.from.id)) {
            await ctx.reply(message, {
                reply_markup: {
                    keyboard: [
                        ["Новый диалог", "Моя переписка"]
                    ]
                }
            })
        } else {
            await ctx.reply('😔 Это приватный бот! Тут ничего интересного для Вас нет', {
                reply_markup: {
                    remove_keyboard: true,
                }
            })
        }
    }
}

export async function adminCommand(ctx) {
    if (await db.isAdmin(ctx.message.from.id)) {
        const [cmd, param] = (ctx.message.reply_to_message || ctx.message).text.split(' ')
        if (cmd === '/adduser') {
            if (!param) ctx.reply('Нет ID пользователя!')
            if (!/^\d+$/.test(param)) ctx.reply('ID пользователя не число!')
            else {
                await db.createUser(param)
                    ? ctx.reply(`👍 Пользоывтель добавлен`)
                    : ctx.reply(`😔 Ошибка добавления пользователя`)
            }
        } else if (cmd === '/listusers') {
            const list = await db.getUsersList()
            ctx.reply(printUsers(list))
        } else if (cmd === '/deleteuser') {
            if (!param) ctx.reply('Нет ID пользователя!')
            if (!/^\d+$/.test(param)) ctx.reply('ID пользователя не число!')
            else ctx.reply('Подвверждаете удаление?', {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {text: "Да", callback_data: `delete_user-${param}`},
                            {text: "Нет", callback_data: `delete_cancel`}
                        ]
                    ]
                }
            })
        } else {
            ctx.replyWithHTML(printAdminCommands())
        }
    }
}

export async function idCommand(ctx) {
    try {
        await ctx.reply(`id: ${ctx.message.from.id}`)
    } catch (e) {
        console.error(`Error idCommand: ${e.message}`)
    }
}

export async function handleCallbackQuery(ctx) {
    try {
        if (ctx.update.callback_query.data === 'delete_cancel') {
            ctx.editMessageReplyMarkup(undefined)
            ctx.reply('😔 Ну как хочешь...')
        } else if (ctx.update.callback_query.data.startsWith('delete_user')) {
            const userId = ctx.update.callback_query.data.split('-')[1]
            ctx.editMessageReplyMarkup(undefined)
            await db.deleteUser(userId)
            ctx.reply(`👍 Пользователь ${userId} удален!`)
        } else if (ctx.update.callback_query.data === 'save_conversation') {
            const user = await db.getUser(ctx.update.callback_query.from)
            await db.saveConversation(ctx.session.messages, user._id)
            ctx.session = emptySession()
            ctx.reply('Переписка сохранена и закрыта. Вы можете начать новую.')
        } else if (ctx.update.callback_query.data.startsWith('conversation')) {
            const conversationId = ctx.update.callback_query.data.split('-')[1]
            const conversation = ctx.session.conversations.find(
                (c) => c._id == conversationId.trim()
            )
            ctx.reply(printConversation(conversation), {parse_mode: 'Markdown'})
        }
    } catch (e) {
        console.error(`Error handleCallbackQuery: ${e.message}`)
    }
}

export async function proccessCreateImage(ctx) {
    if (await db.isUser(ctx.message.from.id)) {
        try {
            const text = ctx.message.text.replace(/^Нарисуй мне /i, '')
            await ctx.reply(code('Секунду. Жду ответ от Dall-E...'))
            proccessDallEResponse(ctx, text)
        } catch (e) {
            ctx.reply(`Ошибка с API: ${e.message}`)
            console.error(`Error proccessСreateImage: ${e.message}`)
        }
    }
}

export async function proccessVoiceMessage(ctx) {
    if (await db.isUser(ctx.message.from.id)) {
        try {
            await ctx.reply(code('Секунду. Жду ответ от ChatGPT...'))
            const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
            const userId = String(ctx.message.from.id)
            const oggPath = await ogg.create(link.href, userId)
            const mp3Path = await ogg.toMp3(oggPath, userId)
            removeFile(oggPath)
            const text = await openai.transcription(mp3Path)
            removeFile(mp3Path)
            await ctx.reply(code(`Ваш запрос: ${text}`))
            proccessGPTResponse(ctx, text)
        } catch (e) {
            await ctx.reply(`Ошибка с API!: ${e.message}`)
            console.error(`Error proccessVoiceMessage: ${e.message}`)
        }
    }
}

export async function proccessTextMessage(ctx) {
    if (await db.isUser(ctx.message.from.id)) {
        try {
            await ctx.reply(code('Секунду. Жду ответ от ChatGPT'))
            proccessGPTResponse(ctx, ctx.message.text)
        } catch (e) {
            ctx.reply(`Ошибка с API: ${e.message}`)
            console.error(`Error proccessTextMessage: ${e.message}`)
        }
    }
}

async function proccessGPTResponse(ctx, text = '') {
    try {
        if (!text.trim()) return
        ctx.session.messages.push(gptMessage(text))
        const userId = String(ctx.message.from.id)
        const response = await openai.chat(ctx.session.messages, userId)
        if (!response) return ctx.reply(`Ошибка с API: ${response}`)
        ctx.session.messages.push(
            gptMessage(response.content, openai.roles.ASSISTANT)
        )
        ctx.reply(response.content, {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: 'Сохранить и закончить переписку?',
                            callback_data: 'save_conversation',
                        },
                    ],
                ],
            },
            parse_mode: 'Markdown'
        })
    } catch (e) {
        console.error(`Error proccessGPTResponse: ${e.message}`)
    }
}

async function proccessDallEResponse(ctx, text = '') {
    try {
        if (!text.trim()) return
        const response = await openai.image(text)
        if (!response) return ctx.reply(`Ошибка с API`)
        ctx.replyWithPhoto({ url: response })
    } catch (e) {
        console.error(`Error proccessDallEResponse: ${e.message}`)
    }
}

export async function getUserConversations(ctx) {
    if (await db.isUser(ctx.message.from.id)) {
        try {
            const user = await db.getUser(ctx.message.from)
            const conversations = await db.getConversations(user._id)
            ctx.session.conversations = conversations
            ctx.reply(bold('Ваши переписки:'), {
                reply_markup: {
                    inline_keyboard: conversations.map((c) => [
                        {
                            text: c.messages[0].content,
                            callback_data: `conversation-${c._id}`,
                        },
                    ]),
                },
            })
        } catch (e) {
            console.error(`Error getUserConversations: ${e.message}`)
        }
    }
}