import https from "https";
import querystring from "querystring";
import { ExtractOptions } from "./sfobjects-to-typescript";

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

function httpsRequest(
    options: https.RequestOptions,
    body?: string
): Promise<any> {
    return new Promise((resolve, reject) => {

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

        req.on("error", (e) => {
            console.log(6)
            reject(e)
        });

        if (body) {
            req.write(body);
        }

        req.end();
    });
}

export class SfConnector {

    private _auth: AuthResponse | undefined;

    private get url() {
        return new URL(this.auth.instance_url);
    }

    constructor(private _o: ExtractOptions) { }

    loginClientCredentials(client_id: string, client_secret: string, domain: string, sandbox?: string) {

        const postData = querystring.stringify({
            grant_type: "client_credentials",
            client_id,
            client_secret,
        });

        const options: https.RequestOptions = {
            hostname: `https://${domain}${sandbox ? '--' + sandbox : ''}.my.salesforce.com/services/oauth2/token`,
            path: "/services/oauth2/token",
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": Buffer.byteLength(postData)
            }
        };

        return { postData, options };
    }


    async login() {

        if (this._auth) {
            return this._auth;
        }

        const { client_id, client_secret, username, password, login_url, sandbox, token, domain } = this._o;



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

        this._auth = await httpsRequest(options, postData);
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
            hostname: this.url.hostname,
            path: `/services/data/${API_VERSION}/sobjects`,
            method: "GET",
            headers: this.headers
        };

        return httpsRequest(options);
    }

    async describeObject(objectName: string) {

        const options: https.RequestOptions = {
            hostname: this.url.hostname,
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
            hostname: this.url.hostname,
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