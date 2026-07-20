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
exports.run = run;
const yargs_1 = __importDefault(require("yargs"));
const helpers_1 = require("yargs/helpers");
const sfobjects_to_typescript_1 = require("./sfobjects-to-typescript");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const yarg = (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv));
        const o = yield yarg
            .scriptName('sfobjects-to-typescript')
            .option('username', {
            describe: 'Salesforce username',
            alias: 'u',
            type: 'string'
        })
            .option('password', {
            describe: 'Salesforce password',
            alias: 'p',
            type: 'string'
        })
            .option('objects', {
            describe: 'List of objects to generate types for',
            alias: 'obj',
            type: 'string',
            array: true,
            demandOption: true
        })
            .option('login_url', {
            describe: 'Salesforce login URL e.g. https://login.salesforce.com/',
            alias: 'lurl',
            type: 'string'
        })
            .option('server_url', {
            describe: 'Salesforce SOAP service endpoint URL e.g. https://na1.salesforce.com/services/Soap/u/28.0',
            alias: 'surl',
            type: 'string'
        })
            .option('instance_url', {
            describe: 'Salesforce instance URL e.g. https://na1.salesforce.com/',
            alias: 'iurl',
            type: 'string'
        })
            .option('client_id', {
            describe: 'Salesforce client id',
            alias: 'c',
            type: 'string'
        })
            .option('client_secret', {
            describe: 'Salesforce client secret',
            alias: 's',
            type: 'string'
        })
            .option('token', {
            describe: 'Salesforce api token',
            alias: 't',
            type: 'string'
        })
            // .option('access_token', {
            //     describe: 'Salesforce OAuth2 access token',
            //     alias: 'at',
            //     type: 'string'
            // })
            .option('output', {
            describe: 'The output folder, default is stdout',
            alias: 'o',
            type: 'string'
        })
            .option('sandbox', {
            describe: 'Salesforce sandbox instance name',
            alias: 'sbx',
            type: 'string'
        })
            .option('domain', {
            describe: 'Salesforce domain name as in <domain>.my.salesforce.com. If specified with client_id and client_secret, will use "client_credentials" flow',
            alias: 'dom',
            type: 'string'
        })
            .help()
            .usage("Usage: sfobjects-to-typescript --username <username> --password <password> --output <output floder> --objects <object_1> <object _2> [more options]")
            .parse();
        yield (0, sfobjects_to_typescript_1.exctract)(o);
    });
}
if (typeof window === "undefined" && require.main === module) {
    run();
}
