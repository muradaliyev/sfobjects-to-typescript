import * as fs from 'fs';
import { extractTypes } from "./extractTypes";
import { SfConnector, SfConnectorOptions } from './SfConnector';
import { DescribeSObjectResult } from './DescribeResult';
import { generateIndex } from './generateIndex';

export interface ExtractOptions extends SfConnectorOptions {
    objects: string[];
    output?: string;
}

export async function exctract(o: ExtractOptions) {


    try {

        console.log('Logging in...');

        const sf = new SfConnector(o);

        await sf.login();

        const u = await sf.getIdentity();

        console.log(`id: ${u.id}, org Id: ${u.organization_id}`);

        const typesIndex = (await Promise.all(await o.objects.map(async (k) => {
            console.log(`Fetching metadata for object ${k}...`);
            return { k, d: await sf.describeObject(k) };
        })))
            .reduce((p, v) => ({ ...p, [v.k]: v.d }), {} as Record<string, DescribeSObjectResult>)

        // if (!otherTypeNames.some(t => (t === 'RecordType'))) {
        //     otherTypeNames.push('RecordType');
        // }
        const recTypeDevNames: Record<string, Record<string, string>> = {};

        const instance = sf.auth.instance_url;

        async function _store(name: string, body: string) {
            if (o.output) {

                const fName = [o.output, `${name}.ts`].filter(Boolean).join('/');

                console.log(`Saving '${fName}'...`);

                await fs.promises.writeFile(fName, body);
            }
            else {
                console.log(body);
            }
        }

        for (var objectName in typesIndex) {

            // console.log(`Fetching metadata for object ${objectName}...`);

            // const describe = await sf.describeObject(objectName);

            const describe = typesIndex[objectName];

            if (!describe) {
                throw `Unable to describe ${objectName}`;
            }

            console.log(`Generatting type ${objectName}...`);

            recTypeDevNames[objectName] = {};


            for (var ri of describe.recordTypeInfos) {

                recTypeDevNames[objectName][ri.recordTypeId] = ri.master ? 'Master' : (await sf.getRecordTypeById(ri.recordTypeId)).DeveloperName;
            }

            await _store(describe.name, extractTypes({ describe, otherTypeNames: Object.keys(typesIndex), recTypeDevNames: recTypeDevNames[objectName], instance }));

        }

        console.log(`Generating index...`);

        await _store('index', generateIndex(typesIndex, recTypeDevNames, instance));

        console.log('Done!');
    }
    catch (err) {
        console.log(`!!!Error: ${err}`);
    }
}