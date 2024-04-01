import * as yargs from 'yargs';
import { convert } from './convert';

async function run() {

    if (typeof window === "undefined") {
        const o = await yargs
            .scriptName('sfobjects-to-typescript')
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
                alias: 'surl',
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
            .option('username', {
                describe: 'Salesforce username',
                alias: 'u',
                type: 'string',
                demandOption: true
            })
            .option('password', {
                describe: 'Salesforce password',
                alias: 'p',
                type: 'string',
                demandOption: true
            })
            .option('token', {
                describe: 'Salesforce api token',
                alias: 't',
                type: 'string'
            })
            .option('access_token', {
                describe: 'Salesforce OAuth2 access token',
                alias: 'at',
                type: 'string'
            })
            .option('objects', {
                describe: 'List of objects to generate types for',
                alias: 'obj',
                type: 'string',
                array: true,
                demandOption: true
            })
            .option('output', {
                describe: 'The output folder, default is stdout',
                alias: 'o',
                type: 'string'
            })
            .help()
            .usage("Usage: sfobjects-to-typescript --username <username> --password <password> --objects <object_1> <object _2> [more options]")
            .parse();

        await convert(o);
    }
}

run();

