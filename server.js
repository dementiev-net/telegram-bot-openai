import {Telegraf, session} from 'telegraf'
import {message} from 'telegraf/filters'
import config from 'config'
import mongoose from 'mongoose'
import {
    normalize
} from './app/utils.js'
import {
    initCommand,
    adminCommand,
    idCommand,
    handleCallbackQuery,
    getUserConversations,
    proccessTextMessage,
    proccessVoiceMessage,
    proccessCreateImage
} from './app/logic.js'

const bot = new Telegraf(config.get('TOKEN'), {
    handlerTimeout: Infinity,
})

bot.use(session())
bot.use(normalize())

bot.telegram.setMyCommands([
    {command: 'myid', description: 'Показать мой ID',}
])

bot.command('start', initCommand('Добро пожаловать! Отправьте голосовое или текстовое сообщение для ChatGPT.'))
bot.command('adduser', adminCommand)
bot.command('deleteuser', adminCommand)
bot.command('listusers', adminCommand)
bot.command('myid', idCommand)

bot.hears('Новый диалог', initCommand('Начат новый диалог. Жду голосовое или текстовое сообщение.'))
bot.hears('Администрирование', adminCommand)
bot.hears('Моя переписка', getUserConversations)
bot.hears(/Нарисуй мне (.+)/i, proccessCreateImage)

bot.on(message('voice'), proccessVoiceMessage)
bot.on(message('text'), proccessTextMessage)
bot.on('callback_query', handleCallbackQuery)

async function start() {
    try {
        await mongoose.connect(config.get('MONGO_URI'), {})
        bot.launch()
        console.log(`Version: ${config.get('VERSION')}`)
        console.log(`MongoDB Connected and Bot started`)
        process.on('uncaughtException', (err) => {
            console.error(`Unknown Error: ${err}`)
        })
        process.on('unhandledRejection', (reason, promise) => {
            console.error({unhandledRejection: {reason, promise}})
        })
    } catch (e) {
        console.error(`Server Error: ${e.message}`)
        process.exit(1)
    }
}

start()