import * as fs from 'fs';
import { Connection } from "jsforce";
import _ from "lodash";
import { extractTypes } from "./extractTypes";

export interface ExtractOptions {
    login_url?: string;
    server_url?: string;
    instance_url?: string;
    client_id?: string;
    client_secret?: string;
    access_token?: string;
    username: string;
    password: string;
    token?: string;
    objects: string[];
    output?: string;
}

interface RecordTypeAdv {
    Id: string;
    Name: String;
    Description: string;
    NamespacePrefix: string;
    DeveloperName: string
}


export async function exctract(o: ExtractOptions) {


    const sf = new Connection({
        loginUrl: o.login_url,
        serverUrl: o.server_url,
        instanceUrl: o.instance_url,
        accessToken: o.access_token,
        oauth2: {
            clientId: o.client_id,
            clientSecret: o.client_secret
        }
    });

    try {

        console.log('Logging in...');

        const u = await sf.login(o.username, `${o.password}${o.token || ''}`); //loginbysoap? //loginbyoauth?

        try {

            async function getRecordType(id: string) {

                const r = await sf.query<RecordTypeAdv>(
                    `SELECT Id, Name, DeveloperName, NamespacePrefix, Description FROM RecordType where Id = '${id}'`
                );

                if (!r.records.length) {
                    throw `Unable to find Record type by id ${id}`;
                }

                return r.records[0];
            }

            console.log(`id: ${u.id}, org Id: ${u.organizationId}, url: ${u.url}`);

            const otherTypeNames = o.objects;            

            for (var objectName of otherTypeNames) {

                console.log(`Fetching metadata for object ${objectName}...`);

                const describe = await sf.describe(objectName);

                if (!describe) {
                    throw `Unable to describe ${objectName}`;
                }

                console.log(`Generatting type ${objectName}...`);

                const recTypeDevNames: Record<string, string> = {};

                for (var ri of describe.recordTypeInfos) {

                    recTypeDevNames[ri.recordTypeId] = ri.master ? 'Master' : (await getRecordType(ri.recordTypeId)).DeveloperName;
                }

                const body = extractTypes({ describe, otherTypeNames, recTypeDevNames, instance: sf.instanceUrl });

                if (o.output) {
                    await fs.promises.writeFile(
                        _([o.output, `${describe.name}.ts`]).compact().join('/'),
                        body
                    );
                }

                // console.log(body);

            }

            console.log('Done!');
        }
        catch (err) {
            console.log(`!!!Error: ${err}`);
        }
        finally {
            await sf.logout();
        }
    }
    catch (cerr) {
        console.log(`!!!Connection error: ${cerr}`)
    }
}