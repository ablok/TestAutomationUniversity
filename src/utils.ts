import fetch from "node-fetch";

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