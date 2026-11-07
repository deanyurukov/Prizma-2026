import readline from 'node:readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

export async function question(text) {
    return new Promise(resolve => {
        rl.question(text, resolve);
    });
}