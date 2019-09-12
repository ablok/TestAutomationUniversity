import fetch from "node-fetch";

export function getUserCredentials() {
    const TAU_EMAIL = process.env.TAU_EMAIL;
    const TAU_PASSWORD = process.env.TAU_PASSWORD;
    if (!TAU_EMAIL) {
        throw new Error("TAU_EMAIL environment vairable not set.");
    }
    if (!TAU_PASSWORD) {
        throw new Error("TAU_PASSWORD environment vairable not set.");
    }
    return { TAU_EMAIL, TAU_PASSWORD };
}

async function getTAUInfo() {
    const response = await fetch("https://testautomationu.applitools.com");
    const html = await response.text();
    const baseUrlMatch = html.match(/(?<=let serverURL = ").*(?=")/);
    const apiKeyMatch = html.match(/(?<=apiKey: ").*(?=")/);
    if (!baseUrlMatch || !apiKeyMatch) {
        throw Error("Unable to find required site info.");
    }
    return { baseUrl: baseUrlMatch[0], apiKey: apiKeyMatch[0] };
}

async function getBearerToken(apiKey: string, email:string, password: string) {
    const response = await fetch(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPassword?key=${apiKey}`,
        { method: "POST", body: JSON.stringify({ email, password, returnSecureToken: true }) });
    return JSON.parse(await response.text()).idToken;
}

export async function authenticate(email:string, password: string) {
    const { apiKey, baseUrl } = await getTAUInfo();
    const token = await getBearerToken(apiKey, email, password);
    return { baseUrl, token };
}