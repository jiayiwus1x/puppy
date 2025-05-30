import sys
from transformers import pipeline

generator = pipeline("text-generation", model="distilgpt2")

def get_reply(user_message):
    prompt = f"You are a friendly puppy. Someone says: \"{user_message}\". You reply as a cute puppy: "
    result = generator(prompt, max_length=60, num_return_sequences=1)
    reply = result[0]['generated_text'][len(prompt):].strip().split('\n')[0]
    if '.' in reply:
        reply = reply.split('.')[0] + '.'
    return reply

if __name__ == '__main__':
    user_message = sys.argv[1] if len(sys.argv) > 1 else ""
    print(get_reply(user_message))