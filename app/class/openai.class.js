import OpenAI from 'openai'
import {createReadStream} from 'fs'
import config from 'config'

class AI {

    roles = {
        ASSISTANT: 'assistant',
        SYSTEM: 'system',
        USER: 'user',
    }

    constructor() {
        this.openai = new OpenAI({
            apiKey: config.get('OPEN_AI_KEY'),
            baseURL: config.get('OPEN_BASE_URL')
        })
    }

    async chat(messages = [], user = '') {
        try {
            const completion = await this.openai.chat.completions.create({
                model: config.get('MODEL_CHAT_GPT'),
                messages,
                user,
            })
            console.log(`Usage: `, completion.usage)
            return completion.choices[0].message
        } catch (e) {
            console.error(`Error openai chat completion: ${e.message}`)
        }
    }

    async image(message = []) {
        try {
            const response = await this.openai.images.generate({
                model: config.get('MODEL_CHAT_GPT_IMAGE'),
                prompt: message,
                size: config.get('MODEL_CHAT_GPT_IMAGE_SIZE'),
                n: 1,
            })
            return response.data[0].url
        } catch (e) {
            console.error(`Error openai image completion: ${e.message}`)
        }
    }

    async transcription(filepath) {
        try {
            const response = await this.openai.audio.transcriptions.create({
                file: createReadStream(filepath),
                model: config.get('MODEL_CHAT_GPT_AUDIO'),
            })
            return response.text
        } catch (e) {
            console.error(`Error openai transcription: ${e.message}`)
        }
    }
}

export const openai = new AI()