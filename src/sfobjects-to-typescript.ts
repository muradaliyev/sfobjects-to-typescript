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

        for (var objectName in typesIndex) {

            // console.log(`Fetching metadata for object ${objectName}...`);

            // const describe = await sf.describeObject(objectName);

            const describe = typesIndex[objectName];

            if (!describe) {
                throw `Unable to describe ${objectName}`;
            }

            console.log(`Generatting type ${objectName}...`);

            const recTypeDevNames: Record<string, string> = {};

            for (var ri of describe.recordTypeInfos) {

                recTypeDevNames[ri.recordTypeId] = ri.master ? 'Master' : (await sf.getRecordTypeById(ri.recordTypeId)).DeveloperName;
            }

            const body = extractTypes({ describe, otherTypeNames: Object.keys(typesIndex), recTypeDevNames, instance: sf.auth.instance_url });

            if (o.output) {
                await fs.promises.writeFile(
                    [o.output, `${describe.name}.ts`].filter(Boolean).join('/'),
                    body
                );
            }
            else {
                console.log(body);
            }

        }

        console.log(`Generating index...`);

        const idx = generateIndex(typesIndex);

        if (o.output) {
            await fs.promises.writeFile(
                [o.output, `index.ts`].filter(Boolean).join('/'),
                idx
            );
        }
        else {
            console.log(idx);
        }

        console.log('Done!');
    }
    catch (err) {
        console.log(`!!!Error: ${err}`);
    }
}

export * from './BasicClient';