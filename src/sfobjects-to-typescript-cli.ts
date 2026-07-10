import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { exctract } from './sfobjects-to-typescript';

export async function run() {

    const yarg = yargs(hideBin(process.argv))

    const o = await yarg
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

    await exctract(o);
}

if (typeof window === "undefined" && require.main === module) {
    run();
}
