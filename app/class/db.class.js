import {UserModel} from '../models/user.model.js'
import {ConversationModel} from '../models/conversation.model.js'
import config from 'config'

class MondoDB {

    async isUser(userId) {
        try {
            return !!await UserModel.findOne({telegramId: userId})
        } catch (e) {
            console.error(`Error isUser: ${e.message}`)
        }
    }

    async isAdmin(userId) {
        if (!await this.isUser(userId)) return false
        return Number(userId) === Number(config.get('ADMIN_ID'))
    }

    async getUser(from) {
        const user = {telegramId: from.id}
        try {
            const existingUser = await UserModel.findOne({
                telegramId: user.telegramId,
            })
            return existingUser ? existingUser : {}
        } catch (e) {
            console.error(`Error getUser: ${e.message}`)
        }
    }

    async getUsersList() {
        try {
            return await UserModel.find({})
        } catch (e) {
            console.error(`Error getConversations: ${e.message}`)
        }
    }

    async createUser(userId) {
        const user = {telegramId: userId}
        try {
            const existingUser = await UserModel.findOne({
                telegramId: user.telegramId,
            })
            if (existingUser) return false
            await new UserModel({telegramId: user.telegramId}).save()
            return true
        } catch (e) {
            console.error(`Error createUser: ${e.message}`)
        }
    }

    async deleteUser(userId) {
        try {
            return await UserModel.deleteOne({telegramId: userId})
        } catch (e) {
            console.error(`Error deleteUser: ${e.message}`)
        }
    }

    async saveConversation(messages, userId) {
        try {
            await new ConversationModel({
                messages,
                userId,
            }).save()
        } catch (e) {
            console.error(`Error saveConversation: ${e.message}`)
        }
    }

    async getConversations(userId) {
        try {
            return await ConversationModel.find({userId})
        } catch (e) {
            console.error(`Error getConversations: ${e.message}`)
        }
    }
}

export const db = new MondoDB()