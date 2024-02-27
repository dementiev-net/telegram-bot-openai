import {unlink} from 'fs/promises'
import {openai} from './class/openai.class.js'

const MAX_CONVERSATION_LENGTH = 10

export function normalize() {
    return function (ctx, next) {
        ctx.session ??= emptySession()
        if (ctx.session.messages.length > MAX_CONVERSATION_LENGTH) {
            ctx.session = emptySession()
        }
        return next()
    }
}

export async function removeFile(filepath) {
    try {
        await unlink(filepath)
    } catch (e) {
        console.error(`Error removeFile: ${e.message}`)
    }
}

export const gptMessage = (content, role = 'user') => ({
    content,
    role,
})

export const emptySession = () => ({
    messages: [],
    conversations: [],
})

export function printAdminCommands() {
    const cmd = [
        '/adduser userId - добавить пользователя',
        '/deleteuser userId - удалить пользователя',
        '/listusers - список пользователей'
    ]
    return `🤘 Привет Босс! Что я могу делать:\n\r\n\r` + cmd.map(function (elem) {
        return `* ${elem}\n\r`
    }).join('')
}

export function printConversation(conversation) {
    if (!conversation) return 'Ошибка при чтении истории!'
    return conversation.messages
        .map((m) => {
            if (m.role === openai.roles.USER) {
                return `*> ${m.content}*\n\r\n\r`
            }
            return `${m.content}\n\r\n\r`
        })
        .join('')
}

export function printUsers(users) {
    if (!users) return 'Ошибка при оплучения пользователей!'
    return `👪 Пользователи:\n\r\n\r` + users.map(function (elem) {
        return `* ${elem.telegramId}\n\r`
    }).join('')
}