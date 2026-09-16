import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { exctract } from './sfobjects-to-typescript';

export async function run() {

    const yarg = yargs(hideBin(process.argv))

    const o = await yarg
        .scriptName('sfobjects-to-typescript')
        .option('username', {
            describe: 'Salesforce username. (env: SF_USERNAME)',
            alias: 'u',
            type: 'string'
        })
        .option('password', {
            describe: 'Salesforce password. (env: SF_PASSWORD)',
            alias: 'p',
            type: 'string'
        })
        .option('objects', {
            describe: 'List of objects to generate types for.',
            alias: 'obj',
            type: 'string',
            array: true,
            demandOption: true
        })
        .option('login_url', {
            describe: 'Salesforce login URL e.g. https://login.salesforce.com/. (env: SF_LOGIN_URL)',
            alias: 'lurl',
            type: 'string'
        })

        .option('client_id', {
            describe: 'Salesforce client id. (env: SF_CLIENT_ID)',
            alias: 'c',
            type: 'string'
        })
        .option('client_secret', {
            describe: 'Salesforce client secret. (env: SF_CLIENT_SECRET)',
            alias: 's',
            type: 'string'
        })
        .option('token', {
            describe: 'Salesforce api token. (env: SF_TOKEN)',
            alias: 't',
            type: 'string'
        })
        .option('basic_client', {
            describe: 'Generate code for basic client. Requires sfobjects-basic-client pakage installed',
            alias: 'bc',
            type: 'boolean'
        })
        .option('output', {
            describe: 'The output folder, default is stdout',
            alias: 'o',
            type: 'string'
        })
        .option('sandbox', {
            describe: 'Salesforce sandbox instance name. (env: SF_SANDBOX)',
            alias: 'sbx',
            type: 'string'
        })
        .option('domain', {
            describe: 'Salesforce domain name as in <domain>.my.salesforce.com. If specified with client_id and client_secret, will use "client_credentials" flow. (env: SF_DOMAIN)',
            alias: 'dom',
            type: 'string'
        })
        .option('env_prefix', {
            describe: 'Prefix for environment variables. Default = "SF"',
            alias: 'pfx',
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
