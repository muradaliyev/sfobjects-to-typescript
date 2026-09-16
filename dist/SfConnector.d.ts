import { DescribeSObjectResult } from "./DescribeResult";
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
    DeveloperName: string;
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
    domain?: string;
    prefix?: string;
}
export declare class SfConnector {
    private o;
    private env;
    private _auth;
    constructor(o: SfConnectorOptions, env?: Record<string, string | undefined>);
    private getParam;
    private get instanceUrl();
    private get domainParam();
    private get sandboxParam();
    private get loginUrlParam();
    private get clientIdParam();
    private get clientSecretParam();
    private get usernameParam();
    private get passwordParam();
    private get tokenParam();
    login(): Promise<AuthResponse>;
    get auth(): AuthResponse;
    private get headers();
    getIdentity(): Promise<any>;
    describeGlobal(): Promise<any>;
    describeObject(objectName: string): Promise<DescribeSObjectResult>;
    getRecordTypeById(recordTypeId: string): Promise<RecordTypeAdv>;
}
export {};
