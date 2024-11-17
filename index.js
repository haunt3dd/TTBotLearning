const express = require('express');
// const fetch = require('node-fetch'); // Ensure node-fetch is installed

const CACHE_TTL = 3600;
const CACHE_KEY = 'https://raw.githubusercontent.com/Skiddle-ID/blocklist/main/domains';

let cachedDomainList = null;
let cacheTime = null;

// Main function to handle requests
async function handleRequest(params) {
    try {
        const refreshCache = params.refresh === 'true';
        const domainsParam = params.domains;
        const domainParam = params.domain;
        const jsonResponse = params.json === 'true';

        if (refreshCache) {
            await cacheDomainList();
            return { status: 200, body: 'Cache Refreshed!', contentType: 'text/plain' };
        }

        const domainList = await getCachedDomainList();

        if (domainsParam && domainParam) {
            return { status: 400, body: 'Both domains and domain parameters cannot be provided simultaneously.', contentType: 'text/plain' };
        }

        const responseObj = {};

        if (domainsParam) {
            const domainArray = domainsParam.split(',');
            domainArray.forEach((domain) => {
                const isBlocked = domainList.includes(domain.trim());
                responseObj[domain.trim()] = { blocked: isBlocked };
            });
        } else if (domainParam) {
            const isBlocked = domainList.includes(domainParam.trim());
            responseObj[domainParam.trim()] = { blocked: isBlocked };
        } else {
            return { status: 400, body: 'No valid parameters provided.', contentType: 'text/plain' };
        }

        const responseBody = jsonResponse ? JSON.stringify(responseObj) : generatePlainTextResponse(responseObj);
        return {
            status: 200,
            body: responseBody,
            contentType: jsonResponse ? 'application/json' : 'text/plain'
        };
    } catch (error) {
        console.error('Error handling request:', error);
        return { status: 500, body: 'Internal Server Error', contentType: 'text/plain' };
    }
}

// Fetch and cache the domain list
async function getDomainList() {
    const response = await fetch(CACHE_KEY);
    if (!response.ok) {
        throw new Error(`Failed to fetch domain list: ${response.status} ${response.statusText}`);
    }
    const text = await response.text();
    return text.split('\n');
}

// Generate plain text response
function generatePlainTextResponse(responseObj) {
    let plaintextResponse = '';
    for (const domain in responseObj) {
        plaintextResponse += `${domain}: ${responseObj[domain].blocked ? 'Blocked' : 'Not Blocked'}!\n`;
    }
    return plaintextResponse;
}

// Get the cached domain list or refresh if expired
async function getCachedDomainList() {
    if (cachedDomainList && (Date.now() - cacheTime < CACHE_TTL * 1000)) {
        return cachedDomainList;
    }
    return await cacheDomainList();
}

// Cache the domain list
async function cacheDomainList() {
    cachedDomainList = await getDomainList();
    cacheTime = Date.now();
    return cachedDomainList;
}

// Start the server
const PORT = process.env.PORT || 8787;
const app = express();
app.use(express.json());

app.use(async (req, res) => {
    const response = await handleRequest(req.query);

    res.set('Content-Type', response.contentType);
    res.status(response.status).send(response.body);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Telegram bot token and chat ID
const TELEGRAM_BOT_TOKEN = '7927504742:AAGHBvziwLlYNQ6QQkXai9Rm0qALywP9yzQ';
const TELEGRAM_CHAT_ID = '834734845'; // Replace with the chat ID you want to send messages to

// Function to send a message to Telegram
async function sendTelegramMessage(message) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
        })
    });
    
    if (!response.ok) {
        console.error(`Failed to send message: ${response.statusText}`);
    } else {
        console.log('Message sent to Telegram successfully');
    }
}

setInterval(async () => {
    const params = { domains: 'example.com,another.com', json: 'true' };
    const response = await handleRequest(params);
    console.log(response);
    // Send the response to Telegram
    
    await sendTelegramMessage(`Response: ${JSON.stringify(response)}`);
}, 3000); // 3000 milliseconds = 3 seconds