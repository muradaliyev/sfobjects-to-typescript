import * as fs from 'fs';
import _ from "lodash";
import { extractTypes } from "./extractTypes";
import { SfConnector } from './SfConnector';

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
    sandbox?: boolean;
    domain?:string
}

export async function exctract(o: ExtractOptions) {


    try {

        console.log('Logging in...');

        const sf = new SfConnector(o);

        await sf.login();

        const u = await sf.getIdentity();

        console.log(`id: ${u.id}, org Id: ${u.organization_id}`);

        const otherTypeNames = o.objects;

        for (var objectName of otherTypeNames) {

            console.log(`Fetching metadata for object ${objectName}...`);

            const describe = await sf.describeObject(objectName);

            if (!describe) {
                throw `Unable to describe ${objectName}`;
            }

            console.log(`Generatting type ${objectName}...`);

            const recTypeDevNames: Record<string, string> = {};

            for (var ri of describe.recordTypeInfos) {

                recTypeDevNames[ri.recordTypeId] = ri.master ? 'Master' : (await sf.getRecordTypeById(ri.recordTypeId)).DeveloperName;
            }

            const body = extractTypes({ describe, otherTypeNames, recTypeDevNames, instance: sf.auth.instance_url });

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
}