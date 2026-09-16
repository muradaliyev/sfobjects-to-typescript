import https from "https";
import querystring from "querystring";
import { DescribeSObjectResult } from "./DescribeResult";

const SF_SANDBOX_LOGIN_HOST = "test.salesforce.com";
const SF_LOGIN_HOST = "login.salesforce.com";
const API_VERSION = "v59.0";

interface AuthResponse {
    id: string;
    access_token: string;
    instance_url: string;
}

export interface RecordTypeAdv {
    Id: string;
    Name: String;
    Description: string;
    NamespacePrefix: string;
    DeveloperName: string
}

export interface SfConnectorOptions {
    login_url?: string;
    instance_url?: string;
    client_id?: string;
    client_secret?: string;
    username?: string;
    password?: string;
    token?: string;
    sandbox?: string;
    domain?: string
    prefix?: string
}


function httpsRequest<R = any>(
    options: https.RequestOptions,
    body?: string
) {
    return new Promise<R>((resolve, reject) => {

        const req = https.request(options, res => {
            let data = "";

            res.on("data", chunk => (data += chunk));

            res.on("end", () => {

                const contentType = res.headers["content-type"] || "";
                const { statusMessage, statusCode } = res;

                if (!contentType.includes("application/json") || !data) {
                    throw `Invalid response from server`;
                }

                if (statusCode !== 200) {
                    throw `Connection error: [${statusCode}] ${statusMessage} \r\n ${data}}`
                }

                resolve(JSON.parse(data));

            });
        });

        req.on("error", reject);

        if (body) {
            req.write(body);
        }

        req.end();
    });
}

function loginWithClientCredentials(o: {
    client_id: string,
    client_secret: string,
    domain: string,
    sandbox?: string
}) {

    const { client_id, client_secret, domain, sandbox } = o;

    const postData = querystring.stringify({
        grant_type: "client_credentials",
        client_id,
        client_secret,
    });

    const options: https.RequestOptions = {
        hostname: `${domain}${sandbox ? '--' + sandbox + '.sandbox' : ''}.my.salesforce.com`,
        path: "/services/oauth2/token",
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": Buffer.byteLength(postData)
        }
    };

    return httpsRequest<AuthResponse>(options, postData);
}

function loginWithPwdCredentials(o: {
    client_id?: string,
    client_secret?: string,
    username: string,
    password: string,
    login_url?: string,
    sandbox?: string,
    token?: string
}) {

    const { client_id, client_secret, username, password, login_url, sandbox, token } = o;

    const postData = querystring.stringify({
        grant_type: "password",
        client_id,
        client_secret,
        username,
        password: `${password}${token || ''}`
    });

    const options: https.RequestOptions = {
        hostname: login_url || (sandbox && SF_SANDBOX_LOGIN_HOST) || SF_LOGIN_HOST,
        path: "/services/oauth2/token",
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": Buffer.byteLength(postData)
        }
    };

    return httpsRequest<AuthResponse>(options, postData);
}

export class SfConnector {

    private _auth: AuthResponse | undefined;

    constructor(private o: SfConnectorOptions, private env: Record<string, string | undefined> = process.env) { }

    private getParam(n: string) {
        return this.env[`${this.o.prefix || 'SF'}_${n}`.toUpperCase()];
    }

    private get instanceUrl() {
        return new URL(this.auth.instance_url);
    }

    private get domainParam() {
        return this.o.domain || this.getParam('DOMAIN');
    }

    private get sandboxParam() {
        return this.o.sandbox || this.getParam('SANDBOX');
    }

    private get loginUrlParam() {
        return this.o.login_url || this.getParam('LOGIN_URL') || (this.sandboxParam && SF_SANDBOX_LOGIN_HOST) || SF_LOGIN_HOST;
    }

    private get clientIdParam() {
        return this.o.client_id || this.getParam('CLIENT_ID');
    }

    private get clientSecretParam() {
        return this.o.client_secret || this.getParam('CLIENT_SECRET');
    }

    private get usernameParam() {
        return this.o.username || this.getParam('USERNAME');
    }

    private get passwordParam() {
        return this.o.password || this.getParam('PASSWORD');
    }

    private get tokenParam() {
        return this.o.token || this.getParam('TOKEN');
    }

    async login() {

        if (this._auth) {
            return this._auth;
        }

        const {
            clientIdParam: client_id,
            clientSecretParam: client_secret,
            usernameParam: username,
            passwordParam: password,
            domainParam: domain,
            loginUrlParam: login_url,
            sandboxParam: sandbox,
            tokenParam: token
        } = this;


        if (client_id && client_secret && username && password) {
            console.log('Using Username/Password authentication');
            return this._auth = await loginWithPwdCredentials({ client_id, client_secret, username, password, login_url, token, sandbox });
        }
        else if (client_id && client_secret && domain) {
            console.log('Using Client Credentials authentication');
            return this._auth = await loginWithClientCredentials({ client_id, client_secret, domain, sandbox });
        }

        throw `Invalid SF connection parameters`;
    }

    public get auth() {

        if (this._auth) {
            return this._auth;
        }

        throw 'Must authenticate first';
    }

    private get headers() {
        return {
            Authorization: `Bearer ${this.auth.access_token}`,
            Accept: "application/json"
        }
    }

    async getIdentity() {

        if (!this.auth.id) {
            throw new Error("AuthResponse.id is missing");
        }

        const url = new URL(this.auth.id);

        const options: https.RequestOptions = {
            hostname: url.hostname,
            path: url.pathname,
            method: "GET",
            headers: this.headers
        };

        return httpsRequest(options);
    }

    async describeGlobal() {

        const options: https.RequestOptions = {
            hostname: this.instanceUrl.hostname,
            path: `/services/data/${API_VERSION}/sobjects`,
            method: "GET",
            headers: this.headers
        };

        return httpsRequest(options);
    }

    async describeObject(objectName: string): Promise<DescribeSObjectResult> {

        const options: https.RequestOptions = {
            hostname: this.instanceUrl.hostname,
            path: `/services/data/${API_VERSION}/sobjects/${objectName}/describe`,
            method: "GET",
            headers: this.headers
        };

        return httpsRequest(options);
    }



    async getRecordTypeById(recordTypeId: string): Promise<RecordTypeAdv> {

        const soql = `
            SELECT 
                Id, 
                Name, 
                DeveloperName, 
                NamespacePrefix, 
                Description
            FROM 
                RecordType
            WHERE 
                Id = '${recordTypeId}'
            LIMIT 1
        `;

        const encodedQuery = encodeURIComponent(soql);

        const options: https.RequestOptions = {
            hostname: this.instanceUrl.hostname,
            path: `/services/data/${API_VERSION}/query?q=${encodedQuery}`,
            method: "GET",
            headers: {
                Authorization: `Bearer ${this.auth.access_token}`
            }
        };

        const result = await httpsRequest(options);

        if (result.records?.length) {
            return result.records[0];
        }

        throw `No record type found for id ${recordTypeId}`

    }

}