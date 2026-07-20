"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SfConnector = void 0;
const https_1 = __importDefault(require("https"));
const querystring_1 = __importDefault(require("querystring"));
const SF_SANDBOX_LOGIN_HOST = "test.salesforce.com";
const SF_LOGIN_HOST = "login.salesforce.com";
const API_VERSION = "v59.0";
function httpsRequest(options, body) {
    return new Promise((resolve, reject) => {
        const req = https_1.default.request(options, res => {
            let data = "";
            res.on("data", chunk => (data += chunk));
            res.on("end", () => {
                const contentType = res.headers["content-type"] || "";
                const { statusMessage, statusCode } = res;
                if (!contentType.includes("application/json") || !data) {
                    throw `Invalid response from server`;
                }
                if (statusCode !== 200) {
                    throw `Connection error: [${statusCode}] ${statusMessage} \r\n ${data}}`;
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
class SfConnector {
    get url() {
        return new URL(this.auth.instance_url);
    }
    constructor(_o) {
        this._o = _o;
    }
    loginWithClientCredentials() {
        return __awaiter(this, void 0, void 0, function* () {
            const { client_id, client_secret, sandbox, domain } = this._o;
            const postData = querystring_1.default.stringify({
                grant_type: "client_credentials",
                client_id,
                client_secret,
            });
            const options = {
                hostname: `${domain}${sandbox ? '--' + sandbox + '.sandbox' : ''}.my.salesforce.com`,
                path: "/services/oauth2/token",
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Content-Length": Buffer.byteLength(postData)
                }
            };
            this._auth = yield httpsRequest(options, postData);
        });
    }
    loginWithPwdCredentials() {
        return __awaiter(this, void 0, void 0, function* () {
            const { client_id, client_secret, username, password, login_url, sandbox, token } = this._o;
            const postData = querystring_1.default.stringify({
                grant_type: "password",
                client_id,
                client_secret,
                username,
                password: `${password}${token || ''}`
            });
            const options = {
                hostname: login_url || (sandbox && SF_SANDBOX_LOGIN_HOST) || SF_LOGIN_HOST,
                path: "/services/oauth2/token",
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Content-Length": Buffer.byteLength(postData)
                }
            };
            this._auth = yield httpsRequest(options, postData);
        });
    }
    login() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._auth) {
                return this._auth;
            }
            const { client_id, client_secret, username, password, token, domain } = this._o;
            if (client_id && client_secret && domain) {
                return this.loginWithClientCredentials();
            }
            else if (client_id && client_secret && username && password) {
                return this.loginWithPwdCredentials();
            }
            throw `Invalid SF connection parameters`;
        });
    }
    get auth() {
        if (this._auth) {
            return this._auth;
        }
        throw 'Must authenticate first';
    }
    get headers() {
        return {
            Authorization: `Bearer ${this.auth.access_token}`,
            Accept: "application/json"
        };
    }
    getIdentity() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.auth.id) {
                throw new Error("AuthResponse.id is missing");
            }
            const url = new URL(this.auth.id);
            const options = {
                hostname: url.hostname,
                path: url.pathname,
                method: "GET",
                headers: this.headers
            };
            return httpsRequest(options);
        });
    }
    describeGlobal() {
        return __awaiter(this, void 0, void 0, function* () {
            const options = {
                hostname: this.url.hostname,
                path: `/services/data/${API_VERSION}/sobjects`,
                method: "GET",
                headers: this.headers
            };
            return httpsRequest(options);
        });
    }
    describeObject(objectName) {
        return __awaiter(this, void 0, void 0, function* () {
            const options = {
                hostname: this.url.hostname,
                path: `/services/data/${API_VERSION}/sobjects/${objectName}/describe`,
                method: "GET",
                headers: this.headers
            };
            return httpsRequest(options);
        });
    }
    getRecordTypeById(recordTypeId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
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
            const options = {
                hostname: this.url.hostname,
                path: `/services/data/${API_VERSION}/query?q=${encodedQuery}`,
                method: "GET",
                headers: {
                    Authorization: `Bearer ${this.auth.access_token}`
                }
            };
            const result = yield httpsRequest(options);
            if ((_a = result.records) === null || _a === void 0 ? void 0 : _a.length) {
                return result.records[0];
            }
            throw `No record type found for id ${recordTypeId}`;
        });
    }
}
exports.SfConnector = SfConnector;
