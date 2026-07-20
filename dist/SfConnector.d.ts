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
    server_url?: string;
    instance_url?: string;
    client_id?: string;
    client_secret?: string;
    access_token?: string;
    username?: string;
    password?: string;
    token?: string;
    sandbox?: string;
    domain?: string;
}
export declare class SfConnector {
    private _o;
    private _auth;
    private get url();
    constructor(_o: SfConnectorOptions);
    loginWithClientCredentials(): Promise<void>;
    loginWithPwdCredentials(): Promise<void>;
    login(): Promise<void | AuthResponse>;
    get auth(): AuthResponse;
    private get headers();
    getIdentity(): Promise<any>;
    describeGlobal(): Promise<any>;
    describeObject(objectName: string): Promise<DescribeSObjectResult>;
    getRecordTypeById(recordTypeId: string): Promise<RecordTypeAdv>;
}
export {};
